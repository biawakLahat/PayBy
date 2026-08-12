import * as React from "react";
import {
  Activity,
  CreditCard,
  Database,
  FileArchive,
  ReceiptText,
  Search,
  ShieldCheck,
  UploadCloud,
  User,
} from "lucide-react";
import { PaybyLogo } from "../../components/PaybyLogo";
import type { AppRoute, AppViewName } from "../../app/router";

const VIEW_TITLES: Record<AppViewName, string> = {
  vault: "Vault library",
  publish: "Publish media",
  analytics: "Creator analytics",
  discover: "Creator discovery",
  library: "Buyer library",
  network: "Network routes",
  detail: "Media detail",
  profile: "Creator profile",
  activity: "Activity feed",
};

const VIEW_LABELS: Record<AppViewName, string> = {
  vault: "Creator",
  publish: "Creator",
  analytics: "Creator",
  discover: "Buyer",
  library: "Buyer",
  network: "System",
  detail: "Creator",
  profile: "Account",
  activity: "Account",
};

export function WorkspacePage({
  currentView,
  routeTransitionKey,
  networkLabel,
  onHome,
  onNavigate,
  networkControl,
  themeControl,
  walletControl,
  children,
}: {
  currentView: AppViewName;
  routeTransitionKey: string;
  networkLabel: string;
  onHome: () => void;
  onNavigate: (route: AppRoute) => void;
  networkControl: React.ReactNode;
  themeControl: React.ReactNode;
  walletControl: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-identity">
          <button
            className="brand-mark sidebar-brand"
            onClick={onHome}
            type="button"
            aria-label="Back to Payby landing"
          >
            <PaybyLogo />
          </button>
          <span>Shelby creator workspace</span>
        </div>
        <nav className="side-nav" aria-label="Payby sections">
          <span className="side-nav-label">Creator</span>
          <button
            className={`side-link ${currentView === "vault" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "vault" })}
          >
            <FileArchive size={18} />
            Vault
          </button>
          <button
            className={`side-link ${currentView === "publish" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "publish" })}
          >
            <UploadCloud size={18} />
            Publish
          </button>
          <button
            className={`side-link ${currentView === "analytics" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "analytics" })}
          >
            <CreditCard size={18} />
            Analytics
          </button>
          <span className="side-nav-label">Buyer</span>
          <button
            className={`side-link ${currentView === "discover" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "discover" })}
          >
            <Search size={18} />
            Discover
          </button>
          <button
            className={`side-link ${currentView === "library" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "library" })}
          >
            <ReceiptText size={18} />
            Library
          </button>
          <span className="side-nav-label">System</span>
          <button
            className={`side-link ${currentView === "network" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "network" })}
          >
            <Database size={18} />
            Network
          </button>
          <button
            className={`side-link ${currentView === "profile" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "profile" })}
          >
            <User size={18} />
            Profile
          </button>
          <button
            className={`side-link ${currentView === "activity" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "activity" })}
          >
            <Activity size={18} />
            Activity
          </button>
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <div>
            <strong>{networkLabel}</strong>
            <span>Storage route active</span>
          </div>
        </div>
      </aside>

      <section className="workspace" data-view={currentView}>
        <header className="topbar" key={`topbar-${routeTransitionKey}`}>
          <div className="route-title-block">
            <p className="muted">{VIEW_LABELS[currentView]}</p>
            <h1>{VIEW_TITLES[currentView]}</h1>
          </div>
          <div className="topbar-actions">
            {networkControl}
            {themeControl}
            {walletControl}
          </div>
        </header>

        <section
          className="workspace-page"
          key={routeTransitionKey}
          aria-live="polite"
        >
          {children}
        </section>
      </section>
    </main>
  );
}
