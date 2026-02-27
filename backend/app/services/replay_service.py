import asyncio
import sys
from pathlib import Path
from uuid import UUID

from app.services.broadcaster import Broadcaster
from app.utils.time import now_ms

LOGIC_DIR = Path(__file__).resolve().parents[2] / "logic"
if str(LOGIC_DIR) not in sys.path:
    sys.path.insert(0, str(LOGIC_DIR))

from lobster_reader import LOBSTERReader, find_lobster_files  # noqa: E402
from order_book import OrderBook  # noqa: E402


AVAILABLE_STOCKS: list[dict] = []


def _discover_stocks() -> list[dict]:
    """Scan the logic/ directory for available LOBSTER data files."""
    pairs = find_lobster_files(str(LOGIC_DIR))
    stocks = []
    for msg_file, book_file in pairs:
        name = Path(msg_file).name
        parts = name.split("_")
        ticker = parts[0] if parts else "UNKNOWN"
        date = parts[1] if len(parts) > 1 else ""
        reader = LOBSTERReader(msg_file, book_file)
        count = reader.count_messages()
        stocks.append({
            "ticker": ticker,
            "date": date,
            "message_file": msg_file,
            "orderbook_file": book_file,
            "total_events": count,
        })
    return stocks


def get_available_stocks() -> list[dict]:
    global AVAILABLE_STOCKS
    if not AVAILABLE_STOCKS:
        AVAILABLE_STOCKS = _discover_stocks()
    return AVAILABLE_STOCKS


class ReplaySession:
    """Manages the replay state for a single session."""

    def __init__(self, session_id: UUID, ticker: str, broadcaster: Broadcaster):
        self.session_id = session_id
        self.ticker = ticker
        self.broadcaster = broadcaster
        self.order_book = OrderBook()
        self.speed: float = 1.0
        self.is_running: bool = False
        self.is_stopped: bool = False
        self._task: asyncio.Task | None = None
        self._events_processed: int = 0
        self._total_events: int = 0
        self._current_time: float = 0.0
        self._start_time: float = 0.0
        self._end_time: float = 0.0
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    @property
    def progress(self) -> dict:
        return {
            "events_processed": self._events_processed,
            "total_events": self._total_events,
            "progress_pct": round(self._events_processed / max(self._total_events, 1) * 100, 1),
            "current_time": self._current_time,
            "start_time": self._start_time,
            "end_time": self._end_time,
            "is_running": self.is_running,
            "is_stopped": self.is_stopped,
            "speed": self.speed,
        }

    def start(self) -> None:
        if self._task is not None and not self._task.done():
            self.is_running = True
            self._pause_event.set()
            return
        self.is_running = True
        self.is_stopped = False
        self._task = asyncio.create_task(self._run_replay())

    def pause(self) -> None:
        self.is_running = False
        self._pause_event.clear()

    def stop(self) -> None:
        self.is_running = False
        self.is_stopped = True
        self._pause_event.set()
        if self._task and not self._task.done():
            self._task.cancel()

    async def _run_replay(self) -> None:
        stocks = get_available_stocks()
        stock = next((s for s in stocks if s["ticker"] == self.ticker), None)
        if not stock:
            return

        reader = LOBSTERReader(stock["message_file"], stock["orderbook_file"])
        self._total_events = stock["total_events"]

        messages_iter = reader.read_messages_with_orderbook()
        first_msg, first_book = next(messages_iter, (None, None))
        if first_msg is None:
            return

        if first_book:
            self.order_book.seed_from_snapshot(
                first_book.bid_price, first_book.bid_size,
                first_book.ask_price, first_book.ask_size,
                time=first_msg.time,
            )

        self._start_time = first_msg.time
        self._current_time = first_msg.time
        prev_time = first_msg.time

        event = reader.to_event(first_msg, 1)
        if event:
            self.order_book.process_event(event)
        self._events_processed = 1
        await self._broadcast_snapshot()

        seq = 2
        batch_count = 0
        BATCH_SIZE = 50

        try:
            for msg, book in messages_iter:
                if self.is_stopped:
                    break

                await self._pause_event.wait()
                if self.is_stopped:
                    break

                time_diff = msg.time - prev_time
                if time_diff > 0 and self.speed > 0:
                    delay = time_diff / self.speed
                    delay = min(delay, 2.0)
                    if delay > 0.001:
                        await asyncio.sleep(delay)

                prev_time = msg.time
                self._current_time = msg.time

                event = reader.to_event(msg, seq)
                if event is None:
                    continue

                ack, trades = self.order_book.process_event(event)
                seq += 1
                self._events_processed += 1
                batch_count += 1

                if trades:
                    for tr in trades:
                        await self.broadcaster.publish_trade(
                            str(self.session_id),
                            {
                                "event": "trade",
                                "ts": now_ms(),
                                "price": tr.price / 10000.0,
                                "size": tr.size,
                                "aggressor": tr.side,
                            },
                        )

                if batch_count >= BATCH_SIZE:
                    await self._broadcast_snapshot()
                    batch_count = 0
        except asyncio.CancelledError:
            pass

        await self._broadcast_snapshot()
        self.is_running = False
        self.is_stopped = True

    async def _broadcast_snapshot(self) -> None:
        bids, asks = self.order_book.get_snapshot()
        snapshot = {
            "event": "snapshot",
            "bids": [{"price": b.price / 10000.0, "size": b.size, "orders": b.order_count} for b in bids[:20]],
            "asks": [{"price": a.price / 10000.0, "size": a.size, "orders": a.order_count} for a in asks[:20]],
            "ts": now_ms(),
        }
        await self.broadcaster.publish_marketdata(str(self.session_id), snapshot)

    async def get_snapshot(self, levels: int = 20) -> dict:
        bids, asks = self.order_book.get_snapshot()
        return {
            "bids": [{"price": b.price / 10000.0, "size": b.size, "orders": b.order_count} for b in bids[:levels]],
            "asks": [{"price": a.price / 10000.0, "size": a.size, "orders": a.order_count} for a in asks[:levels]],
        }


replay_sessions: dict[str, ReplaySession] = {}
