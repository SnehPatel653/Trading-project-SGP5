/**
 * Paper Trading Broker (Mock Broker)
 * 
 * Simulates trading without real money
 */

class PaperBroker {
  constructor(initialCapital = 10000) {
    this.capital = initialCapital;
    this.positions = new Map(); // symbol -> position
    this.orderHistory = [];
  }

  /**
   * Get account balance
   */
  async getBalance() {
    return {
      available: this.capital,
      total: this.capital,
    };
  }

  /**
   * Place market order
   */
  async placeOrder(symbol, side, size, price) {
    const order = {
      id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      size,
      price,
      status: 'filled',
      filledAt: new Date(),
      commission: price * size * 0.001, // 0.1% commission
    };

    // Update capital
    if (side === 'BUY') {
      const cost = price * size + order.commission;
      if (this.capital >= cost) {
        this.capital -= cost;
        this.positions.set(symbol, {
          side: 'LONG',
          size,
          entryPrice: price,
        });
      } else {
        order.status = 'rejected';
        order.reason = 'Insufficient funds';
      }
    } else if (side === 'SELL') {
      const position = this.positions.get(symbol);
      if (position && position.side === 'LONG') {
        const revenue = price * size - order.commission;
        this.capital += revenue;
        this.positions.delete(symbol);
      } else {
        order.status = 'rejected';
        order.reason = 'No position to close';
      }
    }

    this.orderHistory.push(order);
    return order;
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
    return this.orderHistory.slice(-limit);
  }
}

module.exports = { PaperBroker };

