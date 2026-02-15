# Trading Simulator Backend

FastAPI backend built as a wrapper around immutable `logic/` exchange components.

---

## 1) What DB this backend uses

- **Primary database:** PostgreSQL
- **ORM:** SQLAlchemy 2.0 async
- **Schema migrations:** Alembic

The app reads connection settings from `DATABASE_URL`.

Example:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/trading
```

---

## 2) Exact tables created (via migration)

The initial migration creates:

1. `sessions`
   - `id` (UUID, PK)
   - `mode` (`LIVE | HISTORICAL_REPLAY | LP_REPLAY`)
   - `symbol`
   - `status` (`RUNNING | PAUSED | STOPPED`)
   - `replay_speed`
   - `created_at`, `updated_at`

2. `orders`
   - `id` (UUID, PK)
   - `session_id` (FK → `sessions.id`)
   - `user_id`, `client_order_id`
   - `side`, `type`, `price`, `qty`, `leaves_qty`, `status`, `tif`
   - `created_at`, `updated_at`

3. `trades`
   - `id` (UUID, PK)
   - `session_id` (FK → `sessions.id`)
   - `taker_order_id`, `maker_order_id`
   - `price`, `qty`, `side`, `ts`

4. `event_logs`
   - `id` (UUID, PK)
   - `session_id` (FK → `sessions.id`)
   - `event_type`, `payload`, `ts`

✅ **You do not manually create tables.** Run Alembic migration(s), and schema is created for you.

---

## 3) Full local setup (recommended)

### Prereqs

- Python 3.11+
- PostgreSQL 14+
- `psql` CLI installed

### Step-by-step

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
```

Then run DB setup script:

```bash
./scripts/db_setup.sh
```

This script will:
1) connect to Postgres
2) create the DB if missing
3) run `alembic upgrade head`

Now start API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 4) Alternative setup with Docker (API + Postgres)

```bash
cd backend
docker compose up --build
```

`docker-compose` runs:
- Postgres container
- API container
- Alembic upgrade at API startup

---

## 5) How backend connects to DB (important)

Connection is controlled by:

- `DATABASE_URL` env var
- loaded in `app/core/config.py`
- engine/session created in `app/db/session.py`

For local host Postgres:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/trading
```

For docker compose internal network:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/trading
```

> Use `localhost` when API runs on your machine.
> Use `db` when API runs inside Docker Compose.

---

## 6) Verify DB and schema

Open psql:

```bash
./scripts/db_psql.sh
```

Useful checks:

```sql
\dt
\d+ sessions
\d+ orders
\d+ trades
\d+ event_logs
SELECT version_num FROM alembic_version;
```

---

## 7) Alembic commands you should run

Apply migrations:

```bash
alembic upgrade head
```

Check current revision:

```bash
alembic current
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "your change"
```

Rollback one migration:

```bash
alembic downgrade -1
```

---

## 8) First end-to-end API smoke test

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

Create session:

```bash
curl -X POST http://localhost:8000/sessions \
  -H 'Content-Type: application/json' \
  -d '{"mode":"LIVE","symbol":"MSFT"}'
```

Place order:

```bash
curl -X POST http://localhost:8000/sessions/<SESSION_ID>/orders \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"u1","type":"LIMIT","side":"B","qty":10,"price":100.25,"tif":"DAY"}'
```

---

## 9) Running tests

```bash
pytest -q tests
```

---

## 10) Notes

- `logic/` is used as immutable engine input and is **not modified**.
- TTL expiration is enforced in runtime service outside the engine.
- Matching is delegated to `logic.order_book.OrderBook.process_event` through the adapter/runtime layer.
