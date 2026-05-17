import {
  assertSafeBlobName,
  buildShelbyBlobUrl,
  getOnChainListing,
  isValidAddress,
  isValidNetwork,
  parseMediaDescriptor,
  sendJson,
  setCors,
  verifyToken,
} from "../_payby-gateway.js";

async function assertTokenOrFreeAccess({ token, network, owner, blobName }) {
  if (token) {
    const payload = verifyToken(token);
    if (
      payload.network !== network ||
      String(payload.owner || "").toLowerCase() !== owner.toLowerCase() ||
      payload.blobName !== blobName
    ) {
      const error = new Error("Token does not match this media.");
      error.status = 403;
      throw error;
    }
    return;
  }

  const listing = await getOnChainListing({ network, blobName });
  if (!listing?.active || listing.owner.toLowerCase() !== owner.toLowerCase()) {
    return;
  }
  if (listing.policy === 0) return;

  const error = new Error("Access token required.");
  error.status = 401;
  throw error;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "GET") {
    return sendJson(req, res, 404, { error: "Not found" });
  }

  try {
    const descriptor = parseMediaDescriptor(req);
    const url = new URL(req.url || "/", "https://payby.local");
    const token = url.searchParams.get("token") || "";

    if (
      !isValidNetwork(descriptor.network) ||
      !isValidAddress(descriptor.owner)
    ) {
      return sendJson(req, res, 400, { error: "Invalid media route." });
    }
    assertSafeBlobName(descriptor.blobName);
    await assertTokenOrFreeAccess({ token, ...descriptor });

    const upstream = await fetch(buildShelbyBlobUrl(descriptor));
    if (!upstream.ok || !upstream.body) {
      return sendJson(req, res, upstream.status, {
        error: `Shelby retrieval failed with ${upstream.status}.`,
      });
    }

    setCors(req, res);
    res.statusCode = 200;
    res.setHeader(
      "content-type",
      upstream.headers.get("content-type") || "application/octet-stream",
    );
    res.setHeader("cache-control", "private, max-age=60");
    res.setHeader("x-content-type-options", "nosniff");

    const arrayBuffer = await upstream.arrayBuffer();
    return res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    return sendJson(req, res, error.status || 500, {
      error: error.message || "Gateway error",
    });
  }
}
