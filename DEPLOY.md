# Deployment

CI/CD via GitHub Actions: every push to `main` builds the `backend` and `frontend` Docker images, pushes them to Docker Hub, then SCPs `docker-compose.yml` and a freshly-rendered `.env` to the server and runs `docker compose up -d`. The repo only ships `.env.example`; real values live in GitHub Secrets.

## Architecture

```
push to main
   │
   ▼
GitHub Actions
 ├── build & push  $DOCKERHUB_USERNAME/automation-backend:{sha,latest}   → Docker Hub
 ├── build & push  $DOCKERHUB_USERNAME/automation-frontend:{sha,latest}  → Docker Hub
 │     (NEXT_PUBLIC_API_BASE_URL passed as --build-arg, baked into the bundle)
 └── deploy
       ├── render .env from secrets (with IMAGE_TAG=<sha>)
       ├── scp docker-compose.yml + .env  →  $SSH_HOST:$DEPLOY_PATH
       └── ssh: docker compose pull && docker compose up -d && docker image prune -f
```

## One-time server bootstrap

On a fresh Ubuntu/Debian server:

### 1. Create deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
```

### 2. Install Docker engine + compose plugin

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
```

### 3. SSH key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/automation_deploy -C "gh-actions-deploy"
ssh-copy-id -i ~/.ssh/automation_deploy.pub deploy@<server>
```

The **private** key (`~/.ssh/automation_deploy`) goes into the `SSH_PRIVATE_KEY` GitHub secret.

### 4. Deploy directory

```bash
sudo mkdir -p /opt/automation
sudo chown deploy:deploy /opt/automation
```

### 5. Firewall

Open `80`/`443` (and whatever your reverse proxy uses). Do **not** expose `5432` — Postgres is reachable only from the `backend` container on the internal compose network.

### 6. First migration (one-time, before the first deploy)

The backend container runs `prisma migrate deploy` on every start. That requires committed migrations under `backend/prisma/migrations/`. Generate the initial one locally:

```bash
cd backend
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "chore: initial prisma migration"
```

## GitHub Secrets

Settings → Secrets and variables → Actions → **New repository secret**.

| Secret | Example / notes |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username — also the image namespace |
| `DOCKERHUB_TOKEN` | Docker Hub → Account Settings → Security → New Access Token (read/write/delete) |
| `SSH_HOST` | `1.2.3.4` or `server.example.com` |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | optional — defaults to `22` |
| `SSH_PRIVATE_KEY` | full contents of `~/.ssh/automation_deploy` (including the `-----BEGIN ... -----END` lines) |
| `DEPLOY_PATH` | `/opt/automation` |
| `POSTGRES_USER` | optional — defaults to `postgres` |
| `POSTGRES_PASSWORD` | strong random string |
| `POSTGRES_DB` | optional — defaults to `automation` |
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `TELEGRAM_CHAT_ID` | target chat id |
| `CORS_ORIGIN` | public frontend URL, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | public backend URL, e.g. `https://api.example.com/api` — baked into the frontend image |

## Local production-like dry run

Before pushing to main, verify the stack works end-to-end on your machine:

```bash
cp .env.example .env          # fill in real values
docker compose build          # build images locally instead of pulling
docker compose up -d
docker compose ps             # all healthy?
docker compose logs -f backend
```

Note: `docker compose build` ignores the `image:` keys for building purposes if there's no `build:` block — for a local dry run you can temporarily add `build: ./backend` and `build: ./frontend` to the compose file, or just run the production image flow once CI pushes images.

## Verifying a deploy

```bash
ssh deploy@<server>
cd /opt/automation
docker compose ps
docker compose logs --tail=50 backend
curl -s http://localhost:3001/api/...    # adjust to a real endpoint
curl -sI http://localhost:3000           # Next.js index
cat .env | grep IMAGE_TAG                # confirms the SHA matches the latest push
```

## Rollback

Every deploy writes `IMAGE_TAG=sha-<short>` into `.env`. To roll back to a previous build:

```bash
ssh deploy@<server>
cd /opt/automation
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<old-sha>/' .env
docker compose pull && docker compose up -d
```

The old image must still exist on Docker Hub (default retention is forever for free accounts).

## Out of scope

- **TLS / reverse proxy** — recommended next step. Drop a Caddy or Traefik service into `docker-compose.yml` in front of `frontend:3000` and `backend:3001` and stop publishing host ports for those services.
- **Zero-downtime deploys** — current flow has a few seconds of downtime on container recreate. Fix with a reverse proxy + rolling restart strategy.
- **Database backups** — `pgdata` is a named volume. Add a nightly `pg_dump` cron when ready.
- **Staging environment** — single environment for now; duplicate the workflow with a different branch + secret set when needed.
