#!/usr/bin/env bash
#
# Menu de instalação / manutenção — sempre use a partir da RAIZ do projeto:
#   bash scripts/install.sh
# (Funciona de qualquer pasta; o script localiza a raiz pelo caminho do arquivo.)
#
# Modo automático legado (sem menu):
#   INSTALL_NONINTERACTIVE=1 DOMAIN=... PORT=... DB_USER=... DB_PASS=... DB_NAME=... bash scripts/install.sh
#

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

info() { printf '\033[0;32m[INFO]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[AVISO]\033[0m %s\n' "$*"; }
err() { printf '\033[0;31m[ERRO]\033[0m %s\n' "$*" >&2; }

DEFAULT_DOMAIN="taiseyran.com.br"
DEFAULT_HTTP_PORT="3255"
DEFAULT_DB_USER="enxoval"
DEFAULT_DB_NAME="enxoval"
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PG_PORT="5432"

# --- Utilitários ---

normalize_domain() {
  local d="$1"
  d="${d#https://}"
  d="${d#http://}"
  d="${d%/}"
  echo "$d"
}

valid_port() {
  local p="$1"
  [[ "$p" =~ ^[0-9]+$ ]] && [ "$p" -ge 1 ] && [ "$p" -le 65535 ]
}

# Carrega .env no shell atual (formato compatível com KEY=valor, sem export obrigatório)
load_env_file() {
  if [[ ! -f "$ROOT/.env" ]]; then
    return 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
  return 0
}

ensure_node_tools() {
  command -v node >/dev/null 2>&1 || { err "Instale Node.js 20+."; return 1; }
  command -v npm >/dev/null 2>&1 || { err "npm não encontrado."; return 1; }
  return 0
}

# Extrai domínio de APP_URL ou usa padrão
derive_domain_from_app_url() {
  local u="${APP_URL:-}"
  u="${u#https://}"
  u="${u#http://}"
  u="${u%/}"
  echo "${u:-}"
}

write_env_file() {
  # Variáveis: APP_URL DB_* PORT NODE_ENV JWT ADMIN CERTBOT_*
  {
    echo "# Gerado / atualizado por scripts/install.sh — edite com cuidado"
    printf 'APP_URL=%s\n' "$APP_URL"
    echo ""
    printf 'DB_HOST=%s\n' "$DB_HOST"
    echo "DB_DIALECT=postgres"
    printf 'DB_USER=%s\n' "$DB_USER"
    printf 'DB_PASS=%s\n' "$DB_PASS"
    printf 'DB_NAME=%s\n' "$DB_NAME"
    printf 'DB_PORT=%s\n' "${DB_PORT:-5432}"
    echo ""
    printf 'PORT=%s\n' "$PORT"
    printf 'NODE_ENV=%s\n' "${NODE_ENV:-production}"
    echo ""
    printf 'JWT_SECRET=%s\n' "$JWT_SECRET"
    printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
    echo ""
    printf 'CERTBOT_EMAIL=%s\n' "${CERTBOT_EMAIL:-}"
    printf 'CERTBOT_INCLUDE_WWW=%s\n' "${CERTBOT_INCLUDE_WWW:-1}"
  } > "$ROOT/.env"
  info ".env gravado em $ROOT/.env"
}

backup_env_file() {
  if [[ -f "$ROOT/.env" ]]; then
    local b="$ROOT/.env.bak.$(date +%Y%m%d%H%M%S)"
    cp "$ROOT/.env" "$b"
    info "Backup do .env: $b"
  fi
}

write_nginx_snippet() {
  local domain="${1:?domínio}"
  local http_port="${2:?porta}"
  mkdir -p "$ROOT/deploy"
  local f="deploy/nginx-${domain//./-}.conf"
  cat > "$ROOT/$f" <<NGX
# Gerado por scripts/install.sh — revise antes de copiar para o sistema.
#
# sudo install -m 644 $f /etc/nginx/sites-available/enxoval
# sudo ln -sf /etc/nginx/sites-available/enxoval /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx
#
# SSL (HTTP + PM2 OK; DNS apontando para esta VPS):
#   sudo certbot --nginx -d ${domain} -d www.${domain}
#   (Omita o segundo -d se www não existir no DNS.)

# Bloco HTTP: Certbot costuma duplicar/adicionar server 443; mantenha proxy_pass = PORT do .env
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};

    client_max_body_size 25m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:${http_port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGX
  info "Nginx exemplo: $ROOT/$f (proxy → 127.0.0.1:${http_port})"
}

