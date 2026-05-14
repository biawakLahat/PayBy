import { Buffer as BufferPolyfill } from "buffer";

type BrowserProcess = {
  browser: true;
  env: Record<string, string | undefined>;
  nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]) => void;
  version: string;
};

const globals = globalThis as unknown as {
  Buffer?: typeof BufferPolyfill;
  global?: unknown;
  fetch?: typeof fetch;
  process?: BrowserProcess;
  __paybyAptosFetchPatched?: boolean;
};

if (!globals.Buffer) {
  globals.Buffer = BufferPolyfill;
}

if (!globals.global) {
  globals.global = globals;
}

if (!globals.process) {
  globals.process = {
    browser: true,
    env: {
      GAID: "",
      NODE_ENV: import.meta.env.MODE,
      SHELBY_ENCODING: "",
    },
    nextTick: (callback, ...args) => {
      queueMicrotask(() => callback(...args));
    },
    version: "",
  };
} else {
  globals.process.env = {
    GAID: "",
    NODE_ENV: import.meta.env.MODE,
    SHELBY_ENCODING: "",
    ...globals.process.env,
  };
}

const aptosApiKeysByHost: Record<string, string | undefined> = {
  "api.shelbynet.aptoslabs.com":
    import.meta.env.VITE_APTOS_SHELBYNET_API_KEY ||
    import.meta.env.VITE_SHELBYNET_API_KEY,
  "api.testnet.aptoslabs.com":
    import.meta.env.VITE_APTOS_TESTNET_API_KEY ||
    import.meta.env.VITE_SHELBY_TESTNET_API_KEY,
};

function getAptosApiKey(input: RequestInfo | URL) {
  const url = (() => {
    try {
      return typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    } catch {
      return undefined;
    }
  })();

  return url ? aptosApiKeysByHost[url.host] : undefined;
}

if (globals.fetch && !globals.__paybyAptosFetchPatched) {
  const nativeFetch = globals.fetch.bind(globalThis);

  globals.fetch = (input, init) => {
    const apiKey = getAptosApiKey(input);

    if (!apiKey) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ??
        (input instanceof Request ? input.headers : undefined),
    );

    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${apiKey}`);
    }

    if (input instanceof Request) {
      return nativeFetch(new Request(input, { ...init, headers }));
    }

    return nativeFetch(input, { ...init, headers });
  };

  globals.__paybyAptosFetchPatched = true;
}
