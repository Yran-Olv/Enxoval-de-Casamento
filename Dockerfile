# Imagem de produção: Node + build Vite + Prisma
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Não executa postinstall antes de copiar scripts (scripts/run-prisma.ts).
RUN npm ci --ignore-scripts

COPY . .

# Gera Prisma + build depois que todo o código já está no container
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npm run db:generate && npm run build

# limpa variável (runtime usa .env)
ENV DATABASE_URL=

ENV NODE_ENV=production

RUN chmod +x docker/entrypoint.sh

EXPOSE 3255

ENTRYPOINT ["./docker/entrypoint.sh"]