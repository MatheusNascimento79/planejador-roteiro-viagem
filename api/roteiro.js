import { get, list, put } from "@vercel/blob";

const PREFIX = "roteiro/versions/";
const LATEST_PATHNAME = "roteiro/latest.json";

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
  const result = await list({
    access: "private",
    prefix: PREFIX,
    limit: 1000
  });

  const blobs = result?.blobs || [];
  if (!blobs.length) return null;
  return blobs
    .map(blob => blob.pathname)
    .filter(Boolean)
    .sort()
    .at(-1);
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
      if (!body?.data || !Array.isArray(body.data.stops)) {
        return send(res, 400, { message: "Payload invalido." });
      }

      const payload = {
        app: "planejador-roteiro-viagem",
        version: 1,
        savedAt: new Date().toISOString(),
        data: body.data
      };

      const blob = await put(LATEST_PATHNAME, JSON.stringify(payload, null, 2), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 0
      });

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
