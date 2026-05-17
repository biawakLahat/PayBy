import { createHmac, timingSafeEqual } from "node:crypto";
import { Ed25519PublicKey, Ed25519Signature } from "@aptos-labs/ts-sdk";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const networks = {
  shelbynet: "https://api.shelbynet.shelby.xyz/shelby",
  "shelby-testnet": "https://api.testnet.shelby.xyz/shelby",
};

const aptosFullnodes = {
  shelbynet:
    process.env.PAYBY_SHELBYNET_FULLNODE_URL ||
    "https://api.shelbynet.aptoslabs.com/v1",
  "shelby-testnet":
    process.env.PAYBY_TESTNET_FULLNODE_URL ||
    "https://api.testnet.aptoslabs.com/v1",
};

const aptosApiKeys = {
  shelbynet:
    process.env.PAYBY_APTOS_SHELBYNET_API_KEY ||
    process.env.VITE_APTOS_SHELBYNET_API_KEY ||
    process.env.VITE_SHELBYNET_API_KEY ||
    "",
  "shelby-testnet":
    process.env.PAYBY_APTOS_TESTNET_API_KEY ||
    process.env.VITE_APTOS_TESTNET_API_KEY ||
    process.env.VITE_SHELBY_TESTNET_API_KEY ||
    "",
};

const marketplaceContracts = {
  shelbynet:
    process.env.PAYBY_SHELBYNET_MARKETPLACE_ADDRESS ||
    process.env.VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS ||
    "",
  "shelby-testnet":
    process.env.PAYBY_TESTNET_MARKETPLACE_ADDRESS ||
    process.env.VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS ||
    "",
};

const secret =
  process.env.PAYBY_GATEWAY_SECRET ||
  process.env.VITE_PAYBY_GATEWAY_SECRET ||
  "payby-vercel-dev-secret";
const allowedOrigins = String(process.env.PAYBY_GATEWAY_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowClientPolicy = process.env.PAYBY_GATEWAY_ALLOW_CLIENT_POLICY === "true";
const skipSignatureVerify =
  process.env.PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY === "true";

export function isValidNetwork(value) {
  return value === "shelbynet" || value === "shelby-testnet";
}

export function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{1,64}$/.test(String(value || ""));
}

export function assertSafeBlobName(blobName) {
  const value = String(blobName || "");
  if (
    !value ||
    value.length > 240 ||
    value.includes("..") ||
    value.includes("\\") ||
    value.startsWith("/")
  ) {
    const error = new Error("Invalid blob name.");
    error.status = 400;
    throw error;
  }
}

export function setCors(req, res) {
  const origin = String(req.headers.origin || "");
  const allowedOrigin =
    allowedOrigins.includes("*") || !origin || allowedOrigins.includes(origin)
      ? allowedOrigins.includes("*")
        ? "*"
        : origin || allowedOrigins[0]
      : allowedOrigins[0] || "null";

  res.setHeader("access-control-allow-origin", allowedOrigin);
  res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-admin-token");
  res.setHeader("vary", "origin");
}

export function sendJson(req, res, status, body) {
  setCors(req, res);
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function signToken(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac("sha256", secret).update(encoded).digest());
  return `${encoded}.${signature}`;
}

export function verifyToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) throw new Error("Malformed token");

  const expected = base64url(createHmac("sha256", secret).update(encoded).digest());
  const safe =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!safe) throw new Error("Invalid token");

  const payload = JSON.parse(
    Buffer.from(encoded.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString(
      "utf8",
    ),
  );
  if (!payload.exp || Date.now() > payload.exp) throw new Error("Expired token");
  return payload;
}

