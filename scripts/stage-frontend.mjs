import { cp, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
if (dirname(output) !== root)
  throw Error("Build output must remain inside the project");
await rm(output, { recursive: true, force: true });
await cp(resolve(root, "frontend/out"), output, { recursive: true });
