import { del, get, list, put } from "@vercel/blob";

const PREFIX = "roteiro/versions/";
const LATEST_PATHNAME = "roteiro/latest.json";
const HISTORY_LIMIT = 7;

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.status(status).send(JSON.stringify(body));
}

async function blobToText(result) {
  if (!result) return "";
  if (typeof result.text === "function") return result.text();
  if (result.stream) return new Response(result.stream).text();
  if (result.body) return new Response(result.body).text();
  return "";
}

async function getBlobOrNull(pathname) {
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode === 404) return null;
    return result;
  } catch (error) {
    if (error?.name === "BlobNotFoundError") return null;
    throw error;
  }
}

async function latestBlobPathname() {
  const blobs = await listLegacyBlobs();
  if (!blobs.length) return null;
  return blobs
    .map(blob => blob.pathname)
    .filter(Boolean)
    .sort()
    .at(-1);
}

async function listLegacyBlobs() {
  const blobs = [];
  let cursor;
  do {
    const result = await list({
      access: "private",
      prefix: PREFIX,
      limit: 1000,
      cursor
    });
    blobs.push(...(result?.blobs || []));
    cursor = result?.cursor;
    if (!result?.hasMore) break;
  } while (cursor);
  return blobs;
}

async function readPayloadFrom(pathname) {
  const blob = await getBlobOrNull(pathname);
  const text = await blobToText(blob);
  return text ? JSON.parse(text) : null;
}

async function readCurrentPayload() {
  const latest = await readPayloadFrom(LATEST_PATHNAME);
  if (latest?.data?.stops) return latest;
  const pathname = await latestBlobPathname();
  return pathname ? readPayloadFrom(pathname) : null;
}

function previousSnapshot(payload) {
  if (!payload?.data?.stops) return null;
  return {
    savedAt: payload.savedAt || "",
    data: payload.data
  };
}

function buildHistory(previousPayload) {
  const history = [];
  const snapshot = previousSnapshot(previousPayload);
  if (snapshot) history.push(snapshot);
  history.push(...(Array.isArray(previousPayload?.history) ? previousPayload.history : []));
  const seen = new Set();
  return history
    .filter(entry => entry?.savedAt && entry?.data?.stops)
    .filter(entry => {
      if (seen.has(entry.savedAt)) return false;
      seen.add(entry.savedAt);
      return true;
    })
    .slice(0, HISTORY_LIMIT);
}

async function writeLatestPayload(payload) {
  return put(LATEST_PATHNAME, JSON.stringify(payload, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 0
  });
}

async function cleanupLegacyVersions() {
  const current = await readCurrentPayload();
  if (!current?.data?.stops) return { deleted: 0, migrated: false };

  const latest = await readPayloadFrom(LATEST_PATHNAME);
  const legacyPathnames = (await listLegacyBlobs())
    .map(blob => blob.pathname)
    .filter(Boolean)
    .sort()
    .reverse();

  const preservedHistory = [];
  for (const pathname of legacyPathnames) {
    if (preservedHistory.length >= HISTORY_LIMIT) break;
    const payload = await readPayloadFrom(pathname);
    const snapshot = previousSnapshot(payload);
    if (snapshot && snapshot.savedAt !== current.savedAt) preservedHistory.push(snapshot);
  }

  let migrated = false;
  if (!latest?.data?.stops || preservedHistory.length) {
    await writeLatestPayload({
      ...current,
      version: Math.max(Number(current.version) || 1, 2),
      history: [...preservedHistory, ...buildHistory(latest || current)]
        .filter(entry => entry.savedAt !== current.savedAt)
        .filter((entry, index, entries) => entries.findIndex(candidate => candidate.savedAt === entry.savedAt) === index)
        .slice(0, HISTORY_LIMIT)
    });
    migrated = true;
  }

  if (legacyPathnames.length) {
    for (let index = 0; index < legacyPathnames.length; index += 100) {
      await del(legacyPathnames.slice(index, index + 100));
    }
  }

  return { deleted: legacyPathnames.length, migrated };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      let pathname = LATEST_PATHNAME;
      let latestResult = await getBlobOrNull(pathname);
      if (!latestResult) {
        pathname = await latestBlobPathname();
        if (!pathname) return send(res, 404, { data: null });
        latestResult = await getBlobOrNull(pathname);
      }
      if (!latestResult) return send(res, 404, { data: null });
      const data = await blobToText(latestResult);
      if (!data) return send(res, 404, { data: null });
      return send(res, 200, JSON.parse(data));
    } catch (error) {
      if (error?.name === "BlobNotFoundError") return send(res, 404, { data: null });
      return send(res, 500, {
        message: "Nao foi possivel carregar o roteiro compartilhado.",
        detail: error?.message || "Erro desconhecido."
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (body?.action === "cleanupLegacy" && body?.confirm === "delete-version-history") {
        const result = await cleanupLegacyVersions();
        return send(res, 200, { ok: true, ...result });
      }

      if (!body?.data || !Array.isArray(body.data.stops)) {
        return send(res, 400, { message: "Payload invalido." });
      }

      const previousPayload = await readCurrentPayload();
      const payload = {
        app: "planejador-roteiro-viagem",
        version: 2,
        savedAt: new Date().toISOString(),
        data: body.data,
        history: buildHistory(previousPayload)
      };

      const blob = await writeLatestPayload(payload);

      return send(res, 200, { ok: true, savedAt: payload.savedAt, pathname: blob.pathname, url: blob.url });
    } catch (error) {
      return send(res, 500, {
        message: "Nao foi possivel salvar o roteiro compartilhado. Verifique o Vercel Blob no projeto.",
        detail: error?.message || "Erro desconhecido."
      });
    }
  }

  return send(res, 405, { message: "Metodo nao permitido." });
}
