/**
 * Market Data Simulator
 * 
 * Simulates realistic market price movements for paper trading
 */

class MarketSimulator {
  constructor(symbol, initialPrice = 100) {
    this.symbol = symbol;
    this.currentPrice = initialPrice;
    this.open = initialPrice;
    this.high = initialPrice;
    this.low = initialPrice;
    this.volume = 0;
    this.lastUpdate = Date.now();
    this.priceHistory = [initialPrice];
  }

  /**
   * Generate next candle (simulated market data)
   * Uses random walk with trend to create realistic price movement
   */
  generateCandle() {
    // Random walk with slight drift
    const randomChange = (Math.random() - 0.48) * 2; // Slight upward bias
    const percentChange = randomChange / 100;
    
    const newPrice = this.currentPrice * (1 + percentChange);
    
    // Update candle data
    this.open = this.currentPrice;
    this.high = Math.max(newPrice, this.currentPrice);
    this.low = Math.min(newPrice, this.currentPrice);
    this.currentPrice = newPrice;
    this.volume = Math.floor(Math.random() * 10000) + 1000; // Random volume 1000-11000
    this.lastUpdate = Date.now();
    
    this.priceHistory.push(newPrice);

    return {
      symbol: this.symbol,
      timestamp: new Date(),
      open: this.open,
      high: this.high,
      low: this.low,
      close: this.currentPrice,
      volume: this.volume,
    };
  }

  /**
   * Get current price
   */
  getCurrentPrice() {
    return this.currentPrice;
  }

  /**
   * Get price history
   */
  getPriceHistory(limit = 100) {
    return this.priceHistory.slice(-limit);
  }

  /**
   * Reset simulator
   */
  reset(initialPrice) {
    this.currentPrice = initialPrice;
    this.open = initialPrice;
    this.high = initialPrice;
    this.low = initialPrice;
    this.volume = 0;
    this.priceHistory = [initialPrice];
  }
}

module.exports = { MarketSimulator };
