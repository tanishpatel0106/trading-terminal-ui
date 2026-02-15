from fastapi import FastAPI

from app.api.routes import admin, health, orders, sessions
from app.api.ws import marketdata, orders as ws_orders, trades
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Trading Simulator Backend")

app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(marketdata.router)
app.include_router(trades.router)
app.include_router(ws_orders.router)


@app.on_event("startup")
async def startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
