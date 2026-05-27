const form = document.getElementById("controls-form");
const tickersInput = document.getElementById("tickers");
const advancedToggleBtn = document.getElementById("advancedToggle");
const advancedResetBtn = document.getElementById("advancedResetBtn");
const advancedPanelEl = document.getElementById("advancedPanel");
const providerModeInput = document.getElementById("providerMode");
const benchmarkInput = document.getElementById("benchmark");
const weightingModeInput = document.getElementById("weightingMode");
const rebalanceModeInput = document.getElementById("rebalanceMode");
const quoteRefreshInput = document.getElementById("quoteRefreshMs");
const minOverlapDaysInput = document.getElementById("minOverlapDays");
const priceCompareModeInput = document.getElementById("priceCompareMode");
const priceScaleInput = document.getElementById("priceScale");
const strategyViewModeInput = document.getElementById("strategyViewMode");
const strategyFocusInput = document.getElementById("strategyFocus");
const showBenchmarkOverlayInput = document.getElementById("showBenchmarkOverlay");
const mixCompareEnabledInput = document.getElementById("mixCompareEnabled");
const mixAmountModeInput = document.getElementById("mixAmountMode");
const mixAInput = document.getElementById("mixA");
const mixBInput = document.getElementById("mixB");
const weightsInput = document.getElementById("weights");
const weightsWrap = document.getElementById("weightsWrap");
const rangeInput = document.getElementById("range");
const smaFastInput = document.getElementById("smaFast");
const smaSlowInput = document.getElementById("smaSlow");
const rsiPeriodInput = document.getElementById("rsiPeriod");
const rsiBuyInput = document.getElementById("rsiBuy");
const rsiSellInput = document.getElementById("rsiSell");
const tradeCostInput = document.getElementById("tradeCostBps");
const slippageInput = document.getElementById("slippageBps");
const exportPricesBtn = document.getElementById("exportPricesBtn");
const exportTickerMetricsBtn = document.getElementById("exportTickerMetricsBtn");
const exportPortfolioBtn = document.getElementById("exportPortfolioBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const themeToggleBtn = document.getElementById("themeToggle");
const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));
const sortableHeaders = Array.from(document.querySelectorAll("th.sortable"));
const kpiTickersEl = document.getElementById("kpiTickers");
const kpiBestStrategyEl = document.getElementById("kpiBestStrategy");
const kpiPortfolioReturnEl = document.getElementById("kpiPortfolioReturn");
const insightLeaderEl = document.getElementById("insightLeader");
const insightLeaderMetaEl = document.getElementById("insightLeaderMeta");
const insightRiskEl = document.getElementById("insightRisk");
const insightRiskMetaEl = document.getElementById("insightRiskMeta");
const insightAlphaEl = document.getElementById("insightAlpha");
const insightAlphaMetaEl = document.getElementById("insightAlphaMeta");
const statusEl = document.getElementById("status");
const workspaceEl = document.querySelector(".workspace");
const quoteCardsEl = document.getElementById("quote-cards");
const resultsTableBody = document.querySelector("#resultsTable tbody");
const portfolioTableBody = document.querySelector("#portfolioTable tbody");
const priceChartTitleEl = document.getElementById("priceChartTitle");
const strategyChartTitleEl = document.getElementById("strategyChartTitle");
const mixSectionEl = document.getElementById("mixSection");
const mixAReturnEl = document.getElementById("mixAReturn");
const mixBReturnEl = document.getElementById("mixBReturn");
const mixSpreadEl = document.getElementById("mixSpread");

let priceChart;
let strategyChart;
let mixChart;
let refreshTimer;
let lastTickers = ["AAPL", "MSFT", "NVDA", "SPY"];
let latestRun = null;
let activeTheme = "dark";
let isBusy = false;
let quoteRefreshIntervalMs = 30000;
const sortState = {
  results: { key: "bestSharpe", dir: "desc" },
  portfolio: { key: "totalReturn", dir: "desc" }
};

const palette = ["#50e3c2", "#ffc857", "#ff7aa2", "#7ec8ff", "#b39dff", "#8ff8dd", "#f2b5ff", "#fda085"];
const STRATEGIES = ["buyHold", "sma", "rsi"];
const STRATEGY_LABELS = {
  buyHold: "Buy & Hold",
  sma: "SMA Crossover",
  rsi: "RSI Reversion"
};
const SP500_ALIASES = new Set([
  "SP500",
  "SNP500",
  "SANDP500",
  "GSPC",
  "SPX",
  "SPX500",
  "US500",
  "USSPX500"
]);
const API_BASE = ((window.STOCKLAB_CONFIG && window.STOCKLAB_CONFIG.apiBase) || "")
  .toString()
  .trim()
  .replace(/\/+$/, "");
const ADVANCED_PANEL_PREF_KEY = "stocklab_advanced_open";
const ADVANCED_URL_KEYS = new Set([
  "benchmark",
  "weighting",
  "weights",
  "rebalance",
  "quoteRefreshMs",
  "minOverlapDays",
  "priceCompareMode",
  "priceScale",
  "strategyViewMode",
  "strategyFocus",
  "showBenchmarkOverlay",
  "mixCompareEnabled",
  "mixAmountMode",
  "mixA",
  "mixB",
  "smaFast",
  "smaSlow",
  "rsiPeriod",
  "rsiBuy",
  "rsiSell",
  "tradeCostBps",
  "slippageBps"
]);

function apiUrl(path) {
  if (!path.startsWith("/")) return path;
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setAdvancedOpen(open) {
  const expanded = Boolean(open);
  if (advancedPanelEl) advancedPanelEl.hidden = !expanded;
  if (advancedToggleBtn) {
    advancedToggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    advancedToggleBtn.textContent = expanded ? "Hide Advanced Options" : "Show Advanced Options";
  }
  try {
    localStorage.setItem(ADVANCED_PANEL_PREF_KEY, expanded ? "1" : "0");
  } catch {
    // Ignore persistence failures (private mode / disabled storage)
  }
}

function getStoredAdvancedOpen() {
  try {
    const raw = localStorage.getItem(ADVANCED_PANEL_PREF_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    return null;
  }
  return null;
}

function toggleAdvancedPanel(event) {
  if (event) event.preventDefault();
  const isOpen = advancedPanelEl ? !advancedPanelEl.hidden : false;
  setAdvancedOpen(!isOpen);
}

function resetAdvancedControls() {
  if (providerModeInput) providerModeInput.value = "twelvedata";
  benchmarkInput.value = "SPY";
  weightingModeInput.value = "equal";
  weightsInput.value = "";
  rebalanceModeInput.value = "none";
  quoteRefreshInput.value = "30000";
  minOverlapDaysInput.value = "40";

  smaFastInput.value = "20";
  smaSlowInput.value = "50";
  rsiPeriodInput.value = "14";
  rsiBuyInput.value = "30";
  rsiSellInput.value = "55";
  tradeCostInput.value = "5";
  slippageInput.value = "3";

  priceCompareModeInput.value = "vsBase";
  priceScaleInput.value = "linear";
  strategyViewModeInput.value = "equity";
  strategyFocusInput.value = "all";
  showBenchmarkOverlayInput.checked = true;

  mixCompareEnabledInput.checked = false;
  mixAmountModeInput.value = "percent";
  mixAInput.value = "";
  mixBInput.value = "";

  if (advancedPanelEl) {
    advancedPanelEl.querySelectorAll("details.advanced-accordion").forEach((el) => {
      el.open = false;
    });
  }

  canonicalizeBenchmark();
  syncWeightInputState();
  writeStateToUrl();
  setStatus("Advanced settings reset to defaults.");
  rerenderChartsIfPossible();
}

function parseRefreshIntervalMs() {
  const n = Number(quoteRefreshInput?.value);
  if (!Number.isFinite(n) || n < 0) return 30000;
  return Math.floor(n);
}

function currentBenchmarkTicker() {
  return parseTickerValue(benchmarkInput?.value) || "SPY";
}

function rerenderChartsIfPossible() {
  if (!latestRun) return;

  const chartOptions = buildChartOptions(currentBenchmarkTicker());
  const pool = [
    ...latestRun.mainSeries,
    latestRun.benchmarkSeries,
    latestRun.baseSeries
  ].filter(Boolean);
  const baseSeries = pool.find((series) => series.ticker === chartOptions.baseTicker) || latestRun.baseSeries || latestRun.benchmarkSeries || latestRun.mainSeries[0];
  if (!baseSeries) {
    setStatus("Run comparison first to load benchmark series.");
    return;
  }

  latestRun.baseSeries = baseSeries;
  latestRun.chartOptions = chartOptions;
  destroyCharts();
  updateChartTitles(chartOptions);
  renderPriceChart(latestRun.mainSeries, latestRun.alignedDates, latestRun.benchmarkSeries, latestRun.baseSeries, chartOptions);
  renderStrategyChart(latestRun.portfolioResult, latestRun.benchmarkSeries, latestRun.byTickerResults, chartOptions, latestRun.mainSeries);
  renderMixComparison(latestRun.mixComparisonResult, latestRun.benchmarkSeries);
}

function syncWeightInputState() {
  if (!weightingModeInput || !weightsInput) return;
  const isCustom = weightingModeInput.value === "custom";
  weightsInput.disabled = !isCustom;
  if (weightsWrap) {
    weightsWrap.hidden = !isCustom;
  }
}

function ensureCustomWeightsDefault(tickers) {
  if (weightingModeInput.value !== "custom" || weightsInput.value.trim() || !tickers.length) return;
  const equal = 1 / tickers.length;
  weightsInput.value = tickers.map(() => equal.toFixed(4)).join(",");
}

function stopQuoteRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = null;
}

function startQuoteRefresh() {
  quoteRefreshIntervalMs = parseRefreshIntervalMs();
  stopQuoteRefresh();
  if (quoteRefreshIntervalMs <= 0) return;
  refreshTimer = setInterval(() => {
    if (document.hidden || isBusy || !lastTickers.length) return;
    refreshQuotes(lastTickers);
  }, quoteRefreshIntervalMs);
}

function setBusyState(busy) {
  isBusy = Boolean(busy);
  document.body.classList.toggle("is-loading", isBusy);
  if (workspaceEl) workspaceEl.setAttribute("aria-busy", isBusy ? "true" : "false");

  const controls = [
    ...form.querySelectorAll("input, select, textarea, button"),
    copyLinkBtn,
    exportPricesBtn,
    exportTickerMetricsBtn,
    exportPortfolioBtn
  ].filter((el) => el && el !== advancedToggleBtn);

  controls.forEach((el) => {
    el.disabled = isBusy;
  });
}

function toSortPrimitive(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function sortRows(rows, tableName) {
  const state = sortState[tableName];
  if (!state?.key) return [...rows];
  const direction = state.dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = toSortPrimitive(a[state.key]);
    const bv = toSortPrimitive(b[state.key]);
    if (av < bv) return -1 * direction;
    if (av > bv) return 1 * direction;
    return 0;
  });
}

