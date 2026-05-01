# Deployment

CI/CD via GitHub Actions. Every push to `main` (or manual `workflow_dispatch`):

1. Builds `backend` and `frontend` Docker images and pushes them to Docker Hub with a fixed `:tag20` tag.
2. Renders a backend `.env` file from GitHub Secrets.
3. SCPs `docker-compose.yml` + `.env` to `/home/$SERVER_USER` on the server.
4. SSHs in, exports Postgres + Docker Hub vars into the shell, and runs `docker compose pull && docker compose up -d`.

Only `.env.example` is committed. Real values live in GitHub Secrets.

## Architecture

```
push to main
   │
   ▼
GitHub Actions
 ├── build & push  $DOCKER_USERNAME/automation-backend:tag20   → Docker Hub
 ├── build & push  $DOCKER_USERNAME/automation-frontend:tag20  → Docker Hub
 │     (NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api baked in as build-arg)
 └── deploy
       ├── render  .env  (backend runtime)  from secrets
       ├── scp     docker-compose.yml + .env  →  /home/$SERVER_USER/
       └── ssh     export POSTGRES_* + DOCKER_USERNAME, docker compose pull && up -d
```

### How env vars flow at deploy time

| Var | Source on server | Consumer |
|---|---|---|
| `DOCKER_USERNAME` | shell env (exported over SSH) | compose interpolation for image names |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | shell env (exported over SSH) | compose interpolation → postgres container `environment:` |
| `NODE_ENV`, `PORT`, `DATABASE_URL`, `TELEGRAM_*`, `CORS_ORIGIN` | `.env` file | backend container via `env_file: .env` |
| `NODE_ENV`, `PORT`, `HOSTNAME` | compose `environment:` block | frontend container (static values) |
| `NEXT_PUBLIC_API_BASE_URL` | baked into frontend image at build time | browser bundle |

## GitHub Secrets

Settings → Secrets and variables → Actions → **New repository secret**.

| Secret | Required? | Notes |
|---|---|---|
| `DOCKER_USERNAME` | ✅ | Docker Hub username — also the image namespace |
| `DOCKER_PASSWORD` | ✅ | Docker Hub access token (read/write/delete) |
| `SERVER_HOST` | ✅ | `1.2.3.4` or `server.example.com` |
| `SERVER_USER` | ✅ | `deploy` (or `ubuntu`, etc.) |
| `SERVER_PORT` | optional | defaults to `22` |
| `SERVER_SECRET` | ✅ | full private key contents (incl. `-----BEGIN…END-----`) |
| `POSTGRES_USER` | optional | defaults to `postgres` |
| `POSTGRES_PASSWORD` | ✅ | strong random string |
| `POSTGRES_DB` | optional | defaults to `automation` |
| `TELEGRAM_BOT_TOKEN` | ✅ | from @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ | target chat id |
| `CORS_ORIGIN` | optional | defaults to `http://localhost:3000` |

`NEXT_PUBLIC_API_BASE_URL` is **not** a secret anymore — it's hardcoded to `http://localhost:3001/api` in the workflow build-args.

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

Open ports `80` (HTTP, used for the ACME challenge and redirect) and `443` (HTTPS) on the host. `3000`/`3001`/`5432` stay closed — they only exist on the internal Docker network and are reached through nginx.

### 5. Initial Prisma migration

Migrations are committed at [backend/prisma/migrations/](backend/prisma/migrations/) and applied by the backend container on every start (`prisma migrate deploy`). No manual step required for subsequent deploys.

### 6. TLS certificate

Fully automatic. DNS for `automation.alialahmad.com` must already point to the server before the first `docker compose up`. After that, the `certbot-init` service in [docker-compose.yml](docker-compose.yml):

1. On every `compose up`, checks the `certbot-etc` volume for an existing valid cert.
2. If one exists → exits 0 immediately (no Let's Encrypt traffic, no rate-limit risk).
3. If not → binds port 80 itself (nginx is held back via `depends_on: service_completed_successfully`), runs the standalone HTTP-01 challenge, writes the cert to the volume, exits.

Then nginx starts and the long-running `certbot` service renews every 12h via webroot. Nginx reloads itself every 6h to pick up renewed certs.

**Test against Let's Encrypt staging first** to avoid the 5-duplicates-per-week production rate limit:

```bash
CERT_STAGING=1 docker compose up -d
# verify cert is issued (will be untrusted — that's expected for staging)
docker compose logs certbot-init

# wipe staging cert and re-issue against production
docker run --rm -v "$(basename $PWD)_certbot-etc:/etc/letsencrypt" \
  certbot/certbot delete --cert-name automation.alialahmad.com --non-interactive
docker compose up -d
```

To force a re-issuance later (e.g. key compromise), delete the cert from the volume the same way and `docker compose up -d` will trigger `certbot-init` to issue a fresh one.

## Local dry-run

```bash
cp .env.example .env
# fill in DATABASE_URL, TELEGRAM_*, CORS_ORIGIN

# compose needs these exported for interpolation:
export DOCKER_USERNAME=your-dockerhub-username
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your-pg-password
export POSTGRES_DB=automation

docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f backend
```

To build locally instead of pulling, temporarily add `build:` blocks to both services in `docker-compose.yml`.

## Verifying a deploy

```bash
ssh deploy@<server>
cd ~
docker compose ps
docker compose logs --tail=50 backend
curl -sI http://localhost:3000                     # Next.js
curl -s  http://localhost:3001/api/templates       # NestJS (adjust endpoint)
cat .env                                           # sanity-check rendered env
```

## Rollback

Because the tag is fixed (`:tag20`), every push overwrites the previous image. To roll back you must either:

- Revert the offending commit on `main` and push — the workflow republishes `:tag20` from the older code, then redeploys, **or**
- Pull a specific commit SHA's image manually on the server if you kept it tagged elsewhere.

Consider adding SHA-based tags alongside `:tag20` if you need easy rollbacks.

## Out of scope

- **Zero-downtime deploys** — a few seconds of downtime on container recreate.
- **Database backups** — `pgdata` is a named volume. Add a nightly `pg_dump` cron when ready.
- **Staging** — single environment for now.