test_postgres_connection() {
  load_env_file || { err "Crie o .env antes (opção 2 ou 6)."; return 1; }
  local h="${DB_HOST:-localhost}"
  # localhost → 127.0.0.1 evita psql usar ::1 e falhar se pg_hba só trata IPv4
  [[ "$h" == "localhost" ]] && h="127.0.0.1"
  local pg="${DB_PORT:-5432}"
  local u="${DB_USER:?defina DB_USER no .env}"
  local pw="${DB_PASS:?defina DB_PASS no .env}"
  local db="${DB_NAME:?defina DB_NAME no .env}"

  if ! command -v psql >/dev/null 2>&1; then
    err "Comando psql não encontrado. Instale: sudo apt install -y postgresql-client"
    return 1
  fi

  export PGPASSWORD="$pw"
  info "Testando: psql -h $h -p $pg -U \"$u\" -d \"$db\" (USER=role, NAME=banco)"
  local out
  if out="$(psql -h "$h" -p "$pg" -U "$u" -d "$db" -v ON_ERROR_STOP=1 -w -c "SELECT 1 AS ok;" 2>&1)"; then
    info "Conexão PostgreSQL OK (role \"$u\" + banco \"$db\")."
    return 0
  fi
  warn "Falha na conexão:"
  echo "$out"
  echo ""
  if [[ "$u" =~ db$ ]] && [[ "$u" != "$db" ]]; then
    warn "Suspeita: DB_USER=\"$u\" parece nome de BANCO. Troque no .env (opção 4):"
    warn "  DB_USER=enxoval (ou outro role que você criou com CREATE USER)"
    warn "  DB_NAME=$u  ← se o banco se chama \"$u\"; senão ajuste o nome real do banco."
  fi
  warn "DB_USER = papel de login (CREATE USER …); DB_NAME = database (CREATE DATABASE …)."
  warn "Teste manual: PGPASSWORD='…' psql -h 127.0.0.1 -U <role> -d <banco> -c 'SELECT 1'"
  warn "Senha: a do Postgres para esse ROLE — não é ADMIN_PASSWORD do site."
  return 1
}

backup_postgres_database() {
  load_env_file || return 1
  local h="${DB_HOST:-localhost}"
  local pg="${DB_PORT:-5432}"
  local u="${DB_USER:?}"
  local db="${DB_NAME:?}"

  if ! command -v pg_dump >/dev/null 2>&1; then
    err "pg_dump não encontrado. Instale: sudo apt install -y postgresql-client"
    return 1
  fi

  mkdir -p "$ROOT/backups"
  export PGPASSWORD="${DB_PASS:?}"
  local fn="$ROOT/backups/pg_${db}_$(date +%Y%m%d_%H%M%S).sql.gz"
  info "Gerando backup (pode pedir confirmação se houver aviso do servidor)…"
  if pg_dump -h "$h" -p "$pg" -U "$u" -d "$db" | gzip > "$fn"; then
    info "Backup salvo: $fn"
    return 0
  fi
  err "Falha no pg_dump (verifique credenciais com opção 5)."
  return 1
}

show_p1000_help() {
  cat <<'HELP'

═══ Erro P1000 (autenticação PostgreSQL) ═══
Dois campos diferentes no .env:
  DB_USER  → ROLE de login (comando psql -U …). Ex.: enxoval
  DB_NAME  → nome do BANCO (psql -d …).       Ex.: enxoval ou enxovaldb

Erro comum: colocar o nome do banco (ex.: enxovaldb) em DB_USER. O correto é
criar um usuário curto (enxoval) e o banco pode se chamar enxovaldb.

• DB_PASS = senha desse ROLE no Postgres, não ADMIN_PASSWORD do painel web.

Exemplo no servidor (role enxoval, banco enxovaldb):

    sudo -u postgres psql

    CREATE USER enxoval WITH PASSWORD 'mes_sql_igual_ao_DB_PASS';
    CREATE DATABASE enxovaldb OWNER enxoval;
    GRANT ALL PRIVILEGES ON DATABASE enxovaldb TO enxoval;
    \\c enxovaldb
    GRANT ALL ON SCHEMA public TO enxoval;
    GRANT CREATE ON SCHEMA public TO enxoval;
    \\q

No .env:
    DB_USER=enxoval
    DB_NAME=enxovaldb
    DB_PASS=mes_sql_igual_ao_DB_PASS

Teste:
    PGPASSWORD='…' psql -h 127.0.0.1 -U enxoval -d enxovaldb -c 'SELECT 1'

Migrações (raiz do projeto):
    cd /home/deploy/enxoval-de-casamento && npm run db:migrate:deploy

HELP
}

# Lê DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT de um .env (sem executar o arquivo).
import_db_vars_from_env_file() {
  local f="$1" line k v
  local t_HOST="" t_USER="" t_PASS="" t_NAME="" t_PORT=""
  [[ -f "$f" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    [[ "$line" == *=* ]] || continue
    k="${line%%=*}"
    v="${line#*=}"
    k="${k%"${k##*[![:space:]]}"}"
    v="${v#"${v%%[![:space:]]*}"}"
    v="${v%"${v##*[![:space:]]}"}"
    v="${v%$'\r'}"
    if [[ "${v:0:1}" == '"' && "${v: -1}" == '"' ]]; then
      v="${v:1:-1}"
    elif [[ "${v:0:1}" == "'" && "${v: -1}" == "'" ]]; then
      v="${v:1:-1}"
    fi
    case "$k" in
      DB_HOST) t_HOST="$v" ;;
      DB_USER) t_USER="$v" ;;
      DB_PASS) t_PASS="$v" ;;
      DB_NAME) t_NAME="$v" ;;
      DB_PORT) t_PORT="$v" ;;
    esac
  done < "$f"
  [[ -n "$t_USER" && -n "$t_PASS" && -n "$t_NAME" ]] || return 1
  DB_HOST="${t_HOST:-localhost}"
  DB_USER="$t_USER"
  DB_PASS="$t_PASS"
  DB_NAME="$t_NAME"
  DB_PORT="${t_PORT:-5432}"
  return 0
}