function updateSortAria() {
  sortableHeaders.forEach((th) => {
    const tableName = th.dataset.sortTable;
    const key = th.dataset.sortKey;
    const state = sortState[tableName];
    if (state?.key === key) {
      th.setAttribute("aria-sort", state.dir === "asc" ? "ascending" : "descending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
}

function setSort(tableName, key) {
  const state = sortState[tableName];
  if (!state) return;

  if (state.key === key) {
    state.dir = state.dir === "asc" ? "desc" : "asc";
  } else {
    state.key = key;
    state.dir = key === "ticker" || key === "strategy" || key === "best" ? "asc" : "desc";
  }

  updateSortAria();
  if (!latestRun) return;

  if (tableName === "results") {
    renderTickerTable(latestRun.mainSeries, latestRun.byTickerResults);
  } else {
    renderPortfolioTable(latestRun.portfolioResult);
  }
}

function handleSortableHeaderAction(event) {
  const th = event.currentTarget;
  setSort(th.dataset.sortTable, th.dataset.sortKey);
}

function handleSortableHeaderKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  handleSortableHeaderAction(event);
}

function applyPreset(event) {
  const btn = event.currentTarget;
  const preset = btn.dataset.preset;
  if (!preset) return;
  tickersInput.value = preset;
  runComparison();
}

function chartThemeColors() {
  const styles = getComputedStyle(document.body);
  return {
    legend: styles.getPropertyValue("--ink").trim(),
    ticks: styles.getPropertyValue("--muted").trim(),
    grid: styles.getPropertyValue("--grid").trim()
  };
}

function getPreferredTheme() {
  const saved = localStorage.getItem("stocklab_theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function setTheme(theme) {
  activeTheme = theme === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme", activeTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = activeTheme === "light" ? "Switch To Dark" : "Switch To Light";
  }
  localStorage.setItem("stocklab_theme", activeTheme);
}

function toggleTheme() {
  setTheme(activeTheme === "light" ? "dark" : "light");
  if (latestRun) {
    destroyCharts();
    renderPriceChart(
      latestRun.mainSeries,
      latestRun.alignedDates,
      latestRun.benchmarkSeries,
      latestRun.baseSeries,
      latestRun.chartOptions
    );
    renderStrategyChart(
      latestRun.portfolioResult,
      latestRun.benchmarkSeries,
      latestRun.byTickerResults,
      latestRun.chartOptions,
      latestRun.mainSeries
    );
    renderMixComparison(latestRun.mixComparisonResult, latestRun.benchmarkSeries);
  }
}

function normalizeTickerAlias(value) {
  const raw = (value || "").toString().trim().toUpperCase();
  if (!raw) return "";
  const aliasKey = raw.replace(/[^A-Z0-9]/g, "");
  if (SP500_ALIASES.has(aliasKey)) return "SPY";
  return raw;
}

function parseTickerValue(value) {
  const clean = normalizeTickerAlias(value);
  return /^[A-Z.\-]{1,15}$/.test(clean) ? clean : null;
}

function parseTickers() {
  return [...new Set(
    tickersInput.value
      .split(",")
      .map((v) => parseTickerValue(v))
      .filter(Boolean)
  )].slice(0, 10);
}

function parseCustomWeights(raw, expectedCount) {
  const values = raw.split(",").map((v) => Number(v.trim()));
  if (values.length !== expectedCount || values.some((v) => !Number.isFinite(v) || v <= 0)) {
    return null;
  }

  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  return values.map((v) => v / total);
}

function buildWeights(tickers) {
  if (!tickers.length) return { weightsByTicker: {}, mode: "equal" };

  const mode = weightingModeInput.value;
  if (mode === "custom") {
    ensureCustomWeightsDefault(tickers);
    const parsed = parseCustomWeights(weightsInput.value, tickers.length);
    if (!parsed) {
      return {
        error: "Custom weights must be positive numbers and match ticker count. Example: 0.4,0.35,0.25"
      };
    }

    const weightsByTicker = Object.fromEntries(tickers.map((ticker, i) => [ticker, parsed[i]]));
    return { weightsByTicker, mode };
  }

  const equal = 1 / tickers.length;
  const weightsByTicker = Object.fromEntries(tickers.map((ticker) => [ticker, equal]));
  return { weightsByTicker, mode: "equal" };
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function getCurrentControlState() {
  return {
    tickers: tickersInput.value,
    benchmark: benchmarkInput.value,
    weighting: weightingModeInput.value,
    weights: weightsInput.value,
    rebalance: rebalanceModeInput.value,
    quoteRefreshMs: quoteRefreshInput.value,
    minOverlapDays: minOverlapDaysInput.value,
    priceCompareMode: priceCompareModeInput.value,
    priceScale: priceScaleInput.value,
    strategyViewMode: strategyViewModeInput.value,
    strategyFocus: strategyFocusInput.value,
    showBenchmarkOverlay: showBenchmarkOverlayInput.checked ? "1" : "0",
    mixCompareEnabled: mixCompareEnabledInput.checked ? "1" : "0",
    mixAmountMode: mixAmountModeInput.value,
    mixA: mixAInput.value,
    mixB: mixBInput.value,
    range: rangeInput.value,
    smaFast: smaFastInput.value,
    smaSlow: smaSlowInput.value,
    rsiPeriod: rsiPeriodInput.value,
    rsiBuy: rsiBuyInput.value,
    rsiSell: rsiSellInput.value,
    tradeCostBps: tradeCostInput.value,
    slippageBps: slippageInput.value
  };
}

function writeStateToUrl() {
  const state = getCurrentControlState();
  const params = new URLSearchParams();

  Object.entries(state).forEach(([key, value]) => {
    const clean = String(value ?? "").trim();
    if (clean) params.set(key, clean);
  });

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return;

  const valueMap = {
    tickers: tickersInput,
    benchmark: benchmarkInput,
    weighting: weightingModeInput,
    weights: weightsInput,
    rebalance: rebalanceModeInput,
    quoteRefreshMs: quoteRefreshInput,
    minOverlapDays: minOverlapDaysInput,
    priceCompareMode: priceCompareModeInput,
    priceScale: priceScaleInput,
    strategyViewMode: strategyViewModeInput,
    strategyFocus: strategyFocusInput,
    showBenchmarkOverlay: showBenchmarkOverlayInput,
    mixCompareEnabled: mixCompareEnabledInput,
    mixAmountMode: mixAmountModeInput,
    mixA: mixAInput,
    mixB: mixBInput,
    range: rangeInput,
    smaFast: smaFastInput,
    smaSlow: smaSlowInput,
    rsiPeriod: rsiPeriodInput,
    rsiBuy: rsiBuyInput,
    rsiSell: rsiSellInput,
    tradeCostBps: tradeCostInput,
    slippageBps: slippageInput
  };

  Object.entries(valueMap).forEach(([key, element]) => {
    if (!params.has(key) || !element) return;
    const nextValue = params.get(key);
    if (element.type === "checkbox") {
      element.checked = nextValue === "1" || nextValue === "true";
      return;
    }
    if (element.tagName === "SELECT") {
      setSelectValueIfValid(element, nextValue);
      return;
    }
    element.value = nextValue;
  });

  // Backward compatibility for older share links that used baseTicker.
  if (!params.has("benchmark") && params.has("baseTicker") && benchmarkInput) {
    benchmarkInput.value = params.get("baseTicker");
  }
}

function urlHasAdvancedParams() {
  const params = new URLSearchParams(window.location.search);
  return [...params.keys()].some((key) => ADVANCED_URL_KEYS.has(key));
}

function calculateSeriesReturn(closes) {
  if (!closes || closes.length < 2 || !Number.isFinite(closes[0]) || closes[0] === 0) return NaN;
  return ((closes[closes.length - 1] / closes[0]) - 1) * 100;
}

function computeCumulativeReturnSeries(closes) {
  if (!closes || !closes.length || !Number.isFinite(closes[0]) || closes[0] === 0) return [];
  const base = closes[0];
  return closes.map((close) => ((close / base) - 1) * 100);
}

function computeRelativeToBaseSeries(closes, baseCloses) {
  if (!closes || !baseCloses || closes.length !== baseCloses.length) return [];
  return closes.map((close, i) => {
    const b = baseCloses[i];
    if (!Number.isFinite(close) || !Number.isFinite(b) || b <= 0) return NaN;
    return (close / b) * 100;
  });
}

function computeRollingReturnSeries(closes, windowSize) {
  if (!Array.isArray(closes) || !closes.length || windowSize < 2) return [];
  return closes.map((close, i) => {
    if (i < windowSize - 1) return null;
    const base = closes[i - (windowSize - 1)];
    if (!Number.isFinite(close) || !Number.isFinite(base) || base === 0) return null;
    return ((close / base) - 1) * 100;
  });
}

function computeRollingVolSeries(closes, windowSize) {
  if (!Array.isArray(closes) || !closes.length || windowSize < 2) return [];
  const dailyReturns = closes.map((_, i) => {
    if (i === 0) return null;
    const prev = closes[i - 1];
    const curr = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) return null;
    return (curr - prev) / prev;
  });

  return closes.map((_, i) => {
    if (i < windowSize) return null;
    const sample = dailyReturns.slice(i - windowSize + 1, i + 1).filter((v) => Number.isFinite(v));
    if (sample.length < windowSize - 1) return null;
    const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
    const variance = sample.reduce((acc, v) => acc + (v - avg) ** 2, 0) / sample.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  });
}

function computeExcessSeries(seriesA, seriesB) {
  if (!Array.isArray(seriesA) || !Array.isArray(seriesB) || seriesA.length !== seriesB.length) return [];
  return seriesA.map((v, i) => {
    const b = seriesB[i];
    if (!Number.isFinite(v) || !Number.isFinite(b)) return null;
    return v - b;
  });
}

function computeDrawdownSeries(equity) {
  if (!Array.isArray(equity) || !equity.length) return [];
  let peak = equity[0];
  return equity.map((value) => {
    if (value > peak) peak = value;
    return ((value - peak) / peak) * 100;
  });
}

function parseMixEntries(raw) {
  const chunks = (raw || "")
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const totals = new Map();

  chunks.forEach((chunk) => {
    const pair = chunk.split(/[:=]/).map((v) => v.trim());
    let tickerRaw = null;
    let amountRaw = null;

    if (pair.length >= 2) {
      [tickerRaw, amountRaw] = pair;
    } else {
      const m = chunk.match(/^([A-Za-z.^\-_]+)\s+([+-]?\d*\.?\d+)$/);
      if (!m) return;
      tickerRaw = m[1];
      amountRaw = m[2];
    }

    const ticker = parseTickerValue(tickerRaw);
    const normalizedAmount = String(amountRaw).replace(/[$,%\s]/g, "");
    const amount = Number(normalizedAmount);
    if (!ticker || !Number.isFinite(amount) || amount <= 0) return;
    totals.set(ticker, (totals.get(ticker) || 0) + amount);
  });

  return [...totals.entries()].map(([ticker, amount]) => ({ ticker, amount }));
}

function buildMixWeights(entries, amountMode, closesByTicker) {
  const weighted = [];
  entries.forEach(({ ticker, amount }) => {
    if (amountMode === "shares") {
      const closes = closesByTicker[ticker];
      if (!closes || !Number.isFinite(closes[0]) || closes[0] <= 0) return;
      weighted.push({ ticker, raw: amount * closes[0] });
      return;
    }
    weighted.push({ ticker, raw: amount });
  });

  const total = weighted.reduce((sum, row) => sum + row.raw, 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  return Object.fromEntries(weighted.map((row) => [row.ticker, row.raw / total]));
}

function buildMixEquity(entries, amountMode, seriesByTicker, dates) {
  const closesByTicker = {};
  entries.forEach(({ ticker }) => {
    const points = seriesByTicker[ticker]?.points;
    if (!points) return;
    const closes = getClosesByDates(points, dates);
    if (!closes || !closes.every((v) => Number.isFinite(v) && v > 0)) return;
    closesByTicker[ticker] = closes;
  });

  const validEntries = entries.filter(({ ticker }) => Array.isArray(closesByTicker[ticker]));
  if (!validEntries.length) return null;

  const weights = buildMixWeights(validEntries, amountMode, closesByTicker);
  if (!weights) return null;

  const weightedTickers = Object.keys(weights);
  const equity = [100];

  for (let i = 1; i < dates.length; i += 1) {
    const dayRet = weightedTickers.reduce((sum, ticker) => {
      const closes = closesByTicker[ticker];
      const prev = closes[i - 1];
      const curr = closes[i];
      const ret = prev > 0 ? (curr - prev) / prev : 0;
      return sum + ret * weights[ticker];
    }, 0);
    equity.push(equity[i - 1] * (1 + dayRet));
  }

  return {
    tickers: weightedTickers,
    weights,
    equity,
    metrics: metricsFromEquity(equity)
  };
}

function buildMixComparison(seriesByTicker, benchmarkSeries, amountMode, minOverlapDays) {
  if (!mixCompareEnabledInput?.checked) return null;
  const mixAEntries = parseMixEntries(mixAInput?.value);
  const mixBEntries = parseMixEntries(mixBInput?.value);
  if (!mixAEntries.length || !mixBEntries.length) {
    return { error: "Portfolio A and B both require at least one valid `TICKER:value` entry." };
  }

  const mixTickers = [...new Set([...mixAEntries.map((r) => r.ticker), ...mixBEntries.map((r) => r.ticker)])];
  const mixSeries = mixTickers.map((ticker) => seriesByTicker[ticker]).filter(Boolean);
  if (!mixSeries.length) {
    return { error: "No historical data found for portfolio mix tickers." };
  }

  const dates = getCommonDates(mixSeries);
  if (dates.length < minOverlapDays) {
    return { error: `Portfolio mix comparison needs ${minOverlapDays}+ overlapping dates (got ${dates.length}).` };
  }

  const mixA = buildMixEquity(mixAEntries, amountMode, seriesByTicker, dates);
  const mixB = buildMixEquity(mixBEntries, amountMode, seriesByTicker, dates);
  if (!mixA || !mixB) {
    return { error: "Could not build one or both portfolio mixes from available data." };
  }

  let benchmarkNorm = null;
  if (benchmarkSeries) {
    const closes = getClosesByDates(benchmarkSeries.points, dates);
    if (closes && closes.every((v) => Number.isFinite(v) && v > 0)) {
      benchmarkNorm = normalizeCloses(closes);
    }
  }

  return {
    amountMode,
    dates,
    mixA,
    mixB,
    benchmarkNorm,
    spread: mixA.metrics.totalReturn - mixB.metrics.totalReturn
  };
}

function renderMixComparison(mixResult, benchmarkSeries) {
  if (!mixAReturnEl || !mixBReturnEl || !mixSpreadEl) return;
  if (!mixResult) {
    if (mixSectionEl) mixSectionEl.hidden = true;
    if (mixChart) {
      mixChart.destroy();
      mixChart = null;
    }
    mixAReturnEl.textContent = "-";
    mixBReturnEl.textContent = "-";
    mixSpreadEl.textContent = "-";
    return;
  }

  if (mixResult.error) {
    if (mixSectionEl) mixSectionEl.hidden = true;
    if (mixChart) {
      mixChart.destroy();
      mixChart = null;
    }
    mixAReturnEl.textContent = "-";
    mixBReturnEl.textContent = "-";
    mixSpreadEl.textContent = "-";
    return;
  }

  if (mixSectionEl) mixSectionEl.hidden = false;
  mixAReturnEl.textContent = formatPercent(mixResult.mixA.metrics.totalReturn);
  mixBReturnEl.textContent = formatPercent(mixResult.mixB.metrics.totalReturn);
  mixSpreadEl.textContent = formatPercent(mixResult.spread);

  const theme = chartThemeColors();
  const labelSuffix = {
    percent: " (%)",
    dollars: " ($)",
    shares: " (Shares)"
  }[mixResult.amountMode] || "";

  const datasets = [
    {
      label: `Portfolio A${labelSuffix}`,
      data: mixResult.mixA.equity,
      borderColor: "#52f2c6",
      backgroundColor: "#52f2c6",
      borderWidth: 2,
      tension: 0.12,
      pointRadius: 0
    },
    {
      label: `Portfolio B${labelSuffix}`,
      data: mixResult.mixB.equity,
      borderColor: "#ffb95a",
      backgroundColor: "#ffb95a",
      borderWidth: 2,
      tension: 0.12,
      pointRadius: 0
    }
  ];

  if (showBenchmarkOverlayInput?.checked && benchmarkSeries && mixResult.benchmarkNorm?.length === mixResult.dates.length) {
    datasets.push({
      label: `${benchmarkSeries.ticker} Benchmark`,
      data: mixResult.benchmarkNorm,
      borderColor: "#d8e3f0",
      backgroundColor: "#d8e3f0",
      borderDash: [7, 5],
      borderWidth: 2,
      tension: 0.12,
      pointRadius: 0
    });
  }

  mixChart = new Chart(document.getElementById("mixChart"), {
    type: "line",
    data: { labels: mixResult.dates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: theme.legend } }
      },
      scales: {
        x: { ticks: { color: theme.ticks, maxTicksLimit: 10 }, grid: { color: theme.grid } },
        y: { ticks: { color: theme.ticks }, grid: { color: theme.grid } }
      }
    }
  });
}

function buildChartOptions(benchmarkTicker) {
  const mode = [
    "vsBase",
    "normalized",
    "cumulativeReturn",
    "rollingReturn63",
    "rollingVol21"
  ].includes(priceCompareModeInput?.value) ? priceCompareModeInput.value : "vsBase";
  const priceScale = priceScaleInput?.value === "log" ? "log" : "linear";
  const strategyView = [
    "equity",
    "drawdown",
    "edgeVsBuyHold",
    "excessBenchmark"
  ].includes(strategyViewModeInput?.value) ? strategyViewModeInput.value : "equity";
  const strategyFocus = ["all", "buyHold", "sma", "rsi"].includes(strategyFocusInput?.value)
    ? strategyFocusInput.value
    : "all";
  const showBenchmark = Boolean(showBenchmarkOverlayInput?.checked);
  const baseTicker = benchmarkTicker || "SPY";

  return {
    mode,
    priceScale,
    strategyView,
    strategyFocus,
    showBenchmark,
    baseTicker
  };
}

function updateChartTitles(chartOptions) {
  if (priceChartTitleEl) {
    const label = {
      vsBase: `Relative Performance vs ${chartOptions.baseTicker} (Benchmark=100)`,
      normalized: "Normalized Price Comparison (Each=100)",
      cumulativeReturn: "Cumulative Return Comparison (%)",
      rollingReturn63: "Rolling 63-Day Return (%)",
      rollingVol21: "Rolling 21-Day Annualized Volatility (%)"
    }[chartOptions.mode] || "Price Comparison";
    priceChartTitleEl.textContent = label;
  }

  if (strategyChartTitleEl) {
    const label = {
      equity: "Portfolio Strategy Equity Curves",
      drawdown: "Portfolio Strategy Drawdown Curves (%)",
      edgeVsBuyHold: "Strategy Edge vs Buy & Hold (%)",
      excessBenchmark: "Strategy Excess Return vs Benchmark (%)"
    }[chartOptions.strategyView] || "Portfolio Strategy Comparison";
    strategyChartTitleEl.textContent = label;
  }
}

function renderKpis(mainSeries, portfolioResult) {
  if (kpiTickersEl) {
    kpiTickersEl.textContent = Number.isFinite(mainSeries?.length) ? String(mainSeries.length) : "-";
  }

  if (!portfolioResult) {
    if (kpiBestStrategyEl) kpiBestStrategyEl.textContent = "-";
    if (kpiPortfolioReturnEl) kpiPortfolioReturnEl.textContent = "-";
    return;
  }

  const best = STRATEGIES.map((key) => ({
    key,
    value: portfolioResult[key]?.metrics?.totalReturn ?? -Infinity
  })).sort((a, b) => b.value - a.value)[0];

  if (kpiBestStrategyEl) kpiBestStrategyEl.textContent = STRATEGY_LABELS[best.key] || "-";
  if (kpiPortfolioReturnEl) kpiPortfolioReturnEl.textContent = formatPercent(best.value);
}

function renderInsights(mainSeries, byTickerResults, alignedDates, benchmarkSeries, portfolioResult) {
  const candidates = [];
  mainSeries.forEach((entry) => {
    const result = byTickerResults[entry.ticker];
    if (!result) return;
    const best = chooseBestStrategy(result);
    const bestMetrics = result[best.key].metrics;
    candidates.push({
      ticker: entry.ticker,
      strategy: best.name,
      returnPct: best.value,
      maxDrawdown: bestMetrics.maxDrawdown
    });
  });

  if (!candidates.length) {
    insightLeaderEl.textContent = "-";
    insightLeaderMetaEl.textContent = "No valid strategy data";
    insightRiskEl.textContent = "-";
    insightRiskMetaEl.textContent = "No drawdown data";
  } else {
    const leader = [...candidates].sort((a, b) => b.returnPct - a.returnPct)[0];
    const riskHotspot = [...candidates].sort((a, b) => a.maxDrawdown - b.maxDrawdown)[0];
    insightLeaderEl.textContent = `${leader.ticker} ${formatPercent(leader.returnPct)}`;
    insightLeaderMetaEl.textContent = `${leader.strategy} outperformed peers`;
    insightRiskEl.textContent = `${riskHotspot.ticker} ${formatPercent(riskHotspot.maxDrawdown)}`;
    insightRiskMetaEl.textContent = `${riskHotspot.strategy} max drawdown`;
  }

  if (!portfolioResult || !benchmarkSeries) {
    insightAlphaEl.textContent = "-";
    insightAlphaMetaEl.textContent = "Add a benchmark for alpha";
    return;
  }

  const benchmarkCloses = getClosesByDates(benchmarkSeries.points, alignedDates);
  const benchmarkReturn = calculateSeriesReturn(benchmarkCloses);
  const bestPortfolio = STRATEGIES
    .map((key) => ({ key, value: portfolioResult[key]?.metrics?.totalReturn ?? Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.value - a.value)[0];
  const alpha = bestPortfolio.value - benchmarkReturn;
  insightAlphaEl.textContent = formatPercent(alpha);
  insightAlphaMetaEl.textContent = `${STRATEGY_LABELS[bestPortfolio.key]} vs ${benchmarkSeries.ticker} (${formatPercent(benchmarkReturn)})`;
}

function getDateKey(unixTs) {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

function buildDateCloseMap(points) {
  const map = new Map();
  points.forEach((point) => {
    if (Number.isFinite(point.c) && Number.isFinite(point.t)) {
      map.set(getDateKey(point.t), point.c);
    }
  });
  return map;
}

function getCommonDates(series) {
  if (!series.length) return [];
  const dateSets = series.map((entry) => new Set(entry.points.map((point) => getDateKey(point.t))));

  let common = dateSets[0];
  for (let i = 1; i < dateSets.length; i += 1) {
    common = new Set([...common].filter((date) => dateSets[i].has(date)));
  }

  return [...common].sort();
}

function getClosesByDates(points, dates) {
  const map = buildDateCloseMap(points);
  const closes = dates.map((date) => map.get(date));
  if (!closes.every(Number.isFinite)) return null;
  return closes;
}

function normalizeCloses(closes) {
  if (!closes.length || !Number.isFinite(closes[0]) || closes[0] === 0) return [];
  const base = closes[0];
  return closes.map((close) => (close / base) * 100);
}

function sma(values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }

  return out;
}

function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return out;
}

function annualizeTurnover(turnover, periods) {
  if (!Number.isFinite(turnover) || !Number.isFinite(periods) || periods <= 0) return NaN;
  return (turnover / periods) * 252 * 100;
}

function equityFromPosition(closes, positions, options) {
  const equity = [100];
  const costRate = (options.tradeCostBps + options.slippageBps) / 10000;
  let turnover = 0;
  let trades = 0;

  for (let i = 1; i < closes.length; i += 1) {
    const prev = equity[i - 1];
    const prevPos = positions[i - 1];
    const olderPos = i === 1 ? 0 : positions[i - 2];
    const tradeSize = Math.abs(prevPos - olderPos);
    turnover += tradeSize;
    if (tradeSize > 0) trades += 1;
    const netCapital = prev * (1 - tradeSize * costRate);

    const ret = (closes[i] - closes[i - 1]) / closes[i - 1];
    equity.push(netCapital * (1 + ret * prevPos));
  }

  return { equity, turnover, trades };
}

function metricsFromEquity(equity, extras = {}) {
  if (!equity.length) {
    return {
      totalReturn: NaN,
      maxDrawdown: NaN,
      vol: NaN,
      sharpe: NaN,
      turnoverRaw: NaN,
      turnoverAnnualized: NaN,
      trades: NaN
    };
  }

  const totalReturn = ((equity[equity.length - 1] / equity[0]) - 1) * 100;

  let peak = equity[0];
  let maxDrawdown = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  const dailyReturns = [];
  for (let i = 1; i < equity.length; i += 1) {
    dailyReturns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
  }

  const avg = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((acc, r) => acc + (r - avg) ** 2, 0) / (dailyReturns.length || 1);
  const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const sharpe = vol === 0 ? 0 : (avg * 252) / (vol / 100);

  return {
    totalReturn,
    maxDrawdown: maxDrawdown * 100,
    vol,
    sharpe,
    turnoverRaw: extras.turnover ?? 0,
    turnoverAnnualized: annualizeTurnover(extras.turnover ?? 0, equity.length - 1),
    trades: extras.trades ?? 0
  };
}

function backtest(closes, options) {
  const buyHoldPos = Array(closes.length).fill(1);
  const buyHoldRun = equityFromPosition(closes, buyHoldPos, options);

  const fast = sma(closes, options.smaFast);
  const slow = sma(closes, options.smaSlow);
  const smaPos = closes.map((_, i) => (fast[i] !== null && slow[i] !== null && fast[i] > slow[i] ? 1 : 0));
  const smaRun = equityFromPosition(closes, smaPos, options);

  const rsiVals = rsi(closes, options.rsiPeriod);
  let inPos = false;
  const rsiPos = closes.map((_, i) => {
    const r = rsiVals[i];
    if (r !== null && !inPos && r < options.rsiBuy) inPos = true;
    else if (r !== null && inPos && r > options.rsiSell) inPos = false;
    return inPos ? 1 : 0;
  });
  const rsiRun = equityFromPosition(closes, rsiPos, options);

  return {
    buyHold: {
      equity: buyHoldRun.equity,
      metrics: metricsFromEquity(buyHoldRun.equity, { turnover: buyHoldRun.turnover, trades: buyHoldRun.trades })
    },
    sma: {
      equity: smaRun.equity,
      metrics: metricsFromEquity(smaRun.equity, { turnover: smaRun.turnover, trades: smaRun.trades })
    },
    rsi: {
      equity: rsiRun.equity,
      metrics: metricsFromEquity(rsiRun.equity, { turnover: rsiRun.turnover, trades: rsiRun.trades })
    }
  };
}

function destroyCharts() {
  if (priceChart) priceChart.destroy();
  if (strategyChart) strategyChart.destroy();
  if (mixChart) mixChart.destroy();
}

function renderQuotes(quotes, errors) {
  quoteCardsEl.innerHTML = "";

  quotes.forEach((q) => {
    const isUp = Number.isFinite(q.percentChange) ? q.percentChange >= 0 : Number.isFinite(q.change) ? q.change >= 0 : false;
    const deltaClass = isUp ? "up" : "down";
    const providerTag = q.provider ? `<div class=\"provider\">${q.provider}</div>` : "";
    const card = document.createElement("article");
    card.className = "quote-card";
    card.innerHTML = `
      <div class="ticker">${q.ticker}</div>
      ${providerTag}
      <div class="price">${formatMoney(q.current)}</div>
      <div class="delta ${deltaClass}">${formatPercent(q.percentChange)} (${q.change >= 0 ? "+" : ""}${q.change?.toFixed(2) ?? "-"})</div>
    `;
    quoteCardsEl.appendChild(card);
  });

  errors.forEach((err) => {
    const card = document.createElement("article");
    card.className = "quote-card";
    card.innerHTML = `
      <div class="ticker">${err.ticker}</div>
      <div class="price">No quote</div>
      <div class="delta down">${err.message}</div>
    `;
    quoteCardsEl.appendChild(card);
  });
}

function renderPriceChart(mainSeries, alignedDates, benchmarkSeries, baseSeries, chartOptions) {
  const theme = chartThemeColors();
  const options = chartOptions || { mode: "vsBase", priceScale: "linear", showBenchmark: true };
  const baseCloses = baseSeries ? getClosesByDates(baseSeries.points, alignedDates) : null;
  const toModeSeries = (closes) => {
    if (!closes) return [];
    if (options.mode === "cumulativeReturn") return computeCumulativeReturnSeries(closes);
    if (options.mode === "vsBase" && baseCloses) return computeRelativeToBaseSeries(closes, baseCloses);
    if (options.mode === "rollingReturn63") return computeRollingReturnSeries(closes, 63);
    if (options.mode === "rollingVol21") return computeRollingVolSeries(closes, 21);
    return normalizeCloses(closes);
  };

  const datasets = mainSeries.map((entry, idx) => {
    const closes = getClosesByDates(entry.points, alignedDates);
    const seriesData = toModeSeries(closes);
    const label = entry.provider ? `${entry.ticker} (${entry.provider})` : entry.ticker;

    return {
      label,
      data: seriesData.map((v) => (Number.isFinite(v) ? v : null)),
      borderColor: palette[idx % palette.length],
      backgroundColor: palette[idx % palette.length],
      tension: 0.15,
      pointRadius: 0,
      borderWidth: 2
    };
  });

  if (options.showBenchmark && benchmarkSeries) {
    const benchmarkCloses = getClosesByDates(benchmarkSeries.points, alignedDates);
    if (benchmarkCloses) {
      const benchmarkData = toModeSeries(benchmarkCloses);
      const benchLabel = benchmarkSeries.provider
        ? `${benchmarkSeries.ticker} (${benchmarkSeries.provider}) Benchmark`
        : `${benchmarkSeries.ticker} (Benchmark)`;
      datasets.push({
        label: benchLabel,
        data: benchmarkData.map((v) => (Number.isFinite(v) ? v : null)),
        borderColor: "#d8e3f0",
        backgroundColor: "#d8e3f0",
        borderDash: [7, 5],
        tension: 0.15,
        pointRadius: 0,
        borderWidth: 2
      });
    }
  }

  const positiveOnly = datasets.every((ds) => ds.data.every((v) => v === null || (Number.isFinite(v) && v > 0)));
  const yScaleType = options.priceScale === "log" && positiveOnly ? "logarithmic" : "linear";

  priceChart = new Chart(document.getElementById("priceChart"), {
    type: "line",
    data: { labels: alignedDates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: theme.legend } }
      },
      scales: {
        x: { ticks: { color: theme.ticks, maxTicksLimit: 10 }, grid: { color: theme.grid } },
        y: {
          type: yScaleType,
          ticks: { color: theme.ticks },
          grid: { color: theme.grid }
        }
      }
    }
  });
}

