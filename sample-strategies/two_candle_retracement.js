/**
 * 2-Candle Retracement Buy Strategy
 * 
 * This strategy looks for a bullish candle followed by a retracement candle
 * that closes above the previous candle's open, indicating a potential continuation.
 * 
 * Entry: BUY when previous candle was bullish and current candle is a pullback
 * Exit: SELL when price closes below previous candle's close
 */

module.exports = async function strategy(ctx) {
  // ctx.candles - array of all candles up to current index
  // ctx.index - current candle index
  // ctx.params - strategy parameters (can be customized)
  // ctx.state - persistent state object (shared across calls)
  
  const currentCandle = ctx.candles[ctx.index];
  
  // Need at least 2 candles for this strategy
  if (ctx.index < 1) {
    return { signal: 'HOLD' };
  }
  
  const prevCandle = ctx.candles[ctx.index - 1];
  
  // Initialize state if needed
  if (!ctx.state.initialized) {
    ctx.state.initialized = true;
    ctx.state.position = null; // Track if we're in a position
  }
  
  // Check if we're in a position
  if (ctx.state.position) {
    // Exit condition: close below previous candle's close (bearish signal)
    if (currentCandle.close < prevCandle.close) {
      ctx.state.position = null;
      return { 
        signal: 'SELL',
        meta: { reason: 'Exit on bearish close' }
      };
    }
    
    // Hold position
    return { signal: 'HOLD' };
  }
  
  // Entry condition: 2-candle retracement pattern
  // 1. Previous candle was bullish (close > open)
  // 2. Current candle is a pullback but closes above previous candle's open
  const prevWasBullish = prevCandle.close > prevCandle.open;
  const currentIsRetracement = currentCandle.close < prevCandle.close;
  const currentAbovePrevOpen = currentCandle.close > prevCandle.open;
  
  if (prevWasBullish && currentIsRetracement && currentAbovePrevOpen) {
    ctx.state.position = {
      entryIndex: ctx.index,
      entryPrice: currentCandle.close,
    };
    
    return { 
      signal: 'BUY',
      size: ctx.params?.size || 1.0, // Use custom size from params or default to 1.0
      meta: { 
        reason: '2-candle retracement buy',
        prevClose: prevCandle.close,
        currentClose: currentCandle.close,
      }
    };
  }
  
  // No signal
  return { signal: 'HOLD' };
};

