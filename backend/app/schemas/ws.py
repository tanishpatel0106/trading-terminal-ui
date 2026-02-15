from pydantic import BaseModel


class WsEnvelope(BaseModel):
    event: str
    ts_ms: int
    payload: dict