function buildPortfolioStrategyEquity(strategyKey, usableTickers, byTickerResults, weightsByTicker, dates, rebalanceMode) {
  const weightSum = usableTickers.reduce((sum, ticker) => sum + (weightsByTicker[ticker] || 0), 0);
  if (weightSum <= 0) return null;

  const normalizedWeights = Object.fromEntries(
    usableTickers.map((ticker) => [ticker, (weightsByTicker[ticker] || 0) / weightSum])
  );

  if (rebalanceMode === "none") {
    const equity = dates.map((_, idx) => {
      return usableTickers.reduce((acc, ticker) => {
        return acc + normalizedWeights[ticker] * byTickerResults[ticker][strategyKey].equity[idx];
      }, 0);
    });
    return { equity, rebalanceTurnover: 0, rebalanceTrades: 0 };
  }

  const costRate = (Number(tradeCostInput.value) + Number(slippageInput.value)) / 10000;
  const allocations = Object.fromEntries(usableTickers.map((ticker) => [ticker, normalizedWeights[ticker] * 100]));
  const equity = [100];
  let rebalanceTurnover = 0;
  let rebalanceTrades = 0;

  for (let i = 1; i < dates.length; i += 1) {
    const prevMonth = dates[i - 1].slice(0, 7);
    const currentMonth = dates[i].slice(0, 7);

    if (currentMonth !== prevMonth) {
      const total = usableTickers.reduce((sum, ticker) => sum + allocations[ticker], 0);
      const currentWeights = Object.fromEntries(
        usableTickers.map((ticker) => [ticker, total === 0 ? 0 : allocations[ticker] / total])
      );
      const turnover = usableTickers.reduce((sum, ticker) => {
        return sum + Math.abs((normalizedWeights[ticker] || 0) - (currentWeights[ticker] || 0));
      }, 0);
      rebalanceTurnover += turnover;
      if (turnover > 0) rebalanceTrades += 1;
      const totalAfterCost = total * (1 - turnover * costRate);
      usableTickers.forEach((ticker) => {
        allocations[ticker] = totalAfterCost * normalizedWeights[ticker];
      });
    }

    usableTickers.forEach((ticker) => {
      const eq = byTickerResults[ticker][strategyKey].equity;
      const prev = eq[i - 1];
      const curr = eq[i];
      const ret = prev === 0 ? 0 : (curr - prev) / prev;
      allocations[ticker] *= (1 + ret);
    });

    const total = usableTickers.reduce((sum, ticker) => sum + allocations[ticker], 0);
    equity.push(total);
  }

  return { equity, rebalanceTurnover, rebalanceTrades };
}

