require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;
const TWELVEDATA_BASE = "https://api.twelvedata.com";

const SUPPORTED_PROVIDERS = ["twelvedata"];
const SUPPORTED_RANGES = ["3M", "6M", "1Y", "2Y", "5Y"];
const responseCache = new Map();
const pendingRequests = new Map();

function envInt(name, fallback, minimum = 0) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < minimum) return fallback;
  return parsed;
}

const MAX_CACHE_ENTRIES = envInt("MAX_CACHE_ENTRIES", 1200, 50);

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.static(path.join(__dirname, "public")));

function sanitizeTickers(raw) {
  if (!raw) return [];
  return [...new Set(
    raw
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => /^[A-Z.\-]{1,15}$/.test(t))
  )].slice(0, 10);
}

function sanitizeRange(value) {
  const cleaned = (value || "1Y").toString().trim().toUpperCase();
  return SUPPORTED_RANGES.includes(cleaned) ? cleaned : "1Y";
}

function getRangeInSeconds(range) {
  const now = Math.floor(Date.now() / 1000);
  const map = {
    "3M": 60 * 60 * 24 * 90,
    "6M": 60 * 60 * 24 * 180,
    "1Y": 60 * 60 * 24 * 365,
    "2Y": 60 * 60 * 24 * 365 * 2,
    "5Y": 60 * 60 * 24 * 365 * 5
  };

  const span = map[range] || map["1Y"];
  const from = now - span;
  const to = now;

  const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
  const toDate = new Date(to * 1000).toISOString().slice(0, 10);

  return { fromDate, toDate };
}

function getCachedValue(key) {
  const item = responseCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return item.value;
}

function setCachedValue(key, value, ttlMs) {
  if (!ttlMs || ttlMs <= 0) return;
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });

  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toUnixFromDateKey(dateKey) {
  const ts = Date.parse(`${dateKey}T00:00:00Z`);
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : NaN;
}

function validateQuote(quote) {
  if (!quote || !Number.isFinite(quote.current) || quote.current <= 0) {
    throw new Error(`Invalid quote payload for ${quote?.ticker || "unknown ticker"}`);
  }
  return quote;
}

function sanitizeHistoryPoints(points) {
  const byTime = new Map();
  (points || []).forEach((point) => {
    if (!Number.isFinite(point?.t) || !Number.isFinite(point?.c)) return;
    byTime.set(point.t, {
      t: point.t,
      c: point.c,
      o: Number.isFinite(point.o) ? point.o : NaN,
      h: Number.isFinite(point.h) ? point.h : NaN,
      l: Number.isFinite(point.l) ? point.l : NaN,
      v: Number.isFinite(point.v) ? point.v : NaN
    });
  });

  const clean = [...byTime.values()].sort((a, b) => a.t - b.t);
  if (!clean.length) {
    throw new Error("No valid price points returned");
  }
  return clean;
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 12000;
  const cacheKey = options.cacheKey;
  const cacheTtlMs = options.cacheTtlMs ?? 0;
  const shouldCache = typeof options.shouldCache === "function" ? options.shouldCache : () => true;

  if (cacheKey) {
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;
    const pending = pendingRequests.get(cacheKey);
    if (pending) return pending;
  }

  const runRequest = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      if (cacheKey && shouldCache(data)) {
        setCachedValue(cacheKey, data, cacheTtlMs);
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  };

  const requestPromise = runRequest();

  if (!cacheKey) {
    return requestPromise;
  }

  pendingRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    if (pendingRequests.get(cacheKey) === requestPromise) {
      pendingRequests.delete(cacheKey);
    }
  }
}

async function fetchQuoteFromTwelveData(ticker) {
  if (!TWELVEDATA_API_KEY) throw new Error("Twelve Data API key missing.");

  const url = `${TWELVEDATA_BASE}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${TWELVEDATA_API_KEY}`;
  const data = await fetchWithTimeout(url, {
    cacheKey: `twelvedata:quote:${ticker}`,
    cacheTtlMs: 15000
  });

  if (data.status === "error") {
    throw new Error(data.message || "Twelve Data quote error");
  }

  return validateQuote({
    ticker,
    provider: "twelvedata",
    current: num(data.close),
    previousClose: num(data.previous_close),
    change: num(data.change),
    percentChange: num(data.percent_change),
    high: num(data.high),
    low: num(data.low),
    open: num(data.open),
    timestamp: Number.isFinite(num(data.timestamp)) ? num(data.timestamp) : Math.floor(Date.now() / 1000)
  });
}

