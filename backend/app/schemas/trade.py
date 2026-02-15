from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class TradeRead(BaseModel):
    id: UUID
    session_id: UUID
    taker_order_id: UUID | None
    maker_order_id: UUID | None
    price: float
    qty: int
    side: str
    ts: datetime

    model_config = {"from_attributes": True}