function buildPortfolioResult(mainSeries, byTickerResults, weightsByTicker, alignedDates, rebalanceMode) {
  const usableTickers = mainSeries.map((s) => s.ticker).filter((ticker) => byTickerResults[ticker]);
  if (!usableTickers.length) return null;
  const usableWeightSum = usableTickers.reduce((sum, ticker) => sum + (weightsByTicker[ticker] || 0), 0) || 1;

  const result = {
    tickers: usableTickers,
    dates: alignedDates,
    minLen: alignedDates.length,
    rebalanceMode
  };

  for (const strategyKey of STRATEGIES) {
    const strategyRun = buildPortfolioStrategyEquity(
      strategyKey,
      usableTickers,
      byTickerResults,
      weightsByTicker,
      alignedDates,
      rebalanceMode
    );

    if (!strategyRun || !strategyRun.equity.every(Number.isFinite)) {
      return null;
    }

    const tickerTrades = usableTickers.reduce((sum, ticker) => {
      const metrics = byTickerResults[ticker]?.[strategyKey]?.metrics;
      return sum + (metrics?.trades || 0);
    }, 0);
    const tickerTurnover = usableTickers.reduce((sum, ticker) => {
      const metrics = byTickerResults[ticker]?.[strategyKey]?.metrics;
      return sum + (metrics?.turnoverRaw || 0) * ((weightsByTicker[ticker] || 0) / usableWeightSum);
    }, 0);

    result[strategyKey] = {
      equity: strategyRun.equity,
      metrics: metricsFromEquity(strategyRun.equity, {
        turnover: tickerTurnover + strategyRun.rebalanceTurnover,
        trades: tickerTrades + strategyRun.rebalanceTrades
      })
    };
  }

  return result;
}

