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

const port = Number(process.env.PAYBY_GATEWAY_PORT || 8787);
const secret = process.env.PAYBY_GATEWAY_SECRET || "payby-local-dev-secret";
const adminToken = process.env.PAYBY_GATEWAY_ADMIN_TOKEN || "";
const allowClientPolicy = process.env.PAYBY_GATEWAY_ALLOW_CLIENT_POLICY === "true";
const skipSignatureVerify =
  process.env.PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY === "true";

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

function json(res, status, body) {
  res.writeHead(status, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,x-admin-token",
    "content-type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
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

async function assertPolicyAccess({ policy, address, network, blobName }) {
  const mode = policy.mode || "free";

  if (marketplaceContracts[network]) {
    const listing = await getOnChainListing({ network, blobName });
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
    return json(res, 400, { error: "Missing access session fields." });
  }

  const policies = await readPolicies();
  const storedPolicy = policies[policyKey({ network, owner, blobName })];
  const policy = getPolicy({ storedPolicy, clientPolicy: accessPolicy });

  try {
    verifyMessage({ address, publicKey, signedMessage, message, nonce });
    await assertPolicyAccess({ policy, address, network, blobName });
  } catch (error) {
    return json(res, error.status || 401, { error: error.message });
  }

  const token = signToken({
    sub: address,
    network,
    owner,
    blobName,
    mode: policy.mode || "free",
    exp: Date.now() + 10 * 60 * 1000,
  });

  return json(res, 200, { token, expiresInSeconds: 600 });
}

async function handlePolicy(req, res, descriptor) {
  const policies = await readPolicies();
  const key = policyKey(descriptor);

  if (req.method === "GET") {
    return json(res, 200, { policy: policies[key] || null });
  }

  if (req.method !== "PUT") return notFound(res);

  if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
    return json(res, 401, { error: "Admin token required." });
  }

  const body = await readBody(req);
  policies[key] = {
    mode: body.mode || "free",
    allowlist: normalizeAllowlist(body.allowlist),
    price: body.price || "",
    currency: body.currency || "APT",
    updatedAt: new Date().toISOString(),
  };
  await writePolicies(policies);
  return json(res, 200, { policy: policies[key] });
}

async function handleMetadata(req, res, descriptor, url) {
  const registry = await readMetadataRegistry();

  if (req.method === "GET") {
    if (descriptor?.network && descriptor?.owner && descriptor?.blobName) {
      return json(res, 200, {
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

    return json(res, 200, { metadata: items });
  }

  if (req.method === "POST" && !descriptor?.network) {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (!item.network || !item.owner || !item.blobName) continue;
      const key = metadataKey({
        network: item.network,
        owner: item.owner,
        blobName: item.blobName,
      });
      registry[key] = {
        ...item,
        key,
        updatedAt: now,
      };
    }

    await writeMetadataRegistry(registry);
    return json(res, 200, { saved: items.length });
  }

  if (
    req.method === "DELETE" &&
    descriptor?.network &&
    descriptor?.owner &&
    descriptor?.blobName
  ) {
    delete registry[
      metadataKey({
        network: descriptor.network,
        owner: descriptor.owner,
        blobName: descriptor.blobName,
      })
    ];
    await writeMetadataRegistry(registry);
    return json(res, 200, { deleted: true });
  }

  return notFound(res);
}

async function handleMedia(req, res, descriptor, url) {
  const token = url.searchParams.get("token");
  if (!token) return json(res, 401, { error: "Access token required." });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return json(res, 401, { error: error.message });
  }

  if (
    payload.network !== descriptor.network ||
    payload.owner.toLowerCase() !== descriptor.owner.toLowerCase() ||
    payload.blobName !== descriptor.blobName
  ) {
    return json(res, 403, { error: "Token does not match this media." });
  }

  const baseUrl = networks[descriptor.network];
  if (!baseUrl) return json(res, 400, { error: "Unsupported network." });

  const upstreamUrl = `${baseUrl}/v1/blobs/${encodeURIComponent(
    descriptor.owner,
  )}/${descriptor.blobName.split("/").map(encodeURIComponent).join("/")}`;
  const upstream = await fetch(upstreamUrl);

  if (!upstream.ok || !upstream.body) {
    return json(res, upstream.status, {
      error: `Shelby retrieval failed with ${upstream.status}.`,
    });
  }

  res.writeHead(200, {
    "access-control-allow-origin": "*",
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
    "cache-control": "private, max-age=60",
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
  res.setHeader("access-control-allow-origin", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-token",
    });
    return res.end();
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        policyMode: allowClientPolicy ? "client-policy-dev" : "server-policy",
        signatureVerification: skipSignatureVerify ? "skipped" : "ed25519",
        marketplaceRegistry: Object.values(marketplaceContracts).some(Boolean)
          ? "marketplace-configured"
          : "marketplace-not-configured",
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

    return notFound(res);
  } catch (error) {
    return json(res, 500, { error: error.message || "Gateway error" });
  }
});

server.listen(port, () => {
  console.log(`Payby retrieval gateway listening on http://127.0.0.1:${port}`);
});
