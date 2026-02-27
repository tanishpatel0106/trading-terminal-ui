from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, orders, sessions
from app.api.ws import marketdata, trades
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title='Trading Replay Terminal', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(orders.router)
app.include_router(marketdata.router)
app.include_router(trades.router)
