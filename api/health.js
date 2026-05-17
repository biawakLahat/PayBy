import { marketplaceStatus, sendJson } from "./_payby-gateway.js";

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  return sendJson(req, res, 200, {
    ok: true,
    policyMode:
      process.env.PAYBY_GATEWAY_ALLOW_CLIENT_POLICY === "true"
        ? "client-policy-dev"
        : "server-policy",
    signatureVerification:
      process.env.PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY === "true"
        ? "skipped"
        : "ed25519",
    marketplaceRegistry: marketplaceStatus(),
    metadata: "web3-commitment",
  });
}