export async function callViewFunction({ network, functionId, args }) {
  const fullnode = aptosFullnodes[network];
  if (!fullnode) throw new Error("Unsupported Aptos network.");

  const headers = { "content-type": "application/json" };
  const apiKey = aptosApiKeys[network];
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${fullnode.replace(/\/$/, "")}/view`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      function: functionId,
      type_arguments: [],
      arguments: args,
    }),
  });

  if (!response.ok) {
    const error = new Error(`On-chain access check failed with ${response.status}.`);
    error.status = 502;
    throw error;
  }

  return response.json();
}

export async function getOnChainListing({ network, blobName }) {
  const contract = marketplaceContracts[network];
  if (!contract) return null;

  const result = await callViewFunction({
    network,
    functionId: `${contract}::payby_marketplace::get_listing`,
    args: [blobName],
  });
  if (!Array.isArray(result) || result.length < 6 || result[5] !== true) {
    return null;
  }

  return {
    owner: String(result[0]),
    policy: Number(result[2]),
    price: String(result[3]),
    paymentMetadata: String(result[4] || ZERO_ADDRESS),
    active: result[5] === true,
  };
}

export async function canAccessOnChain({ network, address, blobName }) {
  const contract = marketplaceContracts[network];
  if (!contract) return false;

  const result = await callViewFunction({
    network,
    functionId: `${contract}::payby_marketplace::can_access`,
    args: [address, blobName],
  });
  return Array.isArray(result) && result[0] === true;
}

function normalizeAllowlist(value) {
  if (Array.isArray(value)) return value.map(String);
  return String(value || "")
    .split(/[,\n\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPolicy({ clientPolicy }) {
  if (allowClientPolicy && clientPolicy?.mode) return clientPolicy;
  return { mode: "free" };
}

function assertListingOwner({ listing, owner }) {
  if (!listing) return;
  if (String(listing.owner || "").toLowerCase() === String(owner || "").toLowerCase()) {
    return;
  }

  const error = new Error("On-chain listing owner does not match this media route.");
  error.status = 403;
  throw error;
}

export async function assertPolicyAccess({ policy, address, network, owner, blobName }) {
  const mode = policy.mode || "free";
  const listing = await getOnChainListing({ network, blobName });
  assertListingOwner({ listing, owner });

  if (listing?.active) {
    if (listing.policy === 0) return;
    if (await canAccessOnChain({ network, address, blobName })) return;

    const error = new Error(
      listing.policy === 2
        ? "No on-chain purchase found for this media."
        : "Wallet does not satisfy the on-chain access policy.",
    );
    error.status = 403;
    throw error;
  }

  if (mode === "free") return;

  const allowlist = normalizeAllowlist(policy.allowlist).map((item) =>
    item.toLowerCase(),
  );
  if (mode === "allowlist" && allowlist.includes(address.toLowerCase())) return;

  const error = new Error("Gated media is missing an active on-chain listing.");
  error.status = 403;
  throw error;
}

export function verifyMessage({ address, publicKey, signedMessage, message, nonce }) {
  if (!signedMessage?.fullMessage || !signedMessage?.signature) {
    throw new Error("Missing signed message.");
  }
  if (signedMessage.message !== message || signedMessage.nonce !== nonce) {
    throw new Error("Signed message payload mismatch.");
  }
  if (!signedMessage.fullMessage.includes(address)) {
    throw new Error("Signed message does not bind the wallet address.");
  }
  if (skipSignatureVerify) return;
  if (!publicKey) throw new Error("Missing public key for signature verification.");

  const verified = new Ed25519PublicKey(publicKey).verifySignature({
    message: new TextEncoder().encode(signedMessage.fullMessage),
    signature: new Ed25519Signature(signedMessage.signature),
  });
  if (!verified) throw new Error("Wallet signature verification failed.");
}

export function buildShelbyBlobUrl({ network, owner, blobName }) {
  return `${networks[network]}/v1/blobs/${encodeURIComponent(owner)}/${String(
    blobName,
  )
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function parseMediaDescriptor(req) {
  const url = new URL(req.url || "/", "https://payby.local");
  const rawPath = url.pathname.replace(/^\/api\/media\/?/, "");
  const [network = "", owner = "", ...blobParts] = rawPath
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  return { network, owner, blobName: blobParts.join("/") };
}

export function policyFromBody(body) {
  return getPolicy({ clientPolicy: body.accessPolicy });
}

export function marketplaceStatus() {
  return Object.values(marketplaceContracts).some(Boolean)
    ? "marketplace-configured"
    : "marketplace-not-configured";
}
