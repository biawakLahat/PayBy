import * as React from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type { MetadataSyncState } from "../../domain/models";
import { shortenAddress } from "../../utils/formatters";
import { IconButton } from "../../components/workspace/IconButton";
import { PageHeader } from "../../components/workspace/PageHeader";

export function NetworkPage({
  selectedNetwork,
  accountAddress,
  metadataSyncState,
}: {
  selectedNetwork: PaybyNetwork;
  accountAddress: string;
  metadataSyncState: MetadataSyncState;
}) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const [copiedLabel, setCopiedLabel] = React.useState("");
  const rows = [
    { label: "Shelby RPC", value: network.shelbyRpcUrl },
    { label: "Aptos Full Node", value: network.fullnodeUrl },
    { label: "Indexer", value: network.indexerUrl },
    { label: "Contract", value: network.contractAddress },
    {
      label: "Payby Marketplace",
      value: network.marketplaceContractAddress || "Setup needed",
    },
    {
      label: "Payment Asset",
      value: network.paymentAssetMetadataAddress || "Setup needed",
    },
    {
      label: "APT Payment Asset",
      value: network.paymentAssets.APT || "Setup needed",
    },
    {
      label: "ShelbyUSD Payment Asset",
      value: network.paymentAssets.SHELBYUSD || "Setup needed",
    },
  ];
  const proofRows = [
    {
      label: "Shelby storage route",
      state: "Ready",
      detail: "Uploads and retrieval target this Shelby RPC.",
      ok: Boolean(network.shelbyRpcUrl),
    },
    {
      label: "Aptos execution route",
      state: "Ready",
      detail: "Wallet transactions settle through the configured fullnode.",
      ok: Boolean(network.fullnodeUrl),
    },
    {
      label: "Marketplace registry",
      state: network.marketplaceContractAddress ? "Configured" : "Missing",
      detail: network.marketplaceContractAddress
        ? "Restricted media can write access policy on-chain."
        : "Set the marketplace contract address before paid or allowlist media.",
      ok: Boolean(network.marketplaceContractAddress),
    },
    {
      label: "Retrieval",
      state: "Shelby route",
      detail: "Payby retrieves media through the active Shelby storage route.",
      ok: true,
    },
  ];

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1400);
  }

  return (
    <section className="panel network-panel" id="network">
      <PageHeader
        eyebrow="Live configuration"
        title={network.label}
        description="Review the Shelby storage route and Aptos contracts used for this session."
        icon={<KeyRound size={24} />}
      />
      <div className="network-route-card">
        <div>
          <span>Active route</span>
          <strong>{network.label}</strong>
          <p>{network.permanenceNote}</p>
        </div>
        <div className="network-route-meta" aria-label="Active network status">
          <span>
            <Sparkles size={15} />
            Shelby storage
          </span>
          <span>
            <ShieldCheck size={15} />
            {accountAddress ? "Wallet attached" : "Wallet needed"}
          </span>
          <span>
            <Database size={15} />
            Shelby retrieval
          </span>
        </div>
      </div>
      <div className="network-status-bar" aria-label="Network readiness status">
        {proofRows.map((item) => (
          <div className={item.ok ? "is-ready" : "is-warning"} key={item.label}>
            {item.ok ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
            <span>{item.label}</span>
            <strong>{item.state}</strong>
          </div>
        ))}
        <div className={metadataSyncState === "offline" ? "is-warning" : "is-ready"}>
          {metadataSyncState === "offline" ? (
            <AlertTriangle size={16} />
          ) : (
            <Database size={16} />
          )}
          <span>Metadata</span>
          <strong>
            {metadataSyncState === "synced"
              ? "Synced"
              : metadataSyncState === "syncing"
                ? "Checking"
                : metadataSyncState === "offline"
                  ? "Offline cache"
                  : "Ready"}
          </strong>
        </div>
      </div>
      <div className="funding-helper">
        <div>
          <CreditCard size={18} />
          <span>Funding helper</span>
          <strong>{accountAddress ? shortenAddress(accountAddress) : "Connect wallet"}</strong>
          <p>
            Upload registration requires network gas and Shelby storage
            resources. Keep route funds available before publishing large media.
          </p>
        </div>
        <a
          className="button button-secondary"
          href="https://aptos.dev/network/faucet"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={17} />
          Aptos faucet
        </a>
      </div>
      <details className="endpoint-drawer">
        <summary>
          <span>
            <Database size={17} />
            Technical endpoints
          </span>
          <strong>RPC, indexer, contracts, assets</strong>
          <ChevronDown size={17} />
        </summary>
        <div className="endpoint-grid">
          {rows.map(({ label, value }) => (
            <div className="endpoint" key={label}>
              <span>{label}</span>
              <code>{value}</code>
              <IconButton
                label={`Copy ${label}`}
                title={copiedLabel === label ? "Copied" : `Copy ${label}`}
                icon={copiedLabel === label ? <Check size={16} /> : <Copy size={16} />}
                onClick={() => void copy(label, value)}
              />
            </div>
          ))}
        </div>
        <a
          className="network-link"
          href={`https://explorer.aptoslabs.com/account/${network.contractAddress}?network=${network.explorerNetwork}`}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={17} />
          Open contract in Aptos Explorer
        </a>
      </details>
    </section>
  );
}
