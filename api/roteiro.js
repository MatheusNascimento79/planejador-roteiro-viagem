import { get, put } from "@vercel/blob";

const PATHNAME = "roteiro/compartilhado.json";

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(JSON.stringify(body));
}

async function streamToText(stream) {
  return new Response(stream).text();
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await get(PATHNAME, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return send(res, 404, { data: null });
      const data = await streamToText(result.stream);
      return send(res, 200, JSON.parse(data));
    } catch (error) {
      if (error?.name === "BlobNotFoundError") return send(res, 404, { data: null });
      return send(res, 500, { message: "Nao foi possivel carregar o roteiro compartilhado." });
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

      const blob = await put(PATHNAME, JSON.stringify(payload, null, 2), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60
      });

      return send(res, 200, { ok: true, savedAt: payload.savedAt, url: blob.url });
    } catch (error) {
      return send(res, 500, {
        message: "Nao foi possivel salvar o roteiro compartilhado. Verifique o Vercel Blob no projeto."
      });
    }
  }

  return send(res, 405, { message: "Metodo nao permitido." });
}
