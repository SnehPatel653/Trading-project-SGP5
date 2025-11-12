# Trading Platform - Full-Stack Application

A comprehensive trading platform with backtesting engine, strategy management, and live trading capabilities (paper trading by default).

## Features

- **Authentication**: JWT-based signup/login with bcrypt password hashing
- **Strategy Management**: Code editor with syntax highlighting, strategy upload, and validation
- **Backtesting Engine**: 
  - Historical OHLCV CSV data support
  - Commission and slippage simulation
  - Comprehensive metrics (total trades, wins, losses, win rate, accuracy, net P&L, ROI, max drawdown, expectancy, average win/loss, profit factor, Sharpe ratio)
  - Per-trade table with detailed information
  - Equity curve chart visualization
  - Export results to CSV
- **Live Trading**: Paper trading mode (mock broker) with pluggable broker adapter architecture
- **WebSockets**: Real-time updates for live trading sessions
- **Security**: 
  - Default paper trading mode
  - Encrypted broker secrets
  - Sandboxed strategy code execution
  - Trading disclaimers

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts, React Router
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Neon.tech - cloud-hosted)
- **ORM**: Prisma
- **Authentication**: JWT, bcrypt
- **Real-time**: WebSockets (ws)
- **Testing**: Jest

## Prerequisites