# $1 = "fresh" → não carrega .env antigo como padrão (só opção 1, após confirmação)
prompt_new_env_interactive() {
  local d p u pw n h pg dom_default oldce import_done _ok envpath
  local _fresh_mode="${1:-}"
  import_done=0

  if [[ "$_fresh_mode" == "fresh" ]]; then
    info "Modo substituir tudo: perguntas usam só padrões do script (não o .env antigo)."
  elif load_env_file 2>/dev/null; then
    info "Encontrei um .env nesta pasta. Em cada pergunta, tecle só [Enter] para manter o valor atual."
  fi

  subsection "1/5 — Site público (domínio)"
  hint "Isto vira APP_URL=https://... no .env (links, cookies, SEO)."
  hint "Digite o domínio como as pessoas acessam, mas SEM \"https://\"."
  hint "Exemplo: taiseyran.com.br"
  dom_default="$(derive_domain_from_app_url)"
  dom_default="${dom_default:-$DEFAULT_DOMAIN}"
  echo ""
  read -rp "  Domínio [$dom_default]: " d
  d="$(normalize_domain "${d:-$dom_default}")"
  DOMAIN="$d"
  APP_URL="https://${DOMAIN}"
  info "APP_URL definida como: $APP_URL"

  subsection "2/5 — Porta do Node.js (HTTP interno)"
  hint "O Nginx na internet encaminha para 127.0.0.1:PORT — o visitante NÃO vê esta porta."
  hint "Escolha um número livre no servidor (ex.: 3255, 3010, 3255). Deve ser a mesma no Nginx (arquivo em deploy/)."
  hint "Se outro programa já usar a porta, o app pode subir na próxima livre — melhor evitar conflito escolhendo uma porta vazia."
  echo ""
  read -rp "  PORT (Node) [${PORT:-$DEFAULT_HTTP_PORT}]: " p
  p="${p:-${PORT:-$DEFAULT_HTTP_PORT}}"
  valid_port "$p" || { err "Use um número entre 1 e 65535."; return 1; }
  PORT="$p"

  subsection "3/5 — PostgreSQL (banco de dados)"
  hint "O teste e o .env usam APENAS o que você definir AQUI (ou importar abaixo) — não puxa sozinho o .env do Multivus/outro app."
  hint "Se apareceu \"enxovaluser\" no erro, foi porque digitou isso nas perguntas; não tem relação com outro projeto."
  echo ""
  hint "Já tem um .env que funciona nesta VPS (ex.: Multivus em /home/deploy/...)?"
  hint "Cole o caminho ABSOLUTO do arquivo — importamos só DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT."
  read -rp "  Caminho do .env [Enter = digitar tudo à mão]: " envpath
  envpath="${envpath/#\~/$HOME}"
  envpath="${envpath//\"/}"
  if [[ -n "$envpath" ]]; then
    if [[ ! -f "$envpath" ]]; then
      warn "Arquivo não encontrado: $envpath — preencha manualmente."
    elif import_db_vars_from_env_file "$envpath"; then
      echo ""
      echo "     Importado de: $envpath"
      echo "       DB_USER=$DB_USER  DB_NAME=$DB_NAME  DB_HOST=$DB_HOST  DB_PORT=$DB_PORT"
      echo ""
      hint "Reutilizar o MESMO DB_NAME de outra aplicação pode gerar conflito de tabelas."
      hint "Melhor: mesmo DB_USER/DB_PASS mas CREATE DATABASE enxovaldb só para este site."
      read -rp "  Usar estes valores (S) ou digitar outro manualmente (n)? [S/n]: " _ok
      if [[ ! "${_ok:-S}" =~ ^[nN] ]]; then
        import_done=1
        info "Postgres: usando credenciais importadas."
      fi
    else
      warn "Não achei DB_USER, DB_PASS e DB_NAME válidos em $envpath."
    fi
  fi

  if [[ "$import_done" != "1" ]]; then
    hint "Você escolhe as senhas. DB_PASS deve ser IGUAL à do CREATE USER no Postgres."
    echo ""
    hint "DB_USER  = LOGIN no Postgres (psql -U …). Ex.: multivus ou enxoval"
    hint "DB_NAME  = nome do BANCO (psql -d …). Ex.: multivus_db ou enxovaldb"
    hint "Erro comum: trocar USER com NAME (ex. nome do banco no campo usuário)."
    echo ""
    read -rp "  DB_USER — role/login Postgres [${DB_USER:-$DEFAULT_DB_USER}]: " u
    DB_USER="${u:-${DB_USER:-$DEFAULT_DB_USER}}"
    echo ""
    hint "Senha desse usuário no Postgres (não é ADMIN_PASSWORD do site)."
    read -rsp "  DB_PASS [oculto]: " pw
    echo
    [[ -n "$pw" ]] || { err "DB_PASS não pode ser vazia."; return 1; }
    DB_PASS="$pw"
    echo ""
    read -rp "  DB_NAME — nome do database [${DB_NAME:-$DEFAULT_DB_NAME}]: " n
    DB_NAME="${n:-${DB_NAME:-$DEFAULT_DB_NAME}}"
    echo ""
    read -rp "  DB_HOST — onde o Postgres escuta [${DB_HOST:-$DEFAULT_DB_HOST}]: " h
    DB_HOST="${h:-${DB_HOST:-$DEFAULT_DB_HOST}}"
    echo ""
    read -rp "  DB_PORT — porta do Postgres (quase sempre 5432) [${DB_PORT:-$DEFAULT_DB_PG_PORT}]: " pg
    DB_PORT="${pg:-${DB_PORT:-$DEFAULT_DB_PG_PORT}}"
  fi

  subsection "4/5 — Painel administrativo e assinatura JWT"
  if [[ -z "${JWT_SECRET:-}" ]]; then
    if command -v openssl >/dev/null 2>&1; then
      JWT_SECRET="$(openssl rand -hex 32)"
      hint "JWT_SECRET: gerada automaticamente (chave longa para assinar tokens de login)."
      hint "Pode ignorar — não precisa decorar. Se quiser definir à mão, edite o .env depois."
    else
      JWT_SECRET="altere_esta_jwt_secret_no_env"
      warn "openssl não encontrado; JWT_SECRET placeholder — altere no .env em produção."
    fi
  else
    hint "JWT_SECRET já existe no .env; mantida (não é senha humana, é segredo técnico)."
  fi
  echo ""
  hint "ADMIN_PASSWORD = senha que você ESCOLHE para entrar no painel do site."
  hint "Login (e-mail fixo no código): sistemazapzap@gmail.com — use junto com esta senha."
  hint "Pode ser diferente da senha do Postgres (DB_PASS)."
  read -rsp "  ADMIN_PASSWORD [Enter mantém a do .env, se já existir]: " _adm
  echo
  if [[ -n "${_adm}" ]]; then
    ADMIN_PASSWORD="$_adm"
  fi
  if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
    err "Defina uma ADMIN_PASSWORD (obrigatória para o primeiro acesso ao painel)."
    return 1
  fi

  subsection "5/5 — HTTPS (Let's Encrypt) — usado no final da opção 1"
  hint "E-mail para termos da Let's Encrypt (não aparece no site). Enter vazio = não rodar Certbot (site só HTTP)."
  if [[ "$_fresh_mode" != "fresh" ]] && [[ -f "$ROOT/.env" ]]; then
    oldce="$(grep -m1 '^CERTBOT_EMAIL=' "$ROOT/.env" 2>/dev/null | cut -d= -f2- || true)"
    oldce="${oldce//$'\r'/}"
    [[ -n "$oldce" && -z "${CERTBOT_EMAIL:-}" ]] && CERTBOT_EMAIL="$oldce"
  fi
  echo ""
  read -rp "  CERTBOT_EMAIL [${CERTBOT_EMAIL:-}]: " _em
  CERTBOT_EMAIL="${_em:-${CERTBOT_EMAIL:-}}"
  echo ""
  read -rp "  Incluir www no certificado? (precisa de DNS www apontando para esta VPS) [S/n]: " _www
  if [[ "${_www:-S}" =~ ^[nN] ]]; then
    CERTBOT_INCLUDE_WWW=0
  else
    CERTBOT_INCLUDE_WWW=1
  fi

  NODE_ENV="${NODE_ENV:-production}"

  echo ""
  info "Resumo: domínio=$DOMAIN  PORT=$PORT  Postgres=${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    info "Certbot usará: $CERTBOT_EMAIL  www=$([[ "${CERTBOT_INCLUDE_WWW:-1}" == "1" ]] && echo sim || echo não)"
  else
    info "Certbot — pulado (sem e-mail): site ficará em HTTP até você rodar certbot manualmente."
  fi
}

