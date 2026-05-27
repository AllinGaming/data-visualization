# Stock Strategy Lab (WON'T RUN ON PAGES - ONLY USED FOR UI PREVIEW)

Stock Strategy Lab is an enterprise-style market analytics dashboard for comparing multiple stock tickers, benchmarking performance, and evaluating simple trading strategies.

It includes:
- A Node/Express backend that fetches data from Twelve Data
- A modern frontend dashboard with charts, metrics, exports, and shareable state
- GitHub Pages deployment workflow (frontend artifact) via GitHub Actions

## Architecture

- `server.js`: API server (`/api/*`) + static hosting for local/dev usage
- `public/index.html`: UI layout
- `public/styles.css`: visual design system
- `public/app.js`: client-side logic (charts, backtests, exports, UX)
- `public/config.js`: runtime frontend API config

Data provider:
- Twelve Data

## Features

- Benchmark defaults to S&P 500 proxy (`SPY`) and accepts aliases like `S&P 500`, `^GSPC`, `SPX`
- Multi-mode price chart:
  - Relative vs benchmark (`SPY=100`)
  - Normalized (`each=100`)
  - Cumulative return %
  - Rolling 63-day return %
  - Rolling 21-day annualized volatility %
- Current quotes board with provider tags
- Basic mode with defaults (tickers + time range) and collapsible Advanced Options panel
- Strategy backtests per ticker and per portfolio:
  - Buy & Hold
  - SMA Crossover
  - RSI Reversion
- Portfolio simulation with:
  - Equal/custom weights
  - Optional monthly rebalance
  - Trading cost + slippage modeling
- KPI cards and insight cards:
  - Leader ticker
  - Risk hotspot (max drawdown)
  - Portfolio alpha vs benchmark
- Sortable strategy tables (keyboard accessible)
- CSV export:
  - Aligned prices
  - Ticker metrics
  - Portfolio metrics + equity curves
- Shareable dashboard state via URL
- Advanced controls for:
  - Benchmark
  - Weighting/rebalance
  - Quote refresh interval
  - Minimum overlap days
  - RSI period and strategy costs
  - Portfolio-vs-portfolio mix comparison using:
    - Percent weights
    - Dollar allocations
    - Share counts
  - Chart views:
    - Strategy equity
    - Strategy drawdown %
    - Strategy edge vs buy & hold %
    - Strategy excess return vs benchmark %
- `Ctrl/Cmd + Enter` shortcut to rerun comparison
- Light/dark enterprise theme
- Responsive behavior optimized for desktop, tablets, and small phones:
  - fluid chart heights
  - stacked control actions
  - mobile card-style metric tables (no forced horizontal scrolling)

## Local Run

### 1. Prerequisites

- Node.js `18+`
- Twelve Data API key

### 2. Install

```bash
npm install
```

### 3. Configure env

```bash
cp .env.example .env
```

Set values in `.env`:

```env
TWELVEDATA_API_KEY=your_twelvedata_api_key_here
PORT=3000
CORS_ORIGIN=*
MAX_CACHE_ENTRIES=1200
```

`CORS_ORIGIN` is important if frontend and backend are on different domains.
`MAX_CACHE_ENTRIES` caps in-memory cache growth.

### 4. Start

```bash
npm start
```

Open:

- `http://localhost:3000`

Basic workflow:
- Enter tickers + select time range
- Click `Run Comparison`
- Open `Show Advanced Options` only when you need deeper controls
- Optional mix-vs-mix:
  - Enable `Portfolio Mix Comparison`
  - Fill `Portfolio A` and `Portfolio B` with `TICKER:value` pairs (comma/newline separated), e.g. `AAPL:40,MSFT:30,NVDA:30`
  - Choose `Amount Mode`: `Percent Weights`, `Dollar Amounts`, or `Share Counts`

## Runtime Frontend Config

Frontend reads runtime config from `public/config.js`:

```js
window.STOCKLAB_CONFIG = {
  apiBase: ""
};
```

- Empty `apiBase` = same-origin API (local server mode)
- Set `apiBase` to deployed backend URL when frontend is hosted separately (e.g. GitHub Pages)

Use `public/config.example.js` as reference.

## API Endpoints

- `GET /api/health`
- `GET /api/providers`
- `GET /api/quotes?tickers=AAPL,MSFT`
- `GET /api/history?ticker=AAPL&range=1Y`
- `GET /api/compare?tickers=AAPL,MSFT,NVDA&range=1Y`

### Query Notes

- `range`: `3M | 6M | 1Y | 2Y | 5Y`

## Deploy Frontend To GitHub Pages (Actions + Artifact)

This repository includes:

- `.github/workflows/deploy-pages.yml`

Workflow uses:
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

### Steps

1. Push to `main`.
2. In GitHub repo settings, set **Pages** source to **GitHub Actions**.
3. (Recommended) Add repository variable:
   - `API_BASE_URL=https://your-backend-domain.com`
4. Wait for action `Deploy Frontend To GitHub Pages` to complete.

The action builds a static `dist/` artifact from `public/` and deploys it.

## Backend Hosting For Production

GitHub Pages is static hosting only. `/api/*` requires backend hosting.

Deploy `server.js` to any Node host (for example: Render, Railway, Fly.io, VPS) and set:
- `TWELVEDATA_API_KEY`
- `CORS_ORIGIN` to your GitHub Pages URL (or `*`)

Then point frontend to backend via `API_BASE_URL` repo variable for the Pages workflow.

## GitHub Readiness Checklist

- [x] `README.md` complete
- [x] `LICENSE` included (MIT)
- [x] `.gitignore` included
- [x] `CONTRIBUTING.md` included
- [x] `SECURITY.md` included
- [x] GitHub Pages CI/CD workflow included
- [x] Runtime config pattern for separated frontend/backend included

## Scripts

- `npm start`: run production server
- `npm run dev`: run server in dev mode (same command currently)

## Disclaimer

This project is for educational and analytical purposes only. It is not financial advice.

## License

MIT. See [LICENSE](./LICENSE).
