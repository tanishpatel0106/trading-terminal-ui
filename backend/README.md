# Trading Simulator Backend

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[test]
cp .env.example .env
alembic -c app/db/migrations/alembic.ini upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

```bash
cd backend
docker compose up --build
```

## Notes

- `backend/logic` is intentionally immutable and treated as exchange-core source.
- Runtime adapters in `app/services/exchange_runtime.py` call into logic engine entry points when available.
- TTL and additional policy checks are implemented outside `logic/`.
