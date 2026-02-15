# Trading Simulator Backend

FastAPI backend built as a wrapper around immutable `logic/` exchange components.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run with Docker

```bash
cd backend
docker compose up --build
```

## API Overview

- `GET /health`
- `POST /sessions`
- `GET /sessions/{session_id}`
- `POST /sessions/{session_id}/start|pause|stop`
- `POST /sessions/{session_id}/replay/speed`
- `POST /sessions/{session_id}/orders`
- `POST /sessions/{session_id}/orders/{order_id}/cancel`
- `POST /sessions/{session_id}/orders/{order_id}/modify`
- `GET /sessions/{session_id}/book`
- `GET /sessions/{session_id}/trades`
- `GET /sessions/{session_id}/orders`
- `POST /sessions/{session_id}/reset`
- `POST /sessions/{session_id}/load_lobster` (501 stub)

WebSockets:
- `/ws/sessions/{session_id}/marketdata`
- `/ws/sessions/{session_id}/trades`
- `/ws/sessions/{session_id}/orders?user_id=...`

## Notes

- `logic/` is mounted as immutable engine code and is not modified.
- TTL expiration is enforced in runtime service outside the engine.
- Matching logic is delegated to `logic.order_book.OrderBook.process_event`.