async function fetchHistoryFromTwelveData(ticker, range) {
  if (!TWELVEDATA_API_KEY) throw new Error("Twelve Data API key missing.");

  const { fromDate, toDate } = getRangeInSeconds(range);
  const url = `${TWELVEDATA_BASE}/time_series?symbol=${encodeURIComponent(ticker)}&interval=1day&start_date=${fromDate}&end_date=${toDate}&outputsize=5000&apikey=${TWELVEDATA_API_KEY}`;
  const data = await fetchWithTimeout(url, {
    cacheKey: `twelvedata:history:${ticker}:${range}`,
    cacheTtlMs: 10 * 60 * 1000
  });

  if (data.status === "error") {
    throw new Error(data.message || "Twelve Data history error");
  }

  if (!Array.isArray(data.values) || !data.values.length) {
    throw new Error("No data returned");
  }

  const points = data.values.map((row) => {
    const dayKey = (row.datetime || "").toString().slice(0, 10);
    return {
      t: toUnixFromDateKey(dayKey),
      c: num(row.close),
      o: num(row.open),
      h: num(row.high),
      l: num(row.low),
      v: num(row.volume)
    };
  });

  return sanitizeHistoryPoints(points);
}

function requireTwelveDataKey(res) {
  if (TWELVEDATA_API_KEY) return true;
  res.status(500).json({ error: "No Twelve Data API key configured. Add TWELVEDATA_API_KEY." });
  return false;
}

app.get("/api/providers", (req, res) => {
  res.json({
    supported: SUPPORTED_PROVIDERS,
    configured: TWELVEDATA_API_KEY ? ["twelvedata"] : [],
    current: "twelvedata"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    provider: "twelvedata",
    providersConfigured: {
      twelvedata: Boolean(TWELVEDATA_API_KEY)
    },
    cache: {
      entries: responseCache.size,
      maxEntries: MAX_CACHE_ENTRIES
    }
  });
});

app.get("/api/quotes", async (req, res) => {
  const tickers = sanitizeTickers(req.query.tickers);

  if (!requireTwelveDataKey(res)) return;
  if (!tickers.length) {
    return res.status(400).json({ error: "Provide tickers query param, e.g. ?tickers=AAPL,MSFT" });
  }

  const results = await Promise.allSettled(
    tickers.map((ticker) => fetchQuoteFromTwelveData(ticker))
  );

  const quotes = [];
  const errors = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      quotes.push(result.value);
    } else {
      errors.push({ ticker: tickers[idx], message: result.reason.message });
    }
  });

  res.json({
    providerRequested: "twelvedata",
    providerOrder: ["twelvedata"],
    quotes,
    errors
  });
});

app.get("/api/history", async (req, res) => {
  const ticker = (req.query.ticker || "").toString().trim().toUpperCase();
  const range = sanitizeRange(req.query.range);

  if (!requireTwelveDataKey(res)) return;
  if (!/^[A-Z.\-]{1,15}$/.test(ticker)) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  try {
    const points = await fetchHistoryFromTwelveData(ticker, range);
    res.json({
      ticker,
      range,
      providerRequested: "twelvedata",
      providerUsed: "twelvedata",
      points
    });
  } catch (err) {
    res.status(502).json({ error: `History fetch failed for ${ticker}: ${err.message}` });
  }
});

app.get("/api/compare", async (req, res) => {
  const tickers = sanitizeTickers(req.query.tickers);
  const range = sanitizeRange(req.query.range);

  if (!requireTwelveDataKey(res)) return;
  if (!tickers.length) {
    return res.status(400).json({ error: "Provide tickers query param, e.g. ?tickers=AAPL,MSFT" });
  }

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      provider: "twelvedata",
      points: await fetchHistoryFromTwelveData(ticker, range)
    }))
  );

  const series = [];
  const errors = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      series.push(result.value);
    } else {
      errors.push({ ticker: tickers[idx], message: result.reason.message });
    }
  });

  res.json({
    range,
    providerRequested: "twelvedata",
    providerOrder: ["twelvedata"],
    series,
    errors
  });
});

app.listen(PORT, () => {
  console.log(`Stock dashboard server running at http://localhost:${PORT}`);
});