menu_change_domain_port() {
  load_env_file || { err "Não há .env aqui. Use a opção 2 do menu para criar um."; return 1; }
  local dom cur
  subsection "Alterar só domínio e porta HTTP"
  hint "DB_USER, DB_PASS, JWT etc. permanecem iguais."
  hint "Depois desta opção, regenere/copie o Nginx em deploy/ e ajuste Certbot se o domínio mudou."
  cur="$(derive_domain_from_app_url)"
  echo ""
  read -rp "  Novo domínio (sem https) [$cur]: " dom
  dom="$(normalize_domain "${dom:-$cur}")"
  APP_URL="https://${dom}"
  echo ""
  read -rp "  Nova PORT do Node (Nginx aponta para 127.0.0.1:PORT) [${PORT:-3255}]: " p
  p="${p:-${PORT:-3255}}"
  valid_port "$p" || return 1
  PORT="$p"
  backup_env_file
  write_env_file
  write_nginx_snippet "$dom" "$PORT"
}

menu_change_database_only() {
  load_env_file || { err "Não há .env nesta pasta."; return 1; }
  subsection "Alterar só PostgreSQL no .env"
  hint "Valores atuais (confira se batem com CREATE USER / CREATE DATABASE no servidor):"
  echo "     DB_USER (login) = ${DB_USER:-?}"
  echo "     DB_NAME (banco) = ${DB_NAME:-?}"
  echo "     DB_HOST         = ${DB_HOST:-?}"
  echo "     DB_PORT         = ${DB_PORT:-5432}"
  hint "Importar DB_* de outro .env (ex. Multivus)? Enter vazio = editar campo a campo."
  local _ip
  read -rp "  Caminho absoluto do .env [Enter=pular]: " _ip
  _ip="${_ip/#\~/$HOME}"
  _ip="${_ip//\"/}"
  if [[ -n "$_ip" ]] && [[ -f "$_ip" ]] && import_db_vars_from_env_file "$_ip"; then
    info "Importado de $_ip — gravando…"
    backup_env_file
    write_env_file
    info "Pronto. Opção 5 para testar."
    return 0
  fi
  hint "Lembrete: DB_USER é o login; DB_NAME é o banco."
  echo ""
  read -rp "  DB_USER [${DB_USER:-enxoval}]: " u
  DB_USER="${u:-${DB_USER:-enxoval}}"
  echo ""
  read -rsp "  DB_PASS (senha do role no Postgres, igual ao CREATE USER): " DB_PASS
  echo
  read -rp "  DB_NAME [${DB_NAME:-enxoval}]: " n
  DB_NAME="${n:-${DB_NAME:-enxoval}}"
  echo ""
  read -rp "  DB_HOST [${DB_HOST:-127.0.0.1}]: " h
  DB_HOST="${h:-${DB_HOST:-127.0.0.1}}"
  echo ""
  read -rp "  DB_PORT [${DB_PORT:-5432}]: " pg
  DB_PORT="${pg:-${DB_PORT:-5432}}"
  backup_env_file
  write_env_file
  info "Arquivo .env atualizado. Use a opção 5 (teste de conexão) antes da 7 (migrações)."
}

