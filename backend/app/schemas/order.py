from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.db.models.order import OrderSide, OrderStatus, OrderType, TimeInForce


class OrderCreate(BaseModel):
    user_id: str
    type: OrderType
    side: OrderSide
    qty: int
    price: float | None = None
    tif: TimeInForce | None = None
    ttl_seconds: int | None = None

    @field_validator("price")
    @classmethod
    def validate_limit_price(cls, value, info):
        if info.data.get("type") == OrderType.LIMIT and value is None:
            raise ValueError("price is required for LIMIT orders")
        return value


class OrderModify(BaseModel):
    price: float | None = None
    qty: int | None = None


class OrderOut(BaseModel):
    id: UUID
    session_id: UUID
    user_id: str
    side: OrderSide
    type: OrderType
    price: float | None
    qty: int
    leaves_qty: int
    status: OrderStatus
    tif: TimeInForce | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlaceOrderResponse(BaseModel):
    order_id: UUID
    status: OrderStatus
