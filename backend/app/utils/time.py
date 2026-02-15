from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def now_ms() -> int:
    return int(utcnow().timestamp() * 1000)