# Domínio e porta a partir do .env (APP_URL / PORT)
load_domain_port_from_env() {
  load_env_file 2>/dev/null || return 1
  DOMAIN="$(derive_domain_from_app_url)"
  PORT="${PORT:-3255}"
  [[ -n "$DOMAIN" ]]
}

nginx_generated_path() {
  local dom="${1:?}"
  echo "deploy/nginx-${dom//./-}.conf"
}

# ─── Opção 1: publicação automática (sudo) após migrate + build ───

run_copy_nginx_system_auto() {
  load_domain_port_from_env || return 1
  local gen
  gen="$(nginx_generated_path "$DOMAIN")"
  [[ -f "$ROOT/$gen" ]] || { warn "Falta gerar $gen"; return 1; }
  command -v sudo >/dev/null 2>&1 || { warn "sudo não encontrado"; return 1; }
  info "Copiando Nginx para /etc (sudo)…"
  sudo install -m 644 "$ROOT/$gen" /etc/nginx/sites-available/nosso-enxoval &&
    sudo ln -sf /etc/nginx/sites-available/nosso-enxoval /etc/nginx/sites-enabled/nosso-enxoval &&
    sudo nginx -t &&
    sudo systemctl reload nginx &&
    info "Nginx ativo — proxy → 127.0.0.1:${PORT}" ||
    { warn "Falha ao configurar Nginx (veja mensagem acima)."; return 1; }
  return 0
}

ensure_pm2_global() {
  command -v pm2 >/dev/null 2>&1 && return 0
  info "Instalando PM2 globalmente (sudo npm)…"
  sudo npm install -g pm2 || { warn "Não foi possível instalar PM2."; return 1; }
  return 0
}

run_pm2_auto() {
  cd "$ROOT" || return 1
  ensure_pm2_global || return 1
  info "Iniciando aplicação com PM2…"
  if pm2 describe enxoval >/dev/null 2>&1; then
    NODE_ENV=production pm2 reload ecosystem.config.cjs
  else
    NODE_ENV=production pm2 start ecosystem.config.cjs
  fi
  pm2 save 2>/dev/null || true
  info "PM2: processo \"enxoval\" rodando. Use \"pm2 startup\" se ainda não configurou boot."
  return 0
}

