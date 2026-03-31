#!/bin/sh
set -e
echo "[enxoval] Aplicando migrações…"
npx tsx scripts/run-prisma.ts migrate deploy
echo "[enxoval] A subir o servidor…"
exec npx tsx server.ts
