import * as React from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Moon,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import {
  useWallet,
  WalletReadyState,
} from "@aptos-labs/wallet-adapter-react";
import shelbyMark from "../../../assets/readme/shelby.jpg";
import {
  PAYBY_NETWORKS,
  type PaybyNetwork,
} from "../../config/networks";
import {
  getAccountAddress,
} from "../../services/aptos/wallet";
import { shortenAddress } from "../../utils/formatters";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export type ThemeName = "light" | "dark";

type WalletLike = {
  name: string;
  icon?: string;
  url?: string;
  readyState?: WalletReadyState | string;
};

const WALLET_DISPLAY_ORDER = [
  "Continue with Google",
  "Continue with Apple",
  "Petra",
  "OKX Wallet",
  "Nightly",
  "Pontem Wallet",
  "Backpack",
  "Bitget Wallet",
  "Gate Wallet",
  "Cosmostation Wallet",
];

export function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}) {
  return (
    <IconButton
      label="Toggle color mode"
      icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    />
  );
}

export function NetworkSwitch({
  selectedNetwork,
  onNetworkChange,
}: {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const network = PAYBY_NETWORKS[selectedNetwork];
  const options: { value: PaybyNetwork; detail: string }[] = [
    { value: "shelbynet", detail: "Primary Shelby route" },
    { value: "shelby-testnet", detail: "Requires Early Access support" },
  ];

  React.useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div className="network-switch" ref={menuRef}>
      <button
        className={`network-trigger ${open ? "is-open" : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="network-trigger-icon">
          <img
            className="network-trigger-logo"
            src={shelbyMark}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </span>
        <span className="network-trigger-copy">
          <strong>{network.label}</strong>
          <small>{selectedNetwork === "shelbynet" ? "Main route" : "Test route"}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="network-menu" role="listbox" aria-label="Select Shelby network">
          {options.map((option) => {
            const optionNetwork = PAYBY_NETWORKS[option.value];
            const active = option.value === selectedNetwork;
            return (
              <button
                className={`network-option ${active ? "is-active" : ""}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onNetworkChange(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{optionNetwork.label}</strong>
                  <small>{option.detail}</small>
                </span>
                {active ? <Check size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function WalletControl() {
  const {
    account,
    connected,
    connect,
    disconnect,
    wallet,
    wallets,
    notDetectedWallets,
    isLoading,
  } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [walletMessage, setWalletMessage] = React.useState("");
  const accountAddress = getAccountAddress(account);
  const walletOptions = React.useMemo(() => {
    const merged = new Map<string, WalletLike>();

    ((notDetectedWallets as unknown) as readonly WalletLike[]).forEach(
      (candidate) => {
        merged.set(candidate.name, candidate);
      },
    );

    ((wallets as unknown) as readonly WalletLike[]).forEach((candidate) => {
      merged.set(candidate.name, candidate);
    });

    return [...merged.values()].sort((a, b) => {
      const first = WALLET_DISPLAY_ORDER.indexOf(a.name);
      const second = WALLET_DISPLAY_ORDER.indexOf(b.name);
      const firstRank = first === -1 ? WALLET_DISPLAY_ORDER.length : first;
      const secondRank = second === -1 ? WALLET_DISPLAY_ORDER.length : second;
      return firstRank - secondRank || a.name.localeCompare(b.name);
    });
  }, [notDetectedWallets, wallets]);

  if (connected && accountAddress) {
    return (
      <button className="wallet-pill" type="button" onClick={disconnect}>
        <span className="wallet-dot" />
        <span>{wallet?.name ?? "Wallet"}</span>
        <strong>{shortenAddress(accountAddress)}</strong>
        <X size={15} />
      </button>
    );
  }

  return (
    <div className="wallet-menu">
      <Button
        variant="primary"
        onClick={() => {
          setWalletMessage("");
          setOpen((value) => !value);
        }}
        disabled={isLoading}
      >
        <Wallet size={18} />
        Connect
      </Button>
      {open ? (
        <div className="wallet-list">
          <div className="wallet-list-header">
            <strong>Choose wallet</strong>
            <span>Aptos Connect and AIP-62 wallets</span>
          </div>
          {walletOptions.length === 0 ? (
            <p>No Aptos wallet option is available yet.</p>
          ) : (
            walletOptions.map((candidate) => {
              const isInstalled =
                candidate.readyState !== WalletReadyState.NotDetected;
              return (
                <button
                  className={!isInstalled ? "is-install" : ""}
                  key={candidate.name}
                  type="button"
                  onClick={async () => {
                    if (!isInstalled) {
                      if (candidate.url) {
                        window.open(candidate.url, "_blank", "noopener,noreferrer");
                      }
                      return;
                    }

                    try {
                      setWalletMessage("");
                      await (connect as (walletName: string) => Promise<void>)(
                        candidate.name,
                      );
                      setOpen(false);
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Wallet connection needs attention.";
                      setWalletMessage(message);
                    }
                  }}
                >
                  {candidate.icon ? <img src={candidate.icon} alt="" /> : null}
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{isInstalled ? "Ready to connect" : "Install wallet"}</small>
                  </span>
                  {isInstalled ? <Check size={15} /> : <ExternalLink size={15} />}
                </button>
              );
            })
          )}
          {walletMessage ? (
            <p className="wallet-error" role="alert">
              {walletMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