run_certbot_auto() {
  [[ -n "${CERTBOT_EMAIL:-}" ]] || { info "Sem CERTBOT_EMAIL — pulando HTTPS automático."; return 0; }
  load_domain_port_from_env || return 1
  if ! command -v certbot >/dev/null 2>&1; then
    info "Instalando Certbot (sudo apt)…"
    sudo apt-get update -qq &&
      sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx ||
      { warn "Falha ao instalar certbot."; return 1; }
  fi
  info "Emitindo certificado Let's Encrypt (sudo certbot)…"
  local cbcmd=(sudo certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect -d "$DOMAIN")
  if [[ "${CERTBOT_INCLUDE_WWW:-1}" == "1" ]]; then
    cbcmd+=(-d "www.$DOMAIN")
  fi
  if "${cbcmd[@]}"; then
    info "HTTPS configurado."
    sync_env_https_app_url || true
    NODE_ENV=production pm2 reload ecosystem.config.cjs 2>/dev/null || true
    return 0
  fi
  warn "Certbot falhou (DNS, firewall ou limite). Site pode ficar em HTTP; corrija e rode certbot manualmente."
  return 1
}

# Atualiza APP_URL=https após certificado
sync_env_https_app_url() {
  load_env_file || return 1
  DOMAIN="$(derive_domain_from_app_url)"
  APP_URL="https://${DOMAIN}"
  write_env_file
  info ".env → APP_URL=$APP_URL"
}

deploy_production_stack_auto() {
  subsection "Publicando site (automático — usa sudo)"
  hint "Ordem: Nginx → PM2 → (opcional) Certbot. Exige senha de sudo se necessário."
  run_copy_nginx_system_auto || warn "Nginx não aplicado — o site pode não abrir pelo domínio."
  run_pm2_auto || warn "PM2 não subiu — Node não está servindo na PORT."
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    run_certbot_auto || true
  else
    hint "HTTPS: defina CERTBOT_EMAIL no .env e rode: sudo certbot --nginx -d seu-dominio"
  fi
  echo ""
  load_domain_port_from_env 2>/dev/null || true
  info "Teste: http://${DOMAIN:-seu-dominio}/ — após Certbot, https://${DOMAIN:-}/"
}

offer_copy_nginx_to_system() {
  subsection "Nginx no Ubuntu (copiar config para o sistema — opcional)"
  hint "Até agora só existe o ARQUIVO dentro do projeto (pasta deploy/). O Nginx do sistema não muda sozinho."
  load_domain_port_from_env || { warn "Sem .env; não é possível localizar domínio."; return 1; }
  local gen
  gen="$(nginx_generated_path "$DOMAIN")"
  if [[ ! -f "$ROOT/$gen" ]]; then
    warn "Gere de novo: opção 2 ou 3 (snippet Nginx). Esperado: $ROOT/$gen"
    return 1
  fi
  hint "Origem:  $ROOT/$gen"
  hint "Destino sugerido: /etc/nginx/sites-available/nosso-enxoval"
  echo ""
  read -rp "  Copiar para /etc/nginx, ativar site e recarregar (pedirá senha sudo)? [s/N]: " ans
  if [[ ! "${ans:-}" =~ ^[sSyY] ]]; then
    echo "Manualmente:"
    echo "  sudo install -m 644 \"$ROOT/$gen\" /etc/nginx/sites-available/nosso-enxoval"
    echo "  sudo ln -sf /etc/nginx/sites-available/nosso-enxoval /etc/nginx/sites-enabled/nosso-enxoval"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
    return 0
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    warn "sudo não encontrado."
    return 1
  fi
  sudo install -m 644 "$ROOT/$gen" /etc/nginx/sites-available/nosso-enxoval &&
    sudo ln -sf /etc/nginx/sites-available/nosso-enxoval /etc/nginx/sites-enabled/nosso-enxoval &&
    sudo nginx -t &&
    sudo systemctl reload nginx &&
    info "Nginx do sistema atualizado (proxy → 127.0.0.1:${PORT})." ||
    warn "Falhou. Rode os comandos \"Manualmente\" acima e leia a mensagem do nginx -t."
}

offer_pm2_start() {
  subsection "PM2 — manter o Node rodando (opcional)"
  hint "Precisa: sudo npm i -g pm2 (se ainda não instalou)."
  echo ""
  read -rp "  Iniciar (ou recarregar) a app com PM2 nesta pasta? [s/N]: " ans
  if [[ ! "${ans:-}" =~ ^[sSyY] ]]; then
    echo "Manualmente:"
    echo "  cd \"$ROOT\" && NODE_ENV=production pm2 start ecosystem.config.cjs"
    echo "  pm2 save"
    echo "  pm2 startup systemd -u \"\$USER\" --hp \"\$HOME\""
    return 0
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    warn "PM2 não está no PATH. Instale: sudo npm install -g pm2"
    return 1
  fi
  cd "$ROOT" || return 1
  if pm2 describe enxoval >/dev/null 2>&1; then
    info "Processo \"enxoval\" já existe — recarregando…"
    NODE_ENV=production pm2 reload ecosystem.config.cjs
  else
    NODE_ENV=production pm2 start ecosystem.config.cjs
  fi
  info "PM2 atualizado. Recomendado: pm2 save && pm2 startup (veja README)."
}

