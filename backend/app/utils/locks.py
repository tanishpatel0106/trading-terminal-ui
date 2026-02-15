import asyncio
from collections import defaultdict


class SessionLockRegistry:
    def __init__(self) -> None:
        self._locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def get(self, session_id: str) -> asyncio.Lock:
        return self._locks[session_id]
