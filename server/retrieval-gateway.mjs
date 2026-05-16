import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ed25519PublicKey, Ed25519Signature } from "@aptos-labs/ts-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const policiesPath = join(dataDir, "access-policies.json");
const metadataPath = join(dataDir, "media-metadata.json");

async function loadDotEnv() {
  try {
    const raw = await readFile(join(__dirname, "..", ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env is optional for hosted gateway deployments.
  }
}

await loadDotEnv();

const port = Number(process.env.PORT || process.env.PAYBY_GATEWAY_PORT || 8787);
const secret = process.env.PAYBY_GATEWAY_SECRET || "payby-local-dev-secret";
const adminToken = process.env.PAYBY_GATEWAY_ADMIN_TOKEN || "";
const allowedOrigins = String(process.env.PAYBY_GATEWAY_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const maxBodyBytes = Number(process.env.PAYBY_GATEWAY_MAX_BODY_BYTES || 128_000);
const maxMetadataItems = Number(process.env.PAYBY_GATEWAY_MAX_METADATA_ITEMS || 20);
const sessionRateLimitWindowMs = Number(
  process.env.PAYBY_GATEWAY_RATE_LIMIT_WINDOW_MS || 60_000,
);
const sessionRateLimitMax = Number(
  process.env.PAYBY_GATEWAY_RATE_LIMIT_MAX || 30,
);
const allowClientPolicy = process.env.PAYBY_GATEWAY_ALLOW_CLIENT_POLICY === "true";
const skipSignatureVerify =
  process.env.PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY === "true";
const isProduction = process.env.NODE_ENV === "production";
const sessionRateBuckets = new Map();

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

function assertProductionConfig() {
  if (!isProduction) return;

  const errors = [];
  if (!secret || secret === "payby-local-dev-secret" || secret.length < 32) {
    errors.push("PAYBY_GATEWAY_SECRET must be at least 32 characters.");
  }
  if (!adminToken || adminToken.length < 24) {
    errors.push("PAYBY_GATEWAY_ADMIN_TOKEN must be set for production policy writes.");
  }
  if (allowedOrigins.includes("*")) {
    errors.push("PAYBY_GATEWAY_ALLOWED_ORIGINS must not be '*' in production.");
  }
  if (allowClientPolicy) {
    errors.push("PAYBY_GATEWAY_ALLOW_CLIENT_POLICY must be false in production.");
  }
  if (skipSignatureVerify) {
    errors.push("PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY must be false in production.");
  }
  if (!marketplaceContracts.shelbynet) {
    errors.push("PAYBY_SHELBYNET_MARKETPLACE_ADDRESS is required.");
  }
  if (!marketplaceContracts["shelby-testnet"]) {
    errors.push("PAYBY_TESTNET_MARKETPLACE_ADDRESS is required.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production gateway config:\n- ${errors.join("\n- ")}`);
  }
}

assertProductionConfig();

function getRequestOrigin(req) {
  return String(req.headers.origin || "");
}

function getCorsOrigin(req) {
  const origin = getRequestOrigin(req);
  if (allowedOrigins.includes("*")) return "*";
  if (origin && allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0] || "null";
}

function isOriginAllowed(req) {
  const origin = getRequestOrigin(req);
  return !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function corsHeaders(req) {
  return {
    "access-control-allow-origin": getCorsOrigin(req),
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-admin-token",
    "vary": "origin",
  };
}

function json(req, res, status, body) {
  res.writeHead(status, {
    ...corsHeaders(req),
    "content-type": "application/json",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

function notFound(req, res) {
  json(req, res, 404, { error: "Not found" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        const error = new Error("Request body is too large.");
        error.status = 413;
        req.destroy(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function assertSessionRateLimit(req) {
  const key = clientIp(req) || "unknown";
  const now = Date.now();
  const bucket = sessionRateBuckets.get(key);

  if (!bucket || now - bucket.startedAt > sessionRateLimitWindowMs) {
    sessionRateBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > sessionRateLimitMax) {
    const error = new Error("Too many access requests. Try again shortly.");
    error.status = 429;
    throw error;
  }
}

function cleanRateLimitBuckets() {
  const cutoff = Date.now() - sessionRateLimitWindowMs * 2;
  for (const [key, bucket] of sessionRateBuckets.entries()) {
    if (bucket.startedAt < cutoff) sessionRateBuckets.delete(key);
  }
}

function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{1,64}$/.test(String(value || ""));
}

function isValidNetwork(value) {
  return value === "shelbynet" || value === "shelby-testnet";
}

function assertSafeBlobName(blobName) {
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

function clampString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizeMetadataItem(item) {
  const network = String(item?.network || "");
  const owner = String(item?.owner || "");
  const blobName = String(item?.blobName || "");

  if (!isValidNetwork(network) || !isValidAddress(owner)) {
    const error = new Error("Invalid metadata network or owner.");
    error.status = 400;
    throw error;
  }
  assertSafeBlobName(blobName);

  const accessMode = ["free", "allowlist", "nft", "paid", "subscription"].includes(
    item?.accessMode,
  )
    ? item.accessMode
    : "free";
  const visibility = ["public", "unlisted", "private"].includes(item?.visibility)
    ? item.visibility
    : "unlisted";
  const currency = item?.currency === "SHELBYUSD" ? "SHELBYUSD" : "APT";
  const tags = Array.isArray(item?.tags)
    ? item.tags.map((tag) => clampString(tag, 32)).filter(Boolean).slice(0, 12)
    : [];

  return {
    key: metadataKey({ network, owner, blobName }),
    owner,
    blobName,
    network,
    title: clampString(item?.title || blobName, 120),
    description: clampString(item?.description, 1_000),
    category: clampString(item?.category || "Premium media", 80),
    tags,
    coverUrl: clampString(item?.coverUrl, 500),
    visibility,
    accessMode,
    price: clampString(item?.price, 40),
    currency,
    allowlist: clampString(item?.allowlist, 4_000),
    createdAt:
      typeof item?.createdAt === "number" && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now(),
  };
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function signToken(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac("sha256", secret).update(encoded).digest());
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  const [encoded, signature] = token.split(".");
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

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("Expired token");
  }

  return payload;
}

function policyKey({ network, owner, blobName }) {
  return `${network}::${owner.toLowerCase()}::${blobName}`;
}

function metadataKey({ network, owner, blobName }) {
  return policyKey({ network, owner, blobName });
}

async function readPolicies() {
  try {
    return JSON.parse(await readFile(policiesPath, "utf8"));
  } catch {
    return {};
  }
}

async function writePolicies(policies) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(policiesPath, `${JSON.stringify(policies, null, 2)}\n`);
}

async function readMetadataRegistry() {
  try {
    return JSON.parse(await readFile(metadataPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeMetadataRegistry(metadata) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

function normalizeAllowlist(value) {
  if (Array.isArray(value)) return value.map(String);
  return String(value || "")
    .split(/[,\n\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPolicy({ storedPolicy, clientPolicy }) {
  if (storedPolicy) return storedPolicy;
  if (allowClientPolicy && clientPolicy?.mode) return clientPolicy;
  return { mode: "free" };
}

async function canAccessOnChain({ network, address, blobName }) {
  const contract = marketplaceContracts[network];
  const fullnode = aptosFullnodes[network];
  if (!contract || !fullnode) return false;

  const result = await callViewFunction({
    network,
    functionId: `${contract}::payby_marketplace::can_access`,
    args: [address, blobName],
  });
  return Array.isArray(result) && result[0] === true;
}

async function getOnChainListing({ network, blobName }) {
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
    paymentMetadata: String(result[4]),
    active: result[5] === true,
  };
}

async function callViewFunction({ network, functionId, args }) {
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

function assertListingOwner({ listing, owner }) {
  if (!listing) return;
  if (String(listing.owner || "").toLowerCase() === String(owner || "").toLowerCase()) {
    return;
  }

  const error = new Error("On-chain listing owner does not match this media route.");
  error.status = 403;
  throw error;
}

async function assertPolicyAccess({ policy, address, network, owner, blobName }) {
  const mode = policy.mode || "free";

  if (marketplaceContracts[network]) {
    const listing = await getOnChainListing({ network, blobName });
    assertListingOwner({ listing, owner });
    if (listing?.active && listing.policy !== 0) {
      if (await canAccessOnChain({ network, address, blobName })) return;

      const error = new Error(
        listing.policy === 2
          ? "No on-chain purchase found for this media."
          : "Wallet does not satisfy the on-chain access policy.",
      );
      error.status = 403;
      throw error;
    }
  }

  if (mode === "free") return;

  if (marketplaceContracts[network]) {
    const listing = await getOnChainListing({ network, blobName });
    assertListingOwner({ listing, owner });
    if (!listing?.active) {
      const error = new Error("Gated media is missing an active on-chain listing.");
      error.status = 403;
      throw error;
    }

    if (await canAccessOnChain({ network, address, blobName })) return;

    if (mode === "paid") {
      const error = new Error("No on-chain purchase found for this media.");
      error.status = 403;
      throw error;
    }
  }

  if (mode === "allowlist") {
    const allowlist = normalizeAllowlist(policy.allowlist).map((item) =>
      item.toLowerCase(),
    );
    if (allowlist.includes(address.toLowerCase())) return;
    const error = new Error("Wallet is not on the allowlist.");
    error.status = 403;
    throw error;
  }

  const error = new Error(
    `${mode} enforcement needs an on-chain verifier or server policy.`,
  );
  error.status = 501;
  throw error;
}

function verifyMessage({ address, publicKey, signedMessage, message, nonce }) {
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

  if (!publicKey) {
    throw new Error("Missing public key for signature verification.");
  }

  const verified = new Ed25519PublicKey(publicKey).verifySignature({
    message: new TextEncoder().encode(signedMessage.fullMessage),
    signature: new Ed25519Signature(signedMessage.signature),
  });

  if (!verified) {
    throw new Error("Wallet signature verification failed.");
  }
}

function parseMediaPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[0] !== "api" || parts[1] !== "media") {
    return null;
  }

  const [, , network, owner, ...blobParts] = parts;
  return {
    network,
    owner: decodeURIComponent(owner),
    blobName: blobParts.map(decodeURIComponent).join("/"),
  };
}

function parsePolicyPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[0] !== "api" || parts[1] !== "policies") {
    return null;
  }

  const [, , network, owner, ...blobParts] = parts;
  return {
    network,
    owner: decodeURIComponent(owner),
    blobName: blobParts.map(decodeURIComponent).join("/"),
  };
}

function parseMetadataPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "api" || parts[1] !== "metadata") {
    return null;
  }

  if (parts.length < 5) return {};

  const [, , network, owner, ...blobParts] = parts;
  return {
    network,
    owner: decodeURIComponent(owner),
    blobName: blobParts.map(decodeURIComponent).join("/"),
  };
}

async function handleSession(req, res) {
  try {
    assertSessionRateLimit(req);
  } catch (error) {
    return json(req, res, error.status || 429, { error: error.message });
  }

  const body = await readBody(req);
  const {
    address,
    publicKey,
    network,
    owner,
    blobName,
    nonce,
    message,
    signedMessage,
    accessPolicy,
  } = body;

  if (!address || !network || !owner || !blobName || !nonce || !message) {
    return json(req, res, 400, { error: "Missing access session fields." });
  }

  if (!isValidNetwork(network) || !isValidAddress(address) || !isValidAddress(owner)) {
    return json(req, res, 400, { error: "Invalid network or wallet address." });
  }

  try {
    assertSafeBlobName(blobName);
  } catch (error) {
    return json(req, res, error.status || 400, { error: error.message });
  }

  const policies = await readPolicies();
  const storedPolicy = policies[policyKey({ network, owner, blobName })];
  const policy = getPolicy({ storedPolicy, clientPolicy: accessPolicy });

  try {
    verifyMessage({ address, publicKey, signedMessage, message, nonce });
    await assertPolicyAccess({ policy, address, network, owner, blobName });
  } catch (error) {
    return json(req, res, error.status || 401, { error: error.message });
  }

  const token = signToken({
    sub: address,
    network,
    owner,
    blobName,
    mode: policy.mode || "free",
    exp: Date.now() + 10 * 60 * 1000,
  });

  return json(req, res, 200, { token, expiresInSeconds: 600 });
}

async function handlePolicy(req, res, descriptor) {
  if (
    !isValidNetwork(descriptor.network) ||
    !isValidAddress(descriptor.owner)
  ) {
    return json(req, res, 400, { error: "Invalid policy path." });
  }
  try {
    assertSafeBlobName(descriptor.blobName);
  } catch (error) {
    return json(req, res, error.status || 400, { error: error.message });
  }

  const policies = await readPolicies();
  const key = policyKey(descriptor);

  if (req.method === "GET") {
    return json(req, res, 200, { policy: policies[key] || null });
  }

  if (req.method !== "PUT") return notFound(req, res);

  if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
    return json(req, res, 401, { error: "Admin token required." });
  }

  const body = await readBody(req);
  policies[key] = {
    mode: ["free", "allowlist", "nft", "paid", "subscription"].includes(body.mode)
      ? body.mode
      : "free",
    allowlist: normalizeAllowlist(body.allowlist).filter(isValidAddress).slice(0, 500),
    price: clampString(body.price, 40),
    currency: body.currency === "SHELBYUSD" ? "SHELBYUSD" : "APT",
    updatedAt: new Date().toISOString(),
  };
  await writePolicies(policies);
  return json(req, res, 200, { policy: policies[key] });
}

async function handleMetadata(req, res, descriptor, url) {
  const registry = await readMetadataRegistry();

  if (req.method === "GET") {
    if (descriptor?.network && descriptor?.owner && descriptor?.blobName) {
      if (
        !isValidNetwork(descriptor.network) ||
        !isValidAddress(descriptor.owner)
      ) {
        return json(req, res, 400, { error: "Invalid metadata path." });
      }
      try {
        assertSafeBlobName(descriptor.blobName);
      } catch (error) {
        return json(req, res, error.status || 400, { error: error.message });
      }
      return json(req, res, 200, {
        metadata:
          registry[
            metadataKey({
              network: descriptor.network,
              owner: descriptor.owner,
              blobName: descriptor.blobName,
            })
          ] || null,
      });
    }

    const networkFilter = url.searchParams.get("network");
    const ownerFilter = url.searchParams.get("owner")?.toLowerCase();
    const items = Object.values(registry).filter((item) => {
      if (networkFilter && item.network !== networkFilter) return false;
      if (ownerFilter && String(item.owner || "").toLowerCase() !== ownerFilter) {
        return false;
      }
      return true;
    });

    return json(req, res, 200, { metadata: items.slice(0, 500) });
  }

  if (req.method === "POST" && !descriptor?.network) {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length > maxMetadataItems) {
      return json(req, res, 413, {
        error: `Metadata batch is too large. Max ${maxMetadataItems} items.`,
      });
    }
    const now = new Date().toISOString();
    let saved = 0;

    for (const item of items) {
      let sanitized;
      try {
        sanitized = sanitizeMetadataItem(item);
      } catch (error) {
        return json(req, res, error.status || 400, { error: error.message });
      }
      const key = sanitized.key;
      registry[key] = {
        ...sanitized,
        updatedAt: now,
      };
      saved += 1;
    }

    await writeMetadataRegistry(registry);
    return json(req, res, 200, { saved });
  }

  if (
    req.method === "DELETE" &&
    descriptor?.network &&
    descriptor?.owner &&
    descriptor?.blobName
  ) {
    if (
      !isValidNetwork(descriptor.network) ||
      !isValidAddress(descriptor.owner)
    ) {
      return json(req, res, 400, { error: "Invalid metadata path." });
    }
    try {
      assertSafeBlobName(descriptor.blobName);
    } catch (error) {
      return json(req, res, error.status || 400, { error: error.message });
    }
    delete registry[
      metadataKey({
        network: descriptor.network,
        owner: descriptor.owner,
        blobName: descriptor.blobName,
      })
    ];
    await writeMetadataRegistry(registry);
    return json(req, res, 200, { deleted: true });
  }

  return notFound(req, res);
}

async function handleMedia(req, res, descriptor, url) {
  const token = url.searchParams.get("token");
  if (!token) return json(req, res, 401, { error: "Access token required." });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return json(req, res, 401, { error: error.message });
  }

  if (
    payload.network !== descriptor.network ||
    payload.owner.toLowerCase() !== descriptor.owner.toLowerCase() ||
    payload.blobName !== descriptor.blobName
  ) {
    return json(req, res, 403, { error: "Token does not match this media." });
  }

  const baseUrl = networks[descriptor.network];
  if (!baseUrl) return json(req, res, 400, { error: "Unsupported network." });

  if (!isValidAddress(descriptor.owner)) {
    return json(req, res, 400, { error: "Invalid owner address." });
  }

  try {
    assertSafeBlobName(descriptor.blobName);
  } catch (error) {
    return json(req, res, error.status || 400, { error: error.message });
  }

  const upstreamUrl = `${baseUrl}/v1/blobs/${encodeURIComponent(
    descriptor.owner,
  )}/${descriptor.blobName.split("/").map(encodeURIComponent).join("/")}`;
  const upstream = await fetch(upstreamUrl);

  if (!upstream.ok || !upstream.body) {
    return json(req, res, upstream.status, {
      error: `Shelby retrieval failed with ${upstream.status}.`,
    });
  }

  res.writeHead(200, {
    ...corsHeaders(req),
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
    "cache-control": "private, max-age=60",
    "x-content-type-options": "nosniff",
  });

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

const server = createServer(async (req, res) => {
  cleanRateLimitBuckets();

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(req),
    });
    return res.end();
  }

  try {
    if (!isOriginAllowed(req)) {
      return json(req, res, 403, { error: "Origin is not allowed." });
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(req, res, 200, {
        ok: true,
        policyMode: allowClientPolicy ? "client-policy-dev" : "server-policy",
        signatureVerification: skipSignatureVerify ? "skipped" : "ed25519",
        marketplaceRegistry: Object.values(marketplaceContracts).some(Boolean)
          ? "marketplace-configured"
          : "marketplace-not-configured",
        cors: allowedOrigins.includes("*") ? "open" : "restricted",
        metadata: "file-registry",
      });
    }

    if (req.method === "POST" && url.pathname === "/api/session") {
      return await handleSession(req, res);
    }

    const policyDescriptor = parsePolicyPath(url.pathname);
    if (policyDescriptor) {
      return await handlePolicy(req, res, policyDescriptor);
    }

    const metadataDescriptor = parseMetadataPath(url.pathname);
    if (metadataDescriptor) {
      return await handleMetadata(req, res, metadataDescriptor, url);
    }

    const mediaDescriptor = parseMediaPath(url.pathname);
    if (mediaDescriptor) {
      return await handleMedia(req, res, mediaDescriptor, url);
    }

    return notFound(req, res);
  } catch (error) {
    return json(req, res, error.status || 500, {
      error: error.message || "Gateway error",
    });
  }
});

server.listen(port, () => {
  console.log(`Payby retrieval gateway listening on http://127.0.0.1:${port}`);
});
