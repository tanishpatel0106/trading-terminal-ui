from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, health, orders, sessions
from app.api.ws import marketdata, orders as ws_orders, trades
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title='Trading Simulator Backend', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(marketdata.router)
app.include_router(trades.router)
app.include_router(ws_orders.router)