- Node.js 16+ and npm
- Neon.tech account (free tier available at https://neon.tech)
- Git

## Local Setup

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Set Up Neon.tech Database

1. Create a free account at [Neon.tech](https://neon.tech)
2. Create a new project
3. Copy your connection string from the dashboard
   - It will look like: `postgresql://user:password@host.neon.tech/database?sslmode=require`

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` and set your values:

```env
PORT=5000
NODE_ENV=development

# Neon.tech PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Generate a 32-byte hex key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-change-in-production-64-chars

PAPER_TRADING_ENABLED=true
```

**Important**: Generate secure keys for production:
```bash
# Generate JWT secret (any long random string)
# Generate encryption key (must be exactly 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Initialize Prisma and Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push

# Or use migrations for production
npm run prisma:migrate
```

### 5. Create Uploads Directory

```bash
mkdir -p uploads
```

### 6. Run the Application

**Option A: Run both server and client concurrently (recommended for development)**

```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:5000/ws

### 7. Create Your First Account

1. Navigate to http://localhost:3000
2. Click "Register" and create an account
3. Log in with your credentials

## Testing the Application

### 1. Create a Strategy

1. Go to "Strategies" → "New Strategy"
2. Use the default 2-candle retracement strategy or write your own
3. Save the strategy

### 2. Run a Backtest

1. Go to "Backtests" → "Run New Backtest"
2. Select your strategy
3. Upload the sample CSV file: `sample-data/ohlcv_sample.csv`
4. Configure parameters:
   - Commission: 0.001 (0.1%)
   - Slippage: 0.0005 (0.05%)
   - Initial Capital: 10000
5. Click "Run Backtest"
6. View results with metrics, equity curve, and trades table
7. Download trades CSV if needed

### 3. Sample Strategy

A sample 2-candle retracement strategy is included in `sample-strategies/two_candle_retracement.js`. This strategy:
- Looks for a bullish candle followed by a retracement
- Enters on the retracement if it closes above the previous open
- Exits when price closes below previous candle's close

## Strategy Contract

All strategies must follow this exact signature:

```javascript
module.exports = async function strategy(ctx) {
  // ctx.candles - array of all candles up to current index
  // ctx.index - current candle index (0-based)
  // ctx.params - strategy parameters (from database)
  // ctx.state - persistent state object (shared across calls)
  
  // Return signal object
  return {
    signal: 'BUY' | 'SELL' | 'HOLD',
    size?: number,        // Optional: position size (default 1.0)
    meta?: {}            // Optional: metadata for the trade
  };
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Strategies
- `GET /api/strategies` - List all strategies (requires auth)
- `GET /api/strategies/:id` - Get strategy details (requires auth)
- `POST /api/strategies` - Create strategy (requires auth)
- `PUT /api/strategies/:id` - Update strategy (requires auth)
- `DELETE /api/strategies/:id` - Delete strategy (requires auth)

### Backtests
- `GET /api/backtests` - List all backtests (requires auth)
- `GET /api/backtests/:id` - Get backtest details (requires auth)
- `POST /api/backtests/run` - Run backtest (requires auth, multipart/form-data)
- `GET /api/backtests/:id/trades` - Download trades CSV (requires auth)
- `DELETE /api/backtests/:id` - Delete backtest (requires auth)

### Trading
- `GET /api/trading/status` - Get trading status (requires auth)
- `GET /api/trading/brokers` - List broker configs (requires auth)
- `POST /api/trading/brokers` - Save broker config (requires auth)
- `POST /api/trading/start` - Start live trading (requires auth)
- `POST /api/trading/stop` - Stop live trading (requires auth)
- `GET /api/trading/trades` - Get live trades (requires auth)

## Running Tests

```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
.
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   └── App.js
│   └── package.json
├── server/                # Express backend
│   ├── backtest/          # Backtesting engine
│   ├── brokers/           # Broker adapters (paper, etc.)
│   ├── config/            # Database config
│   ├── middleware/        # Auth middleware
│   ├── routes/            # API routes
│   ├── trading/           # Live trading manager
│   ├── utils/             # Utilities (encryption)
│   ├── websocket/         # WebSocket server
│   └── index.js
├── sample-data/           # Sample OHLCV CSV files
├── sample-strategies/     # Example strategies
├── uploads/               # Uploaded files (gitignored)
├── docker-compose.yml     # PostgreSQL setup
├── package.json
└── README.md
```

## CSV Data Format

Backtest CSV files must have the following columns:
- `timestamp` (or `time` or `date`) - ISO date string
- `open` - Opening price
- `high` - High price
- `low` - Low price
- `close` - Closing price
- `volume` - Volume (optional)

Example:
```csv
timestamp,open,high,low,close,volume
2024-01-01T00:00:00Z,100.00,102.50,99.50,101.00,1000
2024-01-01T01:00:00Z,101.00,103.00,100.50,102.50,1200
```

## Security Notes

1. **Default Paper Trading**: The platform defaults to paper trading mode. Live trading requires explicit configuration.

2. **Strategy Sandboxing**: User strategy code runs in a sandboxed VM context with restricted module access.

3. **Encrypted Secrets**: Broker API keys and secrets are encrypted using AES-256-GCM before storage.

4. **JWT Authentication**: All API endpoints (except auth) require valid JWT tokens.

5. **Production Deployment**: 
   - Change all default secrets in `.env`
   - Use strong encryption keys
   - Enable HTTPS
   - Configure CORS properly
   - Use environment-specific database credentials

## Enabling Live Trading (Manual Steps)

⚠️ **Warning**: Live trading involves real money and substantial risk.

1. **Configure Broker**:
   - Go to Live Trading → Configure Broker
   - Enter your broker API credentials (encrypted storage)
   - Test connection in paper mode first

2. **Update Environment**:
   - Set `PAPER_TRADING_ENABLED=false` in `.env`
   - Restart the server

3. **Enable Broker Config**:
   - Mark broker config as active in the UI
   - Verify connection

4. **Start Trading**:
   - Select strategy and symbol
   - Choose "Live Trading" broker type
   - Monitor closely

**Note**: Live broker adapters are not fully implemented in this MVP. The architecture supports pluggable adapters, but you'll need to implement the specific broker integration.

## Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:push` - Push schema changes to database (development)
- `npm run prisma:migrate` - Create and run migrations (production)
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Troubleshooting

### Database Connection Issues
- Verify your Neon.tech connection string in `.env`
- Ensure `DATABASE_URL` includes `?sslmode=require` for Neon
- Check Neon.tech dashboard for connection status
- Test connection: `npx prisma db pull` (should connect successfully)

### Prisma Issues
- Run `npm run prisma:generate` after schema changes
- If schema is out of sync: `npm run prisma:push` or `npm run prisma:migrate`
- Check Prisma logs in development mode

### Port Already in Use
- Change `PORT` in `.env` for backend
- React dev server uses port 3000 by default (change in `client/package.json`)

### Strategy Execution Errors
- Check strategy code follows the required contract
- Ensure strategy exports async function correctly
- Review server logs for detailed error messages

### File Upload Issues
- Ensure `uploads/` directory exists and is writable
- Check file size limits (10MB default)
- Verify CSV format matches expected structure

## Development

### Adding New Broker Adapters

1. Create adapter in `server/brokers/`:
```javascript
class MyBroker {
  async getBalance() { ... }
  async placeOrder(symbol, side, size, price) { ... }
}
module.exports = { MyBroker };
```

2. Update `server/trading/liveTrading.js` to use the adapter

3. Add broker config UI in `client/src/pages/LiveTrading.js`

## License

MIT

## Disclaimer

This software is provided for educational and testing purposes. Trading involves substantial risk of loss. Past performance is not indicative of future results. Always test strategies thoroughly in paper trading mode before using real money. The authors are not responsible for any financial losses.

