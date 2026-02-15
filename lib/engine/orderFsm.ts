import type { Order, OrderStatus, Fill, Side, OrderType, TIF, Symbol } from './models'

let orderIdCounter = 0
let fillIdCounter = 0

function orderId() { return `ORD-${String(++orderIdCounter).padStart(5, '0')}` }
function fillId() { return `FIL-${String(++fillIdCounter).padStart(5, '0')}` }

export function createOrder(
  side: Side,
  type: OrderType,
  price: number,
  qty: number,
  tif: TIF,
  symbol: Symbol,
): Order {
  return {
    id: orderId(),
    ts: Date.now(),
    side,
    type,
    price,
    qty,
    filledQty: 0,
    leaves: qty,
    status: 'NEW',
    tif,
    symbol,
  }
}

export function acknowledgeOrder(order: Order): Order {
  if (order.status !== 'NEW') return order
  return { ...order, status: 'ACK' }
}

export function activateOrder(order: Order): Order {
  if (order.status !== 'ACK') return order
  return { ...order, status: 'LIVE' }
}

export function cancelOrder(order: Order): Order {
  if (order.status === 'FILLED' || order.status === 'CXL' || order.status === 'REJ') return order
  return { ...order, status: 'CXL', leaves: 0 }
}

export function rejectOrder(order: Order): Order {
  return { ...order, status: 'REJ', leaves: 0 }
}

export function tryFillOrder(
  order: Order,
  currentBestBid: number,
  currentBestAsk: number,
  bestBidSize: number,
  bestAskSize: number,
): { order: Order; fills: Fill[] } {
  if (order.status === 'FILLED' || order.status === 'CXL' || order.status === 'REJ') {
    return { order, fills: [] }
  }

  const fills: Fill[] = []
  let updatedOrder = { ...order }

  if (order.type === 'MKT') {
    // Market orders fill instantly
    const fillPrice = order.side === 'BUY' ? currentBestAsk : currentBestBid
    const fillQty = order.leaves

    if (order.tif === 'FOK' && fillQty > (order.side === 'BUY' ? bestAskSize : bestBidSize)) {
      return { order: rejectOrder(order), fills: [] }
    }

    const actualFill = order.tif === 'IOC'
      ? Math.min(fillQty, order.side === 'BUY' ? bestAskSize : bestBidSize)
      : fillQty

    if (actualFill > 0) {
      fills.push({
        id: fillId(),
        ts: Date.now(),
        orderId: order.id,
        side: order.side,
        price: fillPrice,
        qty: actualFill,
        liquidity: 'T',
        pnlImpact: 0,
      })
      updatedOrder.filledQty += actualFill
      updatedOrder.leaves -= actualFill
    }

    if (updatedOrder.leaves <= 0) {
      updatedOrder.status = 'FILLED'
      updatedOrder.leaves = 0
    } else if (order.tif === 'IOC') {
      updatedOrder.status = 'CXL' // Cancel remainder for IOC
    } else {
      updatedOrder.status = 'PARTIAL'
    }

    return { order: updatedOrder, fills }
  }

  // Limit order fill logic
  if (order.type === 'LMT') {
    const canFill =
      (order.side === 'BUY' && order.price >= currentBestAsk) ||
      (order.side === 'SELL' && order.price <= currentBestBid)

    if (!canFill) {
      // Check TIF
      if (order.tif === 'IOC') {
        return { order: cancelOrder(order), fills: [] }
      }
      if (order.tif === 'FOK') {
        return { order: rejectOrder(order), fills: [] }
      }
      // DAY: order rests
      if (updatedOrder.status === 'ACK' || updatedOrder.status === 'NEW') {
        updatedOrder.status = 'LIVE'
      }
      return { order: updatedOrder, fills }
    }

    // Can fill
    const fillPrice = order.side === 'BUY' ? currentBestAsk : currentBestBid
    const availableSize = order.side === 'BUY' ? bestAskSize : bestBidSize

    if (order.tif === 'FOK' && order.leaves > availableSize) {
      return { order: rejectOrder(order), fills: [] }
    }

    const fillQty = Math.min(updatedOrder.leaves, availableSize)
    // Partial fill chance
    const actualFill = Math.random() < 0.3 ? Math.max(1, Math.round(fillQty * (0.3 + Math.random() * 0.5))) : fillQty

    if (actualFill > 0) {
      fills.push({
        id: fillId(),
        ts: Date.now(),
        orderId: order.id,
        side: order.side,
        price: fillPrice,
        qty: actualFill,
        liquidity: 'M',
        pnlImpact: 0,
      })
      updatedOrder.filledQty += actualFill
      updatedOrder.leaves -= actualFill
    }

    if (updatedOrder.leaves <= 0) {
      updatedOrder.status = 'FILLED'
      updatedOrder.leaves = 0
    } else if (order.tif === 'IOC') {
      updatedOrder.status = 'CXL'
    } else if (updatedOrder.filledQty > 0) {
      updatedOrder.status = 'PARTIAL'
    }

    return { order: updatedOrder, fills }
  }

  return { order: updatedOrder, fills }
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['ACK', 'REJ'],
  ACK: ['LIVE', 'CXL', 'REJ'],
  LIVE: ['PARTIAL', 'FILLED', 'CXL'],
  PARTIAL: ['PARTIAL', 'FILLED', 'CXL'],
  FILLED: [],
  CXL: [],
  REJ: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