print_certbot_instructions() {
  subsection "HTTPS com Certbot (sempre manual — e-mail e termos)"
  load_domain_port_from_env 2>/dev/null || true
  local dom="${DOMAIN:-taiseyran.com.br}"
  hint "Só depois de http://$dom abrir o site sem erro (Nginx + PM2 + Node)."
  echo ""
  echo "  sudo apt install -y certbot python3-certbot-nginx"
  echo "  sudo certbot --nginx -d $dom -d www.$dom"
  echo ""
  hint "Se não tiver registro DNS para www, use apenas: sudo certbot --nginx -d $dom"
  hint "Depois ajuste APP_URL=https://... no .env se ainda estiver http."
}

install_stopped_after_postgres() {
  subsection "Instalação parou no PostgreSQL (migrate NÃO foi executado)"
  hint "Isto é normal se a senha no .env ainda não bate com o CREATE USER no servidor."
  echo ""
  hint "Já foi feito nesta sessão:"
  hint "  • .env gravado em $ROOT/.env (APP_URL, PORT, DB_*)"
  hint "  • Arquivo Nginx de exemplo em $ROOT/$(nginx_generated_path "${DOMAIN:-?}")"
  hint "  • npm install concluído"
  echo ""
  hint "Próximos passos:"
  hint "  1) No servidor: ALTER USER (ou crie usuário/banco — opção 10 deste menu)."
  hint "  2) Aqui: opção 5 (testar Postgres) → opção 7 (migrate) → opção 9 (build)."
  hint "  3) Com build OK: copie Nginx, PM2, Certbot (menu ou comandos abaixo)."
  echo ""
  offer_copy_nginx_to_system
  print_certbot_instructions
}

install_complete_followup() {
  deploy_production_stack_auto
}

full_install_flow() {
  ensure_node_tools || return 1

  subsection "Opção 1 — até o site no ar"
  hint "Fluxo: perguntas (incl. e-mail Let's Encrypt) → .env + Nginx em deploy/ → npm install."
  hint "Se Postgres OK: migrate + build → em seguida, com sudo: Nginx no sistema, PM2, Certbot."
  hint "Requisitos: DNS → esta VPS; Postgres com usuário/senha certos; conta sudo na VPS."
  echo ""

  local _fresh_arg=
  if [[ -f "$ROOT/.env" ]]; then
    warn "Já existe $ROOT/.env (instalação ou teste anterior)."
    hint "Responder \"s\" = recomeçar do zero: [Enter] nas perguntas NÃO mantém DB/domínio antigos — só os padrões do assistente."
    read -rp "  Substituir configuração antiga nas perguntas (instalar como primeira vez)? [s/N]: " _fresh
    if [[ "${_fresh:-}" =~ ^[sSyY] ]]; then
      _fresh_arg=fresh
      backup_env_file
      info "Backup do .env anterior feito. Preencha tudo de novo (Postgres, domínio, senhas)."
    fi
  fi

  prompt_new_env_interactive "$_fresh_arg" || return 1
  if [[ -z "$_fresh_arg" ]]; then
    backup_env_file
  fi
  write_env_file
  write_nginx_snippet "$DOMAIN" "$PORT"

  info "Dependências npm…"
  npm install || return 1

  info "Testando Postgres antes das migrações…"
  if ! test_postgres_connection; then
    install_stopped_after_postgres
    return 1
  fi

  info "Migrações (criar/atualizar tabelas no banco)…"
  npm run db:migrate:deploy || return 1
  info "Build (frontend em dist/)…"
  npm run build || return 1
  info "Pacote de aplicação pronto."
  install_complete_followup
}

run_migrate_only() {
  ensure_node_tools || return 1
  load_env_file || return 1
  if ! test_postgres_connection; then
    return 1
  fi
  npm run db:migrate:deploy
}

# Modo não-interativo (CI)
legacy_auto_install() {
  set -e
  ensure_node_tools
  DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
  DOMAIN="$(normalize_domain "$DOMAIN")"
  PORT="${PORT:-$DEFAULT_HTTP_PORT}"
  valid_port "$PORT" || err "PORT inválida"
  APP_URL="https://${DOMAIN}"
  DB_USER="${DB_USER:-$DEFAULT_DB_USER}"
  DB_PASS="${DB_PASS:?DB_PASS obrigatória}"
  DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
  DB_HOST="${DB_HOST:-$DEFAULT_DB_HOST}"
  DB_PORT="${DB_PORT:-$DEFAULT_DB_PG_PORT}"
  JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD obrigatória}"
  NODE_ENV="${NODE_ENV:-production}"
  CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
  CERTBOT_INCLUDE_WWW="${CERTBOT_INCLUDE_WWW:-1}"
  backup_env_file
  write_env_file
  [[ -z "${SKIP_NGINX_SNIPPET:-}" ]] && write_nginx_snippet "$DOMAIN" "$PORT"
  [[ -z "${SKIP_NPM:-}" ]] && npm install
  if [[ -z "${SKIP_MIGRATE:-}" ]]; then
    export PGPASSWORD="$DB_PASS"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -w -c "SELECT 1" >/dev/null || err "Postgres inacessível — verifique credenciais."
    npm run db:migrate:deploy
  fi
  [[ -z "${SKIP_BUILD:-}" ]] && npm run build
  if [[ -z "${SKIP_DEPLOY:-}" ]]; then
    deploy_production_stack_auto || true
  fi
  info "Concluído."
}

