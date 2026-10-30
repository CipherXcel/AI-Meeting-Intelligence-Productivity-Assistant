// One local entry point. Existing .env files are read, never rewritten.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { parse } from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => {
  try {
    return parse(readFileSync(resolve(root, name)));
  } catch {
    return {};
  }
};
const config = { ...read("backend/.env"), ...process.env };
const compose = read(".env");
const frontendPort = process.env.SAARTHI_FRONTEND_PORT || "3100";
const backendPort = process.env.SAARTHI_BACKEND_PORT || "4000";
if (config.DATABASE_URL && compose.POSTGRES_PASSWORD) {
  const url = new URL(config.DATABASE_URL);
  if (
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.port === "5443" &&
    url.username === "meetagent"
  ) {
    url.password = compose.POSTGRES_PASSWORD;
    config.DATABASE_URL = url.toString();
    console.log("Local database: using the Compose password from root .env.");
  }
}
Object.assign(config, {
  NODE_ENV: "development",
  PORT: backendPort,
  APP_URL: `http://localhost:${frontendPort}`,
  PUBLIC_URL: `http://localhost:${backendPort}`,
  NEXT_PUBLIC_API_URL: `http://localhost:${backendPort}`,
});
const children = [];
function start(script, cwd, args) {
  const child = spawn(process.execPath, [resolve(root, script), ...args], {
    cwd: resolve(root, cwd),
    env: config,
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code) process.exitCode = code;
  });
}
start("node_modules/tsx/dist/cli.mjs", "backend", ["watch", "src/index.ts"]);
start("node_modules/next/dist/bin/next", "frontend", [
  "dev",
  "--webpack",
  "--port",
  frontendPort,
]);
console.log(`MeetAgent: http://localhost:${frontendPort}`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const child of children) child.kill();
  });
