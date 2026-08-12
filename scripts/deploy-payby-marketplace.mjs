import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key.replaceAll("_", "-")}`);
    }
    values[key] = value;
    index += 1;
  }
  return values;
}

function required(values, key) {
  const value = values[key];
  if (!value) throw new Error(`Missing --${key.replaceAll("_", "-")}`);
  return value;
}

function asPositiveInteger(values, key, fallback) {
  const value = values[key] ?? String(fallback);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`--${key.replaceAll("_", "-")} must be a positive integer`);
  }
  return parsed;
}

function summarizeTransaction(transaction) {
  return {
    hash: transaction.hash,
    success: transaction.success,
    vmStatus: transaction.vm_status,
    version: transaction.version,
    gasUsed: transaction.gas_used,
  };
}

async function submitAndWait(aptos, account, transaction) {
  const pending = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  const committed = await aptos.waitForTransaction({
    transactionHash: pending.hash,
    options: { timeoutSecs: 180, checkSuccess: true },
  });
  return summarizeTransaction(committed);
}

async function main() {
  const values = parseArgs(process.argv.slice(2));
  const network = required(values, "network");
  if (network !== "shelbynet" && network !== "testnet") {
    throw new Error("--network must be shelbynet or testnet");
  }

  const address = required(values, "address");
  if (!/^0x[0-9a-fA-F]+$/.test(address)) {
    throw new Error("--address must be a valid Aptos address");
  }

  const privateKeyFile = path.resolve(required(values, "private_key_file"));
  const payloadFile = path.resolve(required(values, "payload_file"));
  const privateKey = fs.readFileSync(privateKeyFile, "utf8").trim();
  const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));
  const metadataBytes = payload?.args?.[0]?.value;
  const moduleBytecode = payload?.args?.[1]?.value;
  if (typeof metadataBytes !== "string" || !Array.isArray(moduleBytecode)) {
    throw new Error("Publish payload does not contain Aptos package metadata and bytecode");
  }

  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
    address,
  });
  const canonicalAddress = account.accountAddress.toString();
  if (canonicalAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error("The local private key does not match --address");
  }

  const fullnode =
    network === "shelbynet"
      ? "https://api.shelbynet.shelby.xyz/v1"
      : "https://api.testnet.aptoslabs.com/v1";
  const apiKey = values.api_key || process.env.NODE_API_KEY || "";
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode,
    fullnodeConfig: apiKey
      ? { HEADERS: { Authorization: `Bearer ${apiKey}` } }
      : undefined,
  });
  const aptos = new Aptos(config);
  const gasUnitPrice = asPositiveInteger(values, "gas_unit_price", 100);
  const publishMaxGas = asPositiveInteger(values, "publish_max_gas", 200000);
  const initMaxGas = asPositiveInteger(values, "init_max_gas", 100000);
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 180);

  const publishTransaction = await aptos.publishPackageTransaction({
    account: account.accountAddress,
    metadataBytes,
    moduleBytecode,
    options: {
      maxGasAmount: publishMaxGas,
      gasUnitPrice,
      expireTimestamp: expiration,
    },
  });
  const publish = await submitAndWait(aptos, account, publishTransaction);

  const initializeTransaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${canonicalAddress}::payby_marketplace::initialize`,
      functionArguments: [],
    },
    options: {
      maxGasAmount: initMaxGas,
      gasUnitPrice,
      expireTimestamp: BigInt(Math.floor(Date.now() / 1000) + 180),
    },
  });
  const initialize = await submitAndWait(aptos, account, initializeTransaction);

  process.stdout.write(
    `${JSON.stringify(
      {
        network,
        address: canonicalAddress,
        publish,
        initialize,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Payby SDK deployment failed: ${message}\n`);
  process.exitCode = 1;
});
