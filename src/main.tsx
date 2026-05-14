import "./browser-polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import App from "./App";
import {
  PAYBY_NETWORKS,
  defaultNetwork,
  paybyWallets,
  type PaybyNetwork,
} from "./config/networks";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

function PaybyRoot() {
  const [selectedNetwork, setSelectedNetwork] =
    React.useState<PaybyNetwork>(defaultNetwork);
  const network = PAYBY_NETWORKS[selectedNetwork];

  const shelbyClient = React.useMemo(
    () =>
      new ShelbyClient({
        network: network.shelbyNetwork,
        apiKey: network.apiKey,
      }),
    [network.apiKey, network.shelbyNetwork],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        key={selectedNetwork}
        autoConnect={true}
        disableTelemetry={true}
        optInWallets={paybyWallets}
        dappConfig={{
          network: network.walletNetwork,
          aptosApiKeys: network.aptosApiKey
            ? { [network.walletNetwork]: network.aptosApiKey }
            : undefined,
        }}
        onError={(error) => {
          console.error("Aptos wallet adapter error", error);
        }}
      >
        <ShelbyClientProvider client={shelbyClient}>
          <App
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            shelbyClient={shelbyClient}
          />
        </ShelbyClientProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PaybyRoot />
  </React.StrictMode>,
);