function renderStrategyChart(portfolioResult, benchmarkSeries, byTickerResults, chartOptions, mainSeries) {
  if (!portfolioResult) return;
  const theme = chartThemeColors();
  const options = chartOptions || { strategyView: "equity", strategyFocus: "all", showBenchmark: true };
  const benchmarkNorm = benchmarkSeries
    ? normalizeCloses(getClosesByDates(benchmarkSeries.points, portfolioResult.dates) || [])
    : null;
  const portfolioBuyHold = portfolioResult.buyHold?.equity || [];

  const toSeries = (equity, strategyKey, ticker) => {
    if (options.strategyView === "drawdown") return computeDrawdownSeries(equity);
    if (options.strategyView === "edgeVsBuyHold") {
      if (ticker && byTickerResults?.[ticker]?.buyHold?.equity?.length === equity.length) {
        return computeExcessSeries(equity, byTickerResults[ticker].buyHold.equity);
      }
      return computeExcessSeries(equity, portfolioBuyHold);
    }
    if (options.strategyView === "excessBenchmark") {
      if (!benchmarkNorm || benchmarkNorm.length !== equity.length) {
        return Array(equity.length).fill(null);
      }
      return computeExcessSeries(equity, benchmarkNorm);
    }
    return equity;
  };

  const strategyLabelSuffix = {
    equity: "",
    drawdown: " Drawdown %",
    edgeVsBuyHold: " Edge vs BuyHold %",
    excessBenchmark: " Excess vs Benchmark %"
  }[options.strategyView] || "";

  const rebalanceLabel = portfolioResult.rebalanceMode === "monthly" ? " (Monthly Rebalanced)" : "";
  const strategyEntries = [
    { key: "buyHold", label: "Portfolio Buy & Hold", color: "#7ec8ff" },
    { key: "sma", label: "Portfolio SMA", color: "#ffc857" },
    { key: "rsi", label: "Portfolio RSI", color: "#ff7aa2" }
  ];
  const selected = options.strategyFocus === "all"
    ? strategyEntries
    : strategyEntries.filter((s) => s.key === options.strategyFocus);

  const datasets = selected.map((item) => ({
    label: `${item.label}${rebalanceLabel}${strategyLabelSuffix}`,
    data: toSeries(portfolioResult[item.key].equity, item.key, null).map((v) => (Number.isFinite(v) ? v : null)),
    borderColor: item.color,
    pointRadius: 0,
    tension: 0.12
  }));

  if (options.strategyFocus !== "all" && Array.isArray(mainSeries)) {
    mainSeries.forEach((entry, idx) => {
      const tickerRun = byTickerResults?.[entry.ticker]?.[options.strategyFocus];
      if (!tickerRun) return;
      datasets.push({
        label: `${entry.ticker} ${STRATEGY_LABELS[options.strategyFocus]}${strategyLabelSuffix}`,
        data: toSeries(tickerRun.equity, options.strategyFocus, entry.ticker).map((v) => (Number.isFinite(v) ? v : null)),
        borderColor: palette[idx % palette.length],
        borderDash: [3, 4],
        pointRadius: 0,
        tension: 0.12
      });
    });
  }

  if ((options.showBenchmark || options.strategyView === "excessBenchmark") && benchmarkSeries && benchmarkNorm?.length === portfolioResult.dates.length) {
    if (options.strategyView === "excessBenchmark") {
      datasets.push({
        label: `${benchmarkSeries.ticker} Baseline (0%)`,
        data: Array(portfolioResult.dates.length).fill(0),
        borderColor: "#d8e3f0",
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.12
      });
    } else {
      const benchmarkSeriesData = options.strategyView === "drawdown"
        ? computeDrawdownSeries(benchmarkNorm)
        : options.strategyView === "edgeVsBuyHold"
          ? computeExcessSeries(benchmarkNorm, portfolioBuyHold)
          : benchmarkNorm;
      datasets.push({
        label: `${benchmarkSeries.ticker} Buy & Hold${strategyLabelSuffix}`,
        data: benchmarkSeriesData.map((v) => (Number.isFinite(v) ? v : null)),
        borderColor: "#d8e3f0",
        borderDash: [7, 5],
        pointRadius: 0,
        tension: 0.12
      });
    }
  }

  strategyChart = new Chart(document.getElementById("strategyChart"), {
    type: "line",
    data: { labels: portfolioResult.dates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: theme.legend } }
      },
      scales: {
        x: { ticks: { color: theme.ticks, maxTicksLimit: 10 }, grid: { color: theme.grid } },
        y: { ticks: { color: theme.ticks }, grid: { color: theme.grid } }
      }
    }
  });
}

