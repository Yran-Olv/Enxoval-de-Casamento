import { createServer } from "node:net";

function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", (err: NodeJS.ErrnoException) => {
      srv.close();
      if (err.code === "EADDRINUSE") resolve(false);
      else reject(err);
    });
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

/**
 * Retorna a primeira porta livre em `host`, começando em `preferred`
 * (evita EADDRINUSE quando a porta já está em uso).
 */
export async function resolveAvailablePort(
  preferred: number,
  options?: { maxAttempts?: number; host?: string }
): Promise<number> {
  const maxAttempts = options?.maxAttempts ?? 50;
  const host = options?.host ?? "0.0.0.0";

  for (let offset = 0; offset <= maxAttempts; offset++) {
    const port = preferred + offset;
    if (await isPortFree(port, host)) return port;
  }

  throw new Error(
    `Nenhuma porta livre entre ${preferred} e ${preferred + maxAttempts} em ${host}.`
  );
}

export function getPreferredPort(): number {
  const n = Number(process.env.PORT);
  if (Number.isFinite(n) && n > 0 && n < 65536) return Math.floor(n);
  return 3255;
}
