/**
 * PM2 — produção (Node sobe o Express + assets estáticos do Vite build).
 *
 * Requisitos: `npm install` e `npm run build` na mesma pasta; `.env` na raiz
 * (o server.ts carrega com dotenv a partir do cwd).
 *
 * Uso típico na VPS:
 *   cd /home/deploy/enxoval-de-casamento
 *   NODE_ENV=production pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup systemd -u $USER --hp $HOME
 *
 * Atualizar após deploy:
 *   npm run build && pm2 reload enxoval
 */
const path = require("path");

const root = path.resolve(__dirname);
const tsx = path.join(root, "node_modules", ".bin", "tsx");

module.exports = {
  apps: [
    {
      name: "enxoval",
      cwd: root,
      script: "server.ts",
      interpreter: tsx,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 15,
      min_uptime: "5s",
      max_memory_restart: "512M",
      error_file: path.join(root, "logs", "pm2-error.log"),
      out_file: path.join(root, "logs", "pm2-out.log"),
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