function chooseBestStrategy(result) {
  const candidates = [
    { key: "buyHold", name: STRATEGY_LABELS.buyHold, value: result.buyHold.metrics.totalReturn },
    { key: "sma", name: STRATEGY_LABELS.sma, value: result.sma.metrics.totalReturn },
    { key: "rsi", name: STRATEGY_LABELS.rsi, value: result.rsi.metrics.totalReturn }
  ].sort((a, b) => b.value - a.value);

  return candidates[0];
}

function renderTickerTable(mainSeries, byTickerResults) {
  resultsTableBody.innerHTML = "";
  const rows = [];

  mainSeries.forEach((entry) => {
    const result = byTickerResults[entry.ticker];
    if (!result) return;

    const best = chooseBestStrategy(result);
    const bestMetrics = result[best.key].metrics;
    rows.push({
      ticker: entry.ticker,
      buyHold: result.buyHold.metrics.totalReturn,
      sma: result.sma.metrics.totalReturn,
      rsi: result.rsi.metrics.totalReturn,
      best: best.name,
      bestSharpe: bestMetrics.sharpe,
      bestMaxDd: bestMetrics.maxDrawdown,
      bestTrades: bestMetrics.trades,
      bestTurnover: bestMetrics.turnoverAnnualized
    });
  });

  const sortedRows = sortRows(rows, "results");

  sortedRows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Ticker">${item.ticker}</td>
      <td data-label="BuyHold Ret">${formatPercent(item.buyHold)}</td>
      <td data-label="SMA Ret">${formatPercent(item.sma)}</td>
      <td data-label="RSI Ret">${formatPercent(item.rsi)}</td>
      <td data-label="Best">${item.best}</td>
      <td data-label="Best Sharpe">${formatRatio(item.bestSharpe)}</td>
      <td data-label="Best MaxDD">${formatPercent(item.bestMaxDd)}</td>
      <td data-label="Best Trades">${formatNumber(item.bestTrades)}</td>
      <td data-label="Best Turnover">${formatPercent(item.bestTurnover)}</td>
    `;
    resultsTableBody.appendChild(row);
  });

  if (!sortedRows.length) {
    const row = document.createElement("tr");
    row.className = "message-row";
    row.innerHTML = "<td colspan=\"9\">Not enough aligned historical data to run strategies.</td>";
    resultsTableBody.appendChild(row);
  }
}

function renderPortfolioTable(portfolioResult) {
  portfolioTableBody.innerHTML = "";

  if (!portfolioResult) {
    const row = document.createElement("tr");
    row.className = "message-row";
    row.innerHTML = "<td colspan=\"7\">Not enough data for portfolio metrics.</td>";
    portfolioTableBody.appendChild(row);
    return;
  }

  const rows = [];
  STRATEGIES.forEach((strategyKey) => {
    const metrics = portfolioResult[strategyKey].metrics;
    rows.push({
      strategy: STRATEGY_LABELS[strategyKey],
      totalReturn: metrics.totalReturn,
      sharpe: metrics.sharpe,
      vol: metrics.vol,
      maxDrawdown: metrics.maxDrawdown,
      trades: metrics.trades,
      turnover: metrics.turnoverAnnualized
    });
  });

  const sortedRows = sortRows(rows, "portfolio");
  sortedRows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Strategy">${item.strategy}</td>
      <td data-label="Total Return">${formatPercent(item.totalReturn)}</td>
      <td data-label="Sharpe">${formatRatio(item.sharpe)}</td>
      <td data-label="Volatility">${formatPercent(item.vol)}</td>
      <td data-label="Max Drawdown">${formatPercent(item.maxDrawdown)}</td>
      <td data-label="Trades">${formatNumber(item.trades)}</td>
      <td data-label="Turnover">${formatPercent(item.turnover)}</td>
    `;
    portfolioTableBody.appendChild(row);
  });
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function setSelectValueIfValid(selectEl, value) {
  const valid = Array.from(selectEl.options).some((opt) => opt.value === value);
  if (valid) selectEl.value = value;
}

