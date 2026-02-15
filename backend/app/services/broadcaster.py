import asyncio
from collections import defaultdict
from collections.abc import AsyncIterator


class Broadcaster:
    def __init__(self, maxsize: int = 256) -> None:
        self._subs: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._maxsize = maxsize

    async def publish(self, channel: str, msg: dict) -> None:
        for queue in list(self._subs[channel]):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                await queue.put({"event": "resync_required", "payload": {}})
            await queue.put(msg)

    async def subscribe(self, channel: str) -> AsyncIterator[dict]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._maxsize)
        self._subs[channel].add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subs[channel].discard(queue)
