# Imagem de produção: Node + build Vite + Prisma
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Gera o client Prisma no build (não precisa de base real)
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npm run db:generate && npm run build

# Não fixar URL da base na imagem — em runtime usam-se DB_* (Compose injeta).
ENV DATABASE_URL=

ENV NODE_ENV=production

RUN chmod +x docker/entrypoint.sh

EXPOSE 3255

ENTRYPOINT ["./docker/entrypoint.sh"]