async function initProviderOptions() {
  if (providerModeInput) providerModeInput.value = "twelvedata";
}

function exportAlignedPricesCsv() {
  if (isBusy) {
    setStatus("Please wait for current loading to finish.");
    return;
  }
  if (!latestRun) {
    setStatus("Run a comparison first.");
    return;
  }

  const { alignedDates, mainSeries, benchmarkSeries } = latestRun;
  const headers = ["date"];
  const closeByTicker = {};
  const normalizedByTicker = {};

  mainSeries.forEach((entry) => {
    headers.push(`${entry.ticker}_close`);
    headers.push(`${entry.ticker}_norm100`);
    const closes = getClosesByDates(entry.points, alignedDates) || [];
    closeByTicker[entry.ticker] = closes;
    normalizedByTicker[entry.ticker] = normalizeCloses(closes);
  });

  let benchmarkCloses = null;
  let benchmarkNorm = null;
  if (benchmarkSeries) {
    headers.push(`${benchmarkSeries.ticker}_close`);
    headers.push(`${benchmarkSeries.ticker}_norm100`);
    benchmarkCloses = getClosesByDates(benchmarkSeries.points, alignedDates) || [];
    benchmarkNorm = normalizeCloses(benchmarkCloses);
  }

  const rows = [headers];
  alignedDates.forEach((date, i) => {
    const row = [date];
    mainSeries.forEach((entry) => {
      row.push(closeByTicker[entry.ticker][i]);
      row.push(normalizedByTicker[entry.ticker][i]);
    });
    if (benchmarkSeries) {
      row.push(benchmarkCloses[i]);
      row.push(benchmarkNorm[i]);
    }
    rows.push(row);
  });

  downloadCsv("aligned_prices.csv", rows);
  setStatus("Exported aligned prices CSV.");
}

function exportTickerMetricsCsv() {
  if (isBusy) {
    setStatus("Please wait for current loading to finish.");
    return;
  }
  if (!latestRun) {
    setStatus("Run a comparison first.");
    return;
  }

  const rows = [[
    "ticker",
    "provider",
    "buyhold_return_pct",
    "sma_return_pct",
    "rsi_return_pct",
    "best_strategy",
    "best_sharpe",
    "best_max_drawdown_pct",
    "best_trades",
    "best_turnover_annualized_pct"
  ]];

  latestRun.mainSeries.forEach((entry) => {
    const result = latestRun.byTickerResults[entry.ticker];
    if (!result) return;

    const best = chooseBestStrategy(result);
    const bestMetrics = result[best.key].metrics;

    rows.push([
      entry.ticker,
      entry.provider || "",
      result.buyHold.metrics.totalReturn,
      result.sma.metrics.totalReturn,
      result.rsi.metrics.totalReturn,
      best.name,
      bestMetrics.sharpe,
      bestMetrics.maxDrawdown,
      bestMetrics.trades,
      bestMetrics.turnoverAnnualized
    ]);
  });

  downloadCsv("ticker_strategy_metrics.csv", rows);
  setStatus("Exported ticker metrics CSV.");
}

function exportPortfolioCsv() {
  if (isBusy) {
    setStatus("Please wait for current loading to finish.");
    return;
  }
  if (!latestRun || !latestRun.portfolioResult) {
    setStatus("Run a comparison with enough aligned data first.");
    return;
  }

  const { portfolioResult, benchmarkSeries } = latestRun;

  const summaryRows = [[
    "strategy",
    "total_return_pct",
    "sharpe",
    "volatility_pct",
    "max_drawdown_pct",
    "trades",
    "turnover_annualized_pct"
  ]];
  STRATEGIES.forEach((strategyKey) => {
    const metrics = portfolioResult[strategyKey].metrics;
    summaryRows.push([
      STRATEGY_LABELS[strategyKey] || strategyKey,
      metrics.totalReturn,
      metrics.sharpe,
      metrics.vol,
      metrics.maxDrawdown,
      metrics.trades,
      metrics.turnoverAnnualized
    ]);
  });

  const curveHeaders = ["date", "portfolio_buyhold", "portfolio_sma", "portfolio_rsi"];
  let benchmarkNorm = null;
  if (benchmarkSeries) {
    benchmarkNorm = normalizeCloses(getClosesByDates(benchmarkSeries.points, portfolioResult.dates) || []);
    if (benchmarkNorm.length === portfolioResult.dates.length) {
      curveHeaders.push(`${benchmarkSeries.ticker}_norm100`);
    }
  }

  const curveRows = [curveHeaders];
  portfolioResult.dates.forEach((date, i) => {
    const row = [
      date,
      portfolioResult.buyHold.equity[i],
      portfolioResult.sma.equity[i],
      portfolioResult.rsi.equity[i]
    ];
    if (benchmarkNorm && benchmarkNorm.length === portfolioResult.dates.length) {
      row.push(benchmarkNorm[i]);
    }
    curveRows.push(row);
  });

  downloadCsv("portfolio_metrics_and_curves.csv", [...summaryRows, ...curveRows]);
  setStatus("Exported portfolio CSV.");
}

async function copyShareLink() {
  writeStateToUrl();
  const url = window.location.href;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setStatus("Share link copied.");
  } catch (err) {
    setStatus(`Could not copy link: ${err.message}`);
  }
}

function handleGlobalShortcut(event) {
  if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;
  if (isBusy) return;
  event.preventDefault();
  runComparison();
}

function canonicalizeBenchmark() {
  const normalizedBenchmark = parseTickerValue(benchmarkInput?.value) || "SPY";
  if (benchmarkInput) benchmarkInput.value = normalizedBenchmark;
}

async function refreshQuotes(tickers) {
  try {
    const quoteResponse = await fetch(
      `${apiUrl("/api/quotes")}?tickers=${encodeURIComponent(tickers.join(","))}`
    );
    const quoteData = await safeJson(quoteResponse);
    if (!quoteResponse.ok || !quoteData) {
      throw new Error("Quote API returned invalid response.");
    }
    renderQuotes(quoteData.quotes || [], quoteData.errors || []);
  } catch (err) {
    setStatus(`Quote refresh failed: ${err.message}`);
  }
}

