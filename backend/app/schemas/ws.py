from pydantic import BaseModel


class WSMessage(BaseModel):
    event_type: str
    ts_ms: int
    payload: dict
