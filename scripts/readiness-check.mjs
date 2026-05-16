import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function env(key) {
  return process.env[key] || "";
}

function getNetworks() {
  return {
    shelbynet: {
      label: "Shelbynet",
      fullnode:
        env("PAYBY_SHELBYNET_FULLNODE_URL") ||
        "https://api.shelbynet.aptoslabs.com/v1",
      contract:
        env("PAYBY_SHELBYNET_MARKETPLACE_ADDRESS") ||
        env("VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS"),
      paymentAsset:
        env("VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA") ||
        env("VITE_PAYBY_PAYMENT_ASSET_METADATA"),
    },
    "shelby-testnet": {
      label: "Shelby Testnet",
      fullnode:
        env("PAYBY_TESTNET_FULLNODE_URL") ||
        "https://api.testnet.aptoslabs.com/v1",
      contract:
        env("PAYBY_TESTNET_MARKETPLACE_ADDRESS") ||
        env("VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS"),
      paymentAsset:
        env("VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA") ||
        env("VITE_PAYBY_PAYMENT_ASSET_METADATA"),
    },
  };
}

async function loadDotEnv() {
  try {
    const raw = await readFile(join(repoRoot, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env is optional in CI.
  }
}

function status(ok, label, detail) {
  const mark = ok ? "OK" : "WARN";
  console.log(`[${mark}] ${label}${detail ? ` - ${detail}` : ""}`);
  return ok;
}

async function callView({ fullnode, contract, functionName, args = [] }) {
  const response = await fetch(`${fullnode.replace(/\/$/, "")}/view`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      function: `${contract}::payby_marketplace::${functionName}`,
      type_arguments: [],
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function checkGateway() {
  const gatewayUrl = env("VITE_PAYBY_RETRIEVAL_GATEWAY_URL")?.replace(/\/$/, "");
  if (!gatewayUrl) {
    return status(false, "Retrieval gateway", "VITE_PAYBY_RETRIEVAL_GATEWAY_URL is empty");
  }

  try {
    const response = await fetch(`${gatewayUrl}/health`);
    const data = await response.json();
    return status(
      response.ok,
      "Retrieval gateway",
      `${data.policyMode || "unknown policy"} / ${data.marketplaceRegistry || "unknown registry"}`,
    );
  } catch (error) {
    return status(false, "Retrieval gateway", error.message);
  }
}

async function checkNetwork([key, network]) {
  const label = network.label;
  if (!network.contract) {
    status(false, `${label} marketplace`, "contract address is empty");
    return false;
  }

  let ok = true;
  status(true, `${label} marketplace`, `configured at ${network.contract}`);

  for (const functionName of [
    "get_listing_count",
    "get_purchases",
    "can_access",
  ]) {
    try {
      const args =
        functionName === "get_purchases"
          ? ["0x0"]
          : functionName === "can_access"
            ? ["0x0", "__payby_readiness_probe__"]
            : [];
      await callView({
        fullnode: network.fullnode,
        contract: network.contract,
        functionName,
        args,
      });
      status(true, `${label} ${functionName}`, "view callable");
    } catch (error) {
      ok = false;
      status(false, `${label} ${functionName}`, error.message);
    }
  }

  if (network.paymentAsset) {
    status(true, `${label} payment asset`, "configured");
  } else {
    ok = false;
    status(false, `${label} payment asset`, "empty; paid unlocks are not production-ready");
  }

  return ok;
}

await loadDotEnv();

console.log("Payby readiness check");
console.log("=====================");

const results = [];
results.push(await checkGateway());
for (const entry of Object.entries(getNetworks())) {
  results.push(await checkNetwork(entry));
}

const ready = results.every(Boolean);
console.log("=====================");
console.log(ready ? "READY" : "NOT READY");
process.exitCode = ready ? 0 : 1;