async function runComparison(event) {
  if (event) event.preventDefault();
  if (isBusy) return;

  const tickers = parseTickers();
  if (!tickers.length) {
    setStatus("Please enter at least one valid ticker.");
    return;
  }
  tickersInput.value = tickers.join(",");
  canonicalizeBenchmark();

  const rebalanceMode = rebalanceModeInput.value;
  const benchmarkTicker = parseTickerValue(benchmarkInput.value) || "SPY";
  const chartOptions = buildChartOptions(benchmarkTicker);
  const mixAmountMode = ["percent", "dollars", "shares"].includes(mixAmountModeInput?.value)
    ? mixAmountModeInput.value
    : "percent";
  if (mixAmountModeInput) mixAmountModeInput.value = mixAmountMode;
  const mixEnabled = Boolean(mixCompareEnabledInput?.checked);
  const mixAEntries = mixEnabled ? parseMixEntries(mixAInput?.value) : [];
  const mixBEntries = mixEnabled ? parseMixEntries(mixBInput?.value) : [];

  if (mixEnabled && (!mixAEntries.length || !mixBEntries.length)) {
    setStatus("Portfolio mix comparison is enabled. Add valid entries in both A and B, e.g. AAPL:40,MSFT:60");
    return;
  }
  const strategyInputs = {
    smaFast: Number(smaFastInput.value),
    smaSlow: Number(smaSlowInput.value),
    rsiPeriod: Number(rsiPeriodInput.value),
    rsiBuy: Number(rsiBuyInput.value),
    rsiSell: Number(rsiSellInput.value),
    tradeCostBps: Number(tradeCostInput.value),
    slippageBps: Number(slippageInput.value)
  };
  const minOverlapDays = Number(minOverlapDaysInput.value);

  if (strategyInputs.smaFast >= strategyInputs.smaSlow) {
    setStatus("SMA fast must be less than SMA slow.");
    return;
  }

  if (strategyInputs.rsiBuy >= strategyInputs.rsiSell) {
    setStatus("RSI buy must be less than RSI sell.");
    return;
  }

  if (!Number.isFinite(strategyInputs.rsiPeriod) || strategyInputs.rsiPeriod < 2 || strategyInputs.rsiPeriod > 50) {
    setStatus("RSI period must be between 2 and 50.");
    return;
  }

  if (strategyInputs.tradeCostBps < 0 || strategyInputs.slippageBps < 0) {
    setStatus("Trading cost and slippage must be >= 0.");
    return;
  }

  if (!Number.isFinite(minOverlapDays) || minOverlapDays < 20 || minOverlapDays > 260) {
    setStatus("Min overlap days must be between 20 and 260.");
    return;
  }

  const weightConfig = buildWeights(tickers);
  if (weightConfig.error) {
    setStatus(weightConfig.error);
    return;
  }

  const mixTickers = mixEnabled
    ? [...new Set([...mixAEntries.map((r) => r.ticker), ...mixBEntries.map((r) => r.ticker)])]
    : [];
  const comparisonUniverse = [...new Set([...tickers, benchmarkTicker, ...mixTickers])];
  const range = rangeInput.value;
  setBusyState(true);
  setStatus("Loading comparison data...");

  try {
    const response = await fetch(
      `${apiUrl("/api/compare")}?tickers=${encodeURIComponent(comparisonUniverse.join(","))}&range=${encodeURIComponent(range)}`
    );
    const data = await safeJson(response);
    if (!data) {
      throw new Error("Compare API returned invalid JSON.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch data.");
    }

    if (!data.series || !data.series.length) {
      throw new Error("No ticker data returned.");
    }

    const seriesByTicker = Object.fromEntries(data.series.map((entry) => [entry.ticker, entry]));
    const mainSeries = tickers.map((ticker) => seriesByTicker[ticker]).filter(Boolean);
    const benchmarkSeries = benchmarkTicker ? seriesByTicker[benchmarkTicker] : null;
    const baseSeries = benchmarkSeries || mainSeries[0];

    if (!mainSeries.length) {
      throw new Error("No valid data returned for selected tickers.");
    }

    const alignedDates = getCommonDates(mainSeries);
    if (alignedDates.length < minOverlapDays) {
      throw new Error(`Not enough overlapping dates across tickers (need ${minOverlapDays}+, got ${alignedDates.length}).`);
    }

    destroyCharts();

    const byTickerResults = {};
    mainSeries.forEach((entry) => {
      const closes = getClosesByDates(entry.points, alignedDates);
      if (closes && closes.length > 30 && closes.every(Number.isFinite)) {
        byTickerResults[entry.ticker] = backtest(closes, strategyInputs);
      }
    });

    const portfolioResult = buildPortfolioResult(
      mainSeries,
      byTickerResults,
      weightConfig.weightsByTicker,
      alignedDates,
      rebalanceMode
    );
    const mixComparisonResult = mixEnabled
      ? buildMixComparison(seriesByTicker, benchmarkSeries, mixAmountMode, minOverlapDays)
      : null;

    updateChartTitles(chartOptions);
    renderPriceChart(mainSeries, alignedDates, benchmarkSeries, baseSeries, chartOptions);
    renderStrategyChart(portfolioResult, benchmarkSeries, byTickerResults, chartOptions, mainSeries);
    renderMixComparison(mixComparisonResult, benchmarkSeries);
    renderTickerTable(mainSeries, byTickerResults);
    renderPortfolioTable(portfolioResult);
    renderInsights(mainSeries, byTickerResults, alignedDates, benchmarkSeries, portfolioResult);

    const quoteTickers = comparisonUniverse;
    await refreshQuotes(quoteTickers);

    latestRun = {
      alignedDates,
      mainSeries,
      benchmarkSeries,
      baseSeries,
      byTickerResults,
      portfolioResult,
      chartOptions,
      mixComparisonResult
    };

    const costSummary = `${strategyInputs.tradeCostBps}bps cost + ${strategyInputs.slippageBps}bps slippage`;
    const refreshSummary = parseRefreshIntervalMs() > 0
      ? `auto-refresh ${(parseRefreshIntervalMs() / 1000).toFixed(0)}s`
      : "auto-refresh off";
    const usedProviders = [...new Set((data.series || []).map((s) => s.provider).filter(Boolean))];
    const providerSummary = usedProviders.length ? usedProviders.join(", ") : "twelvedata";
    const mixSummary = !mixEnabled
      ? ""
      : mixComparisonResult?.error
        ? `, mix skipped (${mixComparisonResult.error})`
        : ", mix A/B ready";
    renderKpis(mainSeries, portfolioResult);
    writeStateToUrl();
    const refreshedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (data.errors && data.errors.length) {
      setStatus(
        `Loaded with partial data at ${refreshedAt} (${providerSummary}, benchmark ${benchmarkTicker}, ${weightConfig.mode}, rebalance ${rebalanceMode}, ${costSummary}, ${refreshSummary}${mixSummary}). Failed: ${data.errors.map((e) => e.ticker).join(", ")}`
      );
    } else {
      setStatus(
        `Loaded ${mainSeries.length} ticker(s) at ${refreshedAt}, provider ${providerSummary}, benchmark ${benchmarkTicker || "none"}, ${weightConfig.mode} weighting, rebalance ${rebalanceMode}, ${costSummary}, ${refreshSummary}${mixSummary}.`
      );
    }

    lastTickers = quoteTickers;
    startQuoteRefresh();
  } catch (err) {
    setStatus(`Comparison failed: ${err.message}`);
  } finally {
    setBusyState(false);
  }
}

form.addEventListener("submit", runComparison);
exportPricesBtn.addEventListener("click", exportAlignedPricesCsv);
exportTickerMetricsBtn.addEventListener("click", exportTickerMetricsCsv);
exportPortfolioBtn.addEventListener("click", exportPortfolioCsv);
if (copyLinkBtn) copyLinkBtn.addEventListener("click", copyShareLink);
if (advancedToggleBtn) advancedToggleBtn.addEventListener("click", toggleAdvancedPanel);
if (advancedResetBtn) advancedResetBtn.addEventListener("click", resetAdvancedControls);
themeToggleBtn.addEventListener("click", toggleTheme);
presetButtons.forEach((btn) => btn.addEventListener("click", applyPreset));
if (weightingModeInput) {
  weightingModeInput.addEventListener("change", () => {
    syncWeightInputState();
    if (weightingModeInput.value === "custom") {
      ensureCustomWeightsDefault(parseTickers());
    }
  });
}
if (tickersInput) {
  tickersInput.addEventListener("blur", () => {
    const parsed = parseTickers();
    tickersInput.value = parsed.join(",");
    ensureCustomWeightsDefault(parsed);
  });
}
if (benchmarkInput) {
  benchmarkInput.addEventListener("blur", () => {
    canonicalizeBenchmark();
    rerenderChartsIfPossible();
  });
}
if (quoteRefreshInput) {
  quoteRefreshInput.addEventListener("change", () => {
    if (!lastTickers.length) return;
    startQuoteRefresh();
  });
}
[
  priceCompareModeInput,
  priceScaleInput,
  strategyViewModeInput,
  strategyFocusInput,
  showBenchmarkOverlayInput
].filter(Boolean).forEach((el) => {
  el.addEventListener("change", rerenderChartsIfPossible);
});
[
  mixCompareEnabledInput,
  mixAmountModeInput,
  mixAInput,
  mixBInput
].filter(Boolean).forEach((el) => {
  const eventName = el.tagName === "TEXTAREA" ? "blur" : "change";
  el.addEventListener(eventName, () => {
    const hasMixInputs = Boolean((mixAInput?.value || "").trim()) || Boolean((mixBInput?.value || "").trim());
    if (!mixCompareEnabledInput?.checked || !hasMixInputs) {
      renderMixComparison(null, latestRun?.benchmarkSeries || null);
    }
    setStatus("Mix comparison settings updated. Click Run Comparison to refresh mix A/B.");
  });
});
sortableHeaders.forEach((th) => {
  th.addEventListener("click", handleSortableHeaderAction);
  th.addEventListener("keydown", handleSortableHeaderKeydown);
});
document.addEventListener("keydown", handleGlobalShortcut);
document.addEventListener("visibilitychange", () => {
  if (document.hidden || isBusy || !lastTickers.length || parseRefreshIntervalMs() <= 0) return;
  refreshQuotes(lastTickers);
});

loadStateFromUrl();
canonicalizeBenchmark();
const storedAdvancedOpen = getStoredAdvancedOpen();
setAdvancedOpen(storedAdvancedOpen === null ? urlHasAdvancedParams() : storedAdvancedOpen);
syncWeightInputState();
setTheme(getPreferredTheme());
updateSortAria();
updateChartTitles(buildChartOptions(currentBenchmarkTicker()));
initProviderOptions().finally(() => {
  runComparison();
});
