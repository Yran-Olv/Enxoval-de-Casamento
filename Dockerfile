# Usa Node 22 (necessário pro Prisma/streams)
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# evita erro do lock quebrado
RUN npm install

COPY . .

# Gera Prisma + build
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npm run db:generate && npm run build

# limpa variável (runtime usa .env)
ENV DATABASE_URL=

ENV NODE_ENV=production

RUN chmod +x docker/entrypoint.sh

EXPOSE 3255

ENTRYPOINT ["./docker/entrypoint.sh"]