import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";

const clayWasmPath = fileURLToPath(
  new URL(
    "./node_modules/@shelby-protocol/clay-codes/dist/clay.wasm",
    import.meta.url,
  ),
);

export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  plugins: [
    react(),
    {
      name: "payby-shelby-clay-wasm",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = request.url?.split("?")[0] ?? "";

          if (!pathname.endsWith("/clay.wasm") && pathname !== "/clay.wasm") {
            next();
            return;
          }

          response.setHeader("Content-Type", "application/wasm");
          response.setHeader("Cache-Control", "no-cache");
          createReadStream(clayWasmPath).pipe(response);
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ["@shelby-protocol/clay-codes"],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  define: {
    "process.env.GAID": JSON.stringify(""),
    "process.env.SHELBY_ENCODING": JSON.stringify(""),
  },
});
