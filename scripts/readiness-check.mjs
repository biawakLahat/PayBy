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

async function checkNetwork([key, network]) {
  const label = network.label;
  if (!network.contract) {
    status(false, `${label} marketplace`, "contract address is empty");
    return false;
  }

  let ok = true;
  status(true, `${label} marketplace`, `configured at ${network.contract}`);

  const probeOwner =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const checks = [
    { functionName: "get_listing_count_for_owner", args: [probeOwner] },
    {
      functionName: "get_listing_for_owner",
      args: [probeOwner, "__payby_readiness_probe__"],
    },
    {
      functionName: "get_listing_metadata_for_owner",
      args: [probeOwner, "__payby_readiness_probe__"],
    },
    {
      functionName: "can_access_for_owner",
      args: [probeOwner, probeOwner, "__payby_readiness_probe__"],
    },
    { functionName: "get_purchase_record_count", args: [probeOwner] },
    { functionName: "get_sales_summary", args: [probeOwner] },
  ];

  for (const { functionName, args } of checks) {
    try {
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
status(true, "Retrieval mode", "Direct Shelby while Early Access is pending");
for (const entry of Object.entries(getNetworks())) {
  results.push(await checkNetwork(entry));
}

const ready = results.every(Boolean);
console.log("=====================");
console.log(ready ? "READY" : "NOT READY");
process.exitCode = ready ? 0 : 1;
