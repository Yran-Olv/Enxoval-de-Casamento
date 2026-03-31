/**
 * Carrega DB_* do .env, monta DATABASE_URL em TS e executa o Prisma CLI.
 * Uso: tsx scripts/run-prisma.ts <args do prisma...>
 * Ex.: tsx scripts/run-prisma.ts migrate dev
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyDatabaseUrlToEnv } from "../config/database";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const scriptIdx = args.findIndex((a) => /run-prisma\.ts$/.test(a));
const prismaArgs = scriptIdx >= 0 ? args.slice(scriptIdx + 1) : args;

/** `prisma generate` não conecta ao banco; permite npm install sem .env completo. */
const placeholderUrl =
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public";

try {
  applyDatabaseUrlToEnv();
} catch (err) {
  if (prismaArgs[0] === "generate") {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL?.trim() || placeholderUrl;
  } else {
    throw err;
  }
}

const require = createRequire(import.meta.url);
const prismaPkg = path.dirname(require.resolve("prisma/package.json"));
const prismaEntry = path.join(prismaPkg, "build", "index.js");
const result = spawnSync(process.execPath, [prismaEntry, ...prismaArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
