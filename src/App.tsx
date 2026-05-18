import React from "react";
import { Loader2 } from "lucide-react";
import { PaybyLogo } from "./components/PaybyLogo";

const PaybyRuntime = React.lazy(() => import("./AppRuntime"));

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

function App() {
  return (
    <React.Suspense fallback={<RuntimeFallback />}>
      <PaybyRuntime />
    </React.Suspense>
  );
}

export default App;
