import { sendJson } from "../_payby-gateway.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === "GET") {
    return sendJson(req, res, 200, {
      metadata: req.query?.path?.length ? null : [],
      source: "web3-commitment",
    });
  }

  if (req.method === "POST") {
    return sendJson(req, res, 200, {
      saved: 0,
      source: "web3-commitment",
    });
  }

  if (req.method === "DELETE") {
    return sendJson(req, res, 200, {
      deleted: true,
      source: "web3-commitment",
    });
  }

  return sendJson(req, res, 404, { error: "Not found" });
}
