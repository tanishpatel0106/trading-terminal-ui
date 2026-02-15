import asyncio
import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

from app.db.base import Base
from app.db import models  # noqa: F401
from app.main import app
from app.db.session import engine


@pytest.fixture(scope="session", autouse=True)
def cleanup_db_file():
    if os.path.exists("test.db"):
        os.remove("test.db")
    yield
    if os.path.exists("test.db"):
        os.remove("test.db")


@pytest.fixture(scope="session", autouse=True)
def prepare_db():
    async def _create_tables() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_create_tables())
    yield


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
