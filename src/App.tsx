import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { PaybyLogo } from "./components/PaybyLogo";

const PaybyRuntime = React.lazy(() => import("./AppRuntime"));

function shouldLoadRuntime() {
  const path = window.location.pathname;
  return path.startsWith("/app") || path.startsWith("/media");
}

function RuntimeFallback() {
  return (
    <main className="runtime-loading" aria-live="polite">
      <div className="brand-mark">
        <PaybyLogo />
      </div>
      <Loader2 size={22} />
      <span>Loading Payby runtime</span>
    </main>
  );
}

function LandingEntry({ onLaunch }: { onLaunch: () => void }) {
  return (
    <main className="landing landing-web3 landing-entry">
      <header className="landing-nav">
        <button className="brand-mark" type="button" aria-label="Payby">
          <PaybyLogo />
        </button>
        <button className="button button-primary" type="button" onClick={onLaunch}>
          Open workspace
          <ArrowRight size={17} />
        </button>
      </header>

      <section className="hero landing-entry-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-pill">Shelby + Aptos creator vault</span>
            <h1>Payby</h1>
            <p>
              A Web3-native creator media vault for publishing, unlocking, and
              proving premium media through Shelby storage and Aptos wallets.
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-xl" type="button" onClick={onLaunch}>
                Open dApp
                <ArrowRight size={19} />
              </button>
            </div>
            <div className="trust-row">
              <span>Shelbynet ready</span>
              <span>Shelby testnet ready</span>
              <span>Buyer receipts</span>
            </div>
          </div>

          <div className="landing-entry-panel" aria-hidden="true">
            <div>
              <span>Creator</span>
              <strong>Publish media</strong>
            </div>
            <div>
              <span>Shelby</span>
              <strong>Store blobs</strong>
            </div>
            <div>
              <span>Buyer</span>
              <strong>Unlock access</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [loadRuntime, setLoadRuntime] = React.useState(shouldLoadRuntime);

  React.useEffect(() => {
    function syncRoute() {
      setLoadRuntime(shouldLoadRuntime());
    }

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const launchRuntime = React.useCallback(() => {
    window.history.pushState({}, "", "/app/vault");
    setLoadRuntime(true);
  }, []);

  if (!loadRuntime) {
    return <LandingEntry onLaunch={launchRuntime} />;
  }

  return (
    <React.Suspense fallback={<RuntimeFallback />}>
      <PaybyRuntime />
    </React.Suspense>
  );
}

export default App;
