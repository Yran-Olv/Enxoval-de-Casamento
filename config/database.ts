/**
 * Configuração do PostgreSQL em TypeScript (variáveis DB_* no .env).
 * O Prisma só consome o valor já aplicado em process.env.DATABASE_URL
 * (veja scripts/run-prisma.ts e server.ts).
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** Valor bruto de DB_DIALECT (ex.: postgres) */
  dialect: string;
}

function t(v: string | undefined, fallback = ""): string {
  return (v ?? fallback).trim();
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: t(process.env.DB_HOST, "localhost"),
    port: Number(t(process.env.DB_PORT, "5432")) || 5432,
    user: t(process.env.DB_USER),
    password: t(process.env.DB_PASS),
    database: t(process.env.DB_NAME),
    dialect: t(process.env.DB_DIALECT, "postgres"),
  };
}

/** URL de conexão consumida pelo @prisma/client e pelo Prisma CLI. */
export function getDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const c = getDatabaseConfig();
  if (!c.user || !c.database) {
    throw new Error(
      "Configure DATABASE_URL ou DB_HOST, DB_USER, DB_PASS e DB_NAME (opcionais: DB_PORT, DB_DIALECT)."
    );
  }

  const d = c.dialect.toLowerCase();
  const protocol =
    d === "postgres" || d === "postgresql" ? "postgresql" : d;

  const u = encodeURIComponent(c.user);
  const p = encodeURIComponent(c.password);
  return `${protocol}://${u}:${p}@${c.host}:${c.port}/${c.database}?schema=public`;
}

/** Define DATABASE_URL para o Prisma (runtime ou antes de spawn do CLI). */
export function applyDatabaseUrlToEnv(): void {
  process.env.DATABASE_URL = getDatabaseUrl();
}
