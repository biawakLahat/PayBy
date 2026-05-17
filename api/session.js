import {
  assertPolicyAccess,
  assertSafeBlobName,
  isValidAddress,
  isValidNetwork,
  policyFromBody,
  readJsonBody,
  sendJson,
  signToken,
  verifyMessage,
} from "./_payby-gateway.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    return sendJson(req, res, 404, { error: "Not found" });
  }

  try {
    const body = await readJsonBody(req);
    const {
      address,
      publicKey,
      network,
      owner,
      blobName,
      nonce,
      message,
      signedMessage,
    } = body;

    if (!address || !network || !owner || !blobName || !nonce || !message) {
      return sendJson(req, res, 400, { error: "Missing access session fields." });
    }
    if (!isValidNetwork(network) || !isValidAddress(address) || !isValidAddress(owner)) {
      return sendJson(req, res, 400, { error: "Invalid network or wallet address." });
    }
    assertSafeBlobName(blobName);

    verifyMessage({ address, publicKey, signedMessage, message, nonce });
    await assertPolicyAccess({
      policy: policyFromBody(body),
      address,
      network,
      owner,
      blobName,
    });

    const token = signToken({
      sub: address,
      network,
      owner,
      blobName,
      exp: Date.now() + 10 * 60 * 1000,
    });

    return sendJson(req, res, 200, { token, expiresInSeconds: 600 });
  } catch (error) {
    return sendJson(req, res, error.status || 401, {
      error: error.message || "Access request was denied.",
    });
  }
}
