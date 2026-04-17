# Telegram Scheduler

A self-hosted full-stack app to schedule and automate Telegram messages.
A cron worker inside the backend picks up due messages every minute and
delivers them to a fixed Telegram chat. Retries with exponential backoff;
duplicate-send is prevented at the database level.

## Stack

- **Frontend:** Next.js 14 (App Router) · Tailwind · shadcn/ui · TanStack Query · react-hook-form · zod
- **Backend:** NestJS 10 · Prisma 5 · `@nestjs/schedule`
- **Database:** PostgreSQL 16
- **Integration:** Telegram Bot API

## Layout

```
.
├── backend/              # NestJS API + cron worker
├── frontend/             # Next.js UI
├── docker-compose.yml    # Postgres 16
└── README.md
```

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker (or a local Postgres 16)
- A Telegram bot token + chat ID (see "Telegram setup" below)

## Getting started

### 1. Start Postgres

```bash
docker compose up -d
```

The database is exposed on `localhost:5432` with user/password `postgres` and database `automation`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (see below)
npm install
npx prisma migrate dev --name init
npm run start:dev
```

API listens on `http://localhost:3001/api`.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

UI runs on `http://localhost:3000`.

## Telegram setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram, run `/newbot`, follow the prompts, and copy the token it prints — that's your `TELEGRAM_BOT_TOKEN`.
2. Start a DM with your new bot (or add it to a group) and send it any message.
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and copy the `chat.id` from the JSON response — that's your `TELEGRAM_CHAT_ID`.

The bot must have received or sent at least one message in the target chat before the chat ID can be resolved.

## Environment variables

### `backend/.env`

| Key | Purpose |
|---|---|
| `PORT` | API port (default 3001) |
| `DATABASE_URL` | Postgres connection string |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_CHAT_ID` | Target chat |
| `CORS_ORIGIN` | Allowed origin for the frontend (default `http://localhost:3000`) |

### `frontend/.env.local`

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL (default `http://localhost:3001/api`) |

## How it works

### Scheduler

`SchedulerService` runs every minute (`@Cron(CronExpression.EVERY_MINUTE)`).
Each tick:

1. **Reap** — messages stuck in `SENDING` for more than 5 minutes (process crash mid-dispatch) are flipped back to `PENDING`.
2. **Claim** — up to 20 due messages are atomically flipped `PENDING → SENDING` using `UPDATE … FOR UPDATE SKIP LOCKED`. This is safe against concurrent cron ticks and multiple app instances.
3. **Dispatch** — each claimed message is sent via `TelegramService`. On success: `SENT`. On error: retry policy kicks in.

### Retry policy

Failed sends are retried up to 3 times. `retryCount` is incremented and `scheduledAt` is pushed out by `+1m`, `+5m`, `+15m` respectively. On the 3rd failure the message becomes permanently `FAILED` with `lastError` stored (surfaced on the dashboard).

### Duplicate-send prevention

All coordination is done at the database level using `FOR UPDATE SKIP LOCKED`. No Redis, no queue broker. Two cron workers running simultaneously cannot claim the same row.

## REST API

Base URL: `http://localhost:3001/api`

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/messages?status=&skip=&take=` | list + filter |
| `GET`    | `/messages/:id` | fetch one |
| `POST`   | `/messages` | create (status starts at `PENDING`) |
| `PATCH`  | `/messages/:id` | edit (only if `PENDING`) |
| `DELETE` | `/messages/:id` | delete |
| `GET`    | `/templates` | list |
| `GET`    | `/templates/:id` | fetch one |
| `POST`   | `/templates` | create |
| `PATCH`  | `/templates/:id` | edit |
| `DELETE` | `/templates/:id` | delete |

## Prisma schema

```prisma
enum MessageStatus { PENDING  SENDING  SENT  FAILED }

model Message {
  id          String        @id @default(uuid())
  content     String        @db.Text
  scheduledAt DateTime
  status      MessageStatus @default(PENDING)
  retryCount  Int           @default(0)
  lastError   String?       @db.Text
  sentAt      DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([scheduledAt, status])
}

model Template {
  id        String   @id @default(uuid())
  name      String   @unique
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Verifying it works

1. In the UI, create a template (e.g. name "ping", content "hello from scheduler").
2. Go to **New message**, pick the template, set the scheduled time ~90 seconds into the future, submit.
3. Watch the dashboard — the row starts `PENDING` and flips to `SENT` within a minute. Telegram delivers exactly once.
4. To test failure: start the backend with an invalid `TELEGRAM_BOT_TOKEN`. Schedule a message. Watch the row retry three times (over ~21 min) then land in `FAILED` with `lastError` visible on hover.

## Scripts

### Backend
- `npm run start:dev` — watch mode
- `npm run build` — compile TS
- `npm run typecheck` — tsc --noEmit
- `npx prisma studio` — browse the DB
- `npx prisma migrate dev` — create/apply a migration

### Frontend
- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm run typecheck` — tsc --noEmit

## Design notes

- **SOLID.** `TelegramService` is the only class that knows about the Bot API. `SchedulerService` is thin — all message lifecycle transitions (`claimDueMessages`, `markSent`, `markFailed`) live in `MessagesService`.
- **Single source of truth for time.** All timestamps stored UTC. `frontend/src/lib/format.ts` is the only file that converts between UTC and local.
- **No auth.** The app assumes single-user local use. If you expose it publicly, add an API-key guard in `backend/src/common/guards/`.
