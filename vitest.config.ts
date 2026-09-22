import { defineConfig } from "vitest/config";

export default defineConfig({
  // "server-only" は Next の外では読み込めないので、テストでは空のモジュールにする
  resolve: { alias: { "server-only": new URL("./tests/helpers/server-only.ts", import.meta.url).pathname } },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 60_000 },
});