subsection() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo " $1"
  echo "═══════════════════════════════════════════════════════════════"
}

hint() {
  echo "  → $*"
}

show_banner() {
  cat <<BAN
╔══════════════════════════════════════════════════════════════╗
║           Nosso Enxoval — assistente de instalação            ║
╠══════════════════════════════════════════════════════════════╣
║  Pasta do projeto (raiz):                                     ║
║    $ROOT
║                                                               ║
║  Como executar (de qualquer lugar):                           ║
║    cd \"$ROOT\"                                               ║
║    bash scripts/install.sh                                    ║
║                                                               ║
║  Não precisa dar chmod +x. Não use caminho relativo errado    ║
║  (ex.: dentro de scripts/ rodar bash scripts/install.sh).     ║
╚══════════════════════════════════════════════════════════════╝
BAN
}

# --- Menu principal ---

if [[ "${1:-}" == "--auto" ]] || [[ -n "${INSTALL_NONINTERACTIVE:-}" ]]; then
  legacy_auto_install
  exit $?
fi

if ! [ -t 0 ]; then
  warn "Stdin não é terminal; inicie com INSTALL_NONINTERACTIVE=1 ou --auto."
  exit 1
fi

show_banner

while true; do
  echo ""
  echo "┌── Menu principal ────────────────────────────────────────────────────"
  echo "│"
  echo "│  1) Instalação completa até o site publicado"
  echo "│     .env + deploy/nginx-*.conf + npm install + (se Postgres OK) migrate + build."
  echo "│     Se já houver .env: pergunta se substitui tudo (s = não reaproveita DB/domínio antigos)."
  echo "│     Depois, automaticamente com sudo: Nginx no sistema, PM2, Certbot (se informou e-mail)."
  echo "│     Se o Postgres falhar, pare antes do migrate — corrija e use 5 → 7 → 9 → 11."
  echo "│"
  echo "│  2) Só .env + arquivo Nginx (sem npm / sem migrate / sem build)"
  echo "│     Mesmas perguntas da opção 1, mas só atualiza configuração em disco."
  echo "│     Útil para corrigir domínio/porta/DB antes de rodar 5 e 7 manualmente."
  echo "│"
  echo "│  3) Só trocar domínio público e PORT do Node"
  echo "│     Não mexe em Postgres, JWT nem admin. Regera snippet Nginx."
  echo "│"
  echo "│  4) Só trocar dados do PostgreSQL no .env"
  echo "│     DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT — use após P1000 ou mudança de senha."
  echo "│"
  echo "│  5) Testar conexão com o Postgres (lê .env, usa psql)"
  echo "│     Confirma se senha e nomes estão certos ANTES de migrar. Requer: postgresql-client"
  echo "│"
  echo "│  6) Backup do banco atual (pg_dump comprimido em backups/)"
  echo "│     Antes de migrate arriscado ou mudança grande. Requer: postgresql-client"
  echo "│"
  echo "│  7) Só aplicar migrações do Prisma (npm run db:migrate:deploy)"
  echo "│     Roda teste da opção 5 primeiro; falha se Postgres não autenticar."
  echo "│"
  echo "│  8) npm install"
  echo "│  9) npm run build (frontend de produção em dist/)"
  echo "│"
  echo "│ 10) Ajuda em texto: erro P1000, diferença DB_USER vs DB_NAME, SQL exemplo"
  echo "│"
  echo "│ 11) Só infra no servidor: copiar Nginx (sudo) + PM2 + instruções Certbot"
  echo "│     Use após migrate + build já terem dado certo (ou enquanto testa só HTTP)."
  echo "│"
  echo "│  0) Sair"
  echo "└──────────────────────────────────────────────────────────────────────"
  read -rp "Digite o número da opção [0-11]: " choice

  case "$choice" in
    1) full_install_flow || true ;;
    2)
      ensure_node_tools || true
      prompt_new_env_interactive || true
      backup_env_file
      write_env_file
      write_nginx_snippet "$DOMAIN" "$PORT"
      info "Próximo passo: opção 5 → 7, ou 1 se ainda não rodou npm install."
      ;;
    3) menu_change_domain_port || true ;;
    4) menu_change_database_only || true ;;
    5) test_postgres_connection || true ;;
    6) backup_postgres_database || true ;;
    7) run_migrate_only || true ;;
    8) ensure_node_tools && npm install || true ;;
    9) ensure_node_tools && npm run build || true ;;
    10) show_p1000_help ;;
    11)
      if load_env_file 2>/dev/null; then
        offer_copy_nginx_to_system || true
        offer_pm2_start || true
        print_certbot_instructions
      else
        err "Sem .env nesta pasta. Use a opção 2 ou rode a partir da raiz do clone."
      fi
      ;;
    0|"")
      info "Até logo."
      exit 0
      ;;
    *)
      warn "Opção inválida."
      ;;
  esac
done
