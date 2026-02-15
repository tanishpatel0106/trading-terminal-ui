from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator

from app.db.models.order import OrderStatus, OrderType, TimeInForce


class OrderCreate(BaseModel):
    user_id: str
    type: OrderType
    side: str
    qty: int = Field(gt=0)
    price: float | None = None
    tif: TimeInForce | None = None
    ttl_seconds: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_limit_price(self) -> "OrderCreate":
        if self.type == OrderType.LIMIT and self.price is None:
            raise ValueError("price is required for LIMIT orders")
        if self.side not in {"B", "S"}:
            raise ValueError("side must be B or S")
        return self


class OrderModify(BaseModel):
    price: float | None = None
    qty: int | None = Field(default=None, gt=0)


class OrderSubmitResponse(BaseModel):
    order_id: UUID
    status: OrderStatus


class OrderRead(BaseModel):
    id: UUID
    session_id: UUID
    user_id: str
    client_order_id: str | None
    side: str
    type: OrderType
    price: float | None
    qty: int
    leaves_qty: int
    status: OrderStatus
    tif: TimeInForce | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
