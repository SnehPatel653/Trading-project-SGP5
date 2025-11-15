/**
 * Paper Trading Broker (Mock Broker)
 * 
 * Simulates trading without real money
 */

class PaperBroker {
  constructor(initialCapital = 10000) {
    this.accountId = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initialCapital = initialCapital;
    this.balance = initialCapital;
    this.positions = new Map(); // symbol -> { side, size, entryPrice, entryTime, pnl, pnlPercent }
    this.orders = []; // all orders (filled, rejected, etc)
    this.equity = initialCapital; // current equity value
    this.createdAt = new Date();
  }

  /**
   * Get account balance
   */
  async getBalance() {
    return {
      available: this.balance,
      total: this.equity,
      initialCapital: this.initialCapital,
      unrealizedPnL: this.equity - this.initialCapital,
    };
  }

  /**
   * Place market order
   */
  async placeOrder(symbol, side, size, currentPrice) {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const executionPrice = currentPrice; // Paper trading executes at current price
    const commission = executionPrice * size * 0.001; // 0.1% commission
    const totalCost = executionPrice * size + commission;

    const order = {
      id: orderId,
      symbol,
      side,
      size,
      requestedPrice: currentPrice,
      executedPrice: executionPrice,
      commission,
      totalCost,
      status: 'pending',
      filledAt: null,
      reason: null,
      pnl: 0,
    };

    // Process order based on side
    if (side.toUpperCase() === 'BUY') {
      if (this.balance >= totalCost) {
        this.balance -= totalCost;
        this.positions.set(symbol, {
          side: 'LONG',
          size,
          entryPrice: executionPrice,
          entryTime: new Date(),
          pnl: 0,
          pnlPercent: 0,
          commission,
        });
        order.status = 'filled';
        order.filledAt = new Date();
      } else {
        order.status = 'rejected';
        order.reason = `Insufficient funds: need ${totalCost.toFixed(2)}, available ${this.balance.toFixed(2)}`;
      }
    } else if (side.toUpperCase() === 'SELL') {
      const position = this.positions.get(symbol);
      if (position && position.side === 'LONG') {
        const revenue = executionPrice * size - commission;
        const positionPnL = revenue - (position.entryPrice * size + position.commission);
        this.balance += revenue;
        this.equity += positionPnL; // Update equity with realized P&L
        order.pnl = positionPnL;
        this.positions.delete(symbol);
        order.status = 'filled';
        order.filledAt = new Date();
      } else {
        order.status = 'rejected';
        order.reason = 'No open position to close';
      }
    } else {
      order.status = 'rejected';
      order.reason = 'Invalid side: must be BUY or SELL';
    }

    this.orders.push(order);
    return order;
  }

  /**
   * Update position with current market price (for unrealized P&L)
   */
  updatePositionPrice(symbol, currentPrice) {
    const position = this.positions.get(symbol);
    if (position) {
      const positionValue = currentPrice * position.size;
      const costBasis = position.entryPrice * position.size + position.commission;
      position.pnl = positionValue - costBasis;
      position.pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      
      // Update equity
      this.recalculateEquity();
    }
  }

  /**
   * Recalculate total equity
   */
  recalculateEquity() {
    let positionValue = 0;
    for (const position of this.positions.values()) {
      positionValue += position.pnl;
    }
    this.equity = this.balance + positionValue;
  }

  /**
   * Get current positions
   */
  async getPositions() {
    return Array.from(this.positions.entries()).map(([symbol, position]) => ({
      symbol,
      ...position,
    }));
  }

  /**
   * Get order history
   */
  async getOrderHistory(limit = 100) {
    return this.orders.slice(-limit);
  }

  /**
   * Get account summary
   */
  async getAccountSummary() {
    const positions = await this.getPositions();
    const orders = await this.getOrderHistory(20);
    return {
      accountId: this.accountId,
      balance: this.balance,
      equity: this.equity,
      initialCapital: this.initialCapital,
      unrealizedPnL: this.equity - this.initialCapital,
      return: ((this.equity - this.initialCapital) / this.initialCapital) * 100,
      positions,
      recentOrders: orders,
    };
  }
}

module.exports = { PaperBroker };

