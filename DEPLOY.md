# Deployment

CI/CD via GitHub Actions. Every push to `main`:

1. Builds `backend` and `frontend` Docker images and pushes them to Docker Hub.
2. Renders a `.env` file from GitHub Secrets.
3. SCPs `docker-compose.yml` + `.env` to the server.
4. SSHs in and runs `docker compose pull && docker compose up -d`.

Only `.env.example` is committed. Real values live in GitHub Secrets and are rendered into the server `.env` at deploy time.

## Architecture

```
push to main
   │
   ▼
GitHub Actions
 ├── build & push  $DOCKER_USERNAME/automation-backend:{sha,latest}   → Docker Hub
 ├── build & push  $DOCKER_USERNAME/automation-frontend:{sha,latest}  → Docker Hub
 │     (NEXT_PUBLIC_API_BASE_URL baked into the bundle as a build-arg)
 └── deploy
       ├── render  .env  from secrets (with IMAGE_TAG=sha-<short>)
       ├── scp     docker-compose.yml + .env  →  $SERVER:~/automation/
       └── ssh     docker compose pull && up -d && image prune
```

Docker Compose auto-loads `.env` from the working directory — no `--env-file` flag, no per-service env files, no duplication. Container environments are populated by `environment:` blocks in [docker-compose.yml](docker-compose.yml) using `${VAR}` interpolation against that single `.env`.

## GitHub Secrets

Settings → Secrets and variables → Actions → **New repository secret**.

| Secret | Used by | Notes |
|---|---|---|
| `DOCKER_USERNAME` | CI + server `.env` | Docker Hub username — also the image namespace |
| `DOCKER_PASSWORD` | CI + server login | Docker Hub → Account Settings → Security → New Access Token |
| `SERVER_HOST` | CI only | `1.2.3.4` or `server.example.com` |
| `SERVER_USER` | CI only | `deploy` (or `ubuntu`, etc.) |
| `SERVER_PORT` | CI only | optional — defaults to `22` |
| `SERVER_SECRET` | CI only | full private key contents (incl. `-----BEGIN…END-----` lines) |
| `POSTGRES_USER` | server `.env` | optional — defaults to `postgres` |
| `POSTGRES_PASSWORD` | server `.env` | **required** — strong random string |
| `POSTGRES_DB` | server `.env` | optional — defaults to `automation` |
| `TELEGRAM_BOT_TOKEN` | server `.env` | **required** — from @BotFather |
| `TELEGRAM_CHAT_ID` | server `.env` | **required** — target chat id |
| `CORS_ORIGIN` | server `.env` | public frontend URL, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | CI build-arg | public backend URL, e.g. `https://api.example.com/api` — baked into the frontend image |

`SERVER_*` and `DOCKER_PASSWORD` stay in GitHub Secrets only (never written to the server). Everything else is rendered into the server `.env`.

## One-time server bootstrap

Fresh Ubuntu/Debian host:

### 1. Create deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
```

### 2. Install Docker engine + compose plugin

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
```

Log out and back in (or `newgrp docker`) so the group change takes effect.

### 3. SSH key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/automation_deploy -C "gh-actions-deploy"
ssh-copy-id -i ~/.ssh/automation_deploy.pub deploy@<server>
```

The **private** key (`~/.ssh/automation_deploy`) goes into the `SERVER_SECRET` GitHub secret (full file contents, including the begin/end lines).

### 4. Firewall

Open `80`/`443` (and whatever your reverse proxy uses). Do **not** expose `5432` — Postgres only listens on the internal Docker network.

If you're temporarily accessing the app without a reverse proxy, also open `3000` (frontend) and `3001` (backend) — but put a proxy in front before going live.

### 5. Initial Prisma migration (one-time)

The backend container runs `prisma migrate deploy` on every start, which requires committed migrations under `backend/prisma/migrations/`. Generate the first one locally **before** the first deploy:

```bash
cd backend
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "chore: initial prisma migration"
```

Migrations are already committed in this repo (`20260417000000_init`, `20260418000000_rich_message_kinds`).

## Local dry-run

Before pushing to `main`, verify the stack boots locally with production-style images:

```bash
cp .env.example .env            # fill in real values
docker compose pull             # or build locally (see below)
docker compose up -d
docker compose ps               # all healthy?
docker compose logs -f backend
```

`docker-compose.yml` does not declare `build:` blocks — it only pulls from Docker Hub. To build locally instead of pulling, temporarily add:

```yaml
  backend:
    build: ./backend
  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE_URL: http://localhost:3001/api
```

## Verifying a deploy

```bash
ssh deploy@<server>
cd ~/automation
docker compose ps
docker compose logs --tail=50 backend
curl -sI http://localhost:3000                    # Next.js
curl -s  http://localhost:3001/api/templates      # NestJS (adjust endpoint)
grep IMAGE_TAG .env                               # should match the latest commit SHA
```

## Rollback

Every deploy writes `IMAGE_TAG=sha-<short>` into `.env`. To roll back:

```bash
ssh deploy@<server>
cd ~/automation
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<old-sha>/' .env
docker compose pull && docker compose up -d
```

The old image must still exist on Docker Hub (free accounts keep images indefinitely by default).

## Out of scope

- **TLS / reverse proxy** — recommended next step. Drop Caddy or Traefik into `docker-compose.yml` in front of `frontend:3000` + `backend:3001` and stop publishing those host ports.
- **Zero-downtime deploys** — current flow has a few seconds of downtime on container recreate.
- **Database backups** — `pgdata` is a named volume. Add a nightly `pg_dump` cron when ready.
- **Staging** — single environment for now; duplicate the workflow with a different branch + secret set when needed.
