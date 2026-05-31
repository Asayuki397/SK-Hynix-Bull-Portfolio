// Default Constants & Baseline config
const DEFAULT_CONFIG = {
    // Hyperliquid
    hlEntryVal: 23020.23, // USDC
    hlEntryPx: 1553.5,    // USDC
    hlLeverage: 5,
    hlLiqPx: 1300.4,      // USDC
    
    // ETF
    etfShares: 1282,
    etfBuyPx: 25288,      // KRW
    etfLeverageMult: 2,   // 2x leverage
    
    // Market Baselines (May 29, 2026 Close)
    stockBaseline: 2333000, // KRW
    etfBaseline: 23695      // KRW
};

// Application State
let state = {
    config: { ...DEFAULT_CONFIG },
    market: {
        usdKrwRate: 1506.66, // Default fallback
        hlPrice: 0,
        hlPrevDayPrice: 1545.10, // Default fallback
        hlOraclePrice: 0,
        hlMidPrice: 0
    },
    previousMarket: null
};

// UI Elements
const els = {
    // Top bar
    rateDisplay: document.getElementById('rate-display'),
    updateTimestamp: document.getElementById('update-timestamp'),
    
    // Overview
    totalNav: document.getElementById('total-nav'),
    totalExposure: document.getElementById('total-exposure'),
    totalPnl: document.getElementById('total-pnl'),
    totalPnlRoi: document.getElementById('total-pnl-roi'),
    portfolioPnlCard: document.getElementById('portfolio-pnl-card'),
    totalChange: document.getElementById('total-change'),
    totalChangePct: document.getElementById('total-change-pct'),
    portfolioChangeCard: document.getElementById('portfolio-change-card'),
    
    // Hyperliquid Position card
    hlPriceDisplay: document.getElementById('hl-price-display'),
    hlPnlDisplay: document.getElementById('hl-pnl-display'),
    hlDetailSize: document.getElementById('hl-detail-size'),
    hlDetailEntry: document.getElementById('hl-detail-entry'),
    hlDetailValUsd: document.getElementById('hl-detail-val-usd'),
    hlDetailValKrw: document.getElementById('hl-detail-val-krw'),
    hlDetailCollateral: document.getElementById('hl-detail-collateral'),
    hlDetailEquityKrw: document.getElementById('hl-detail-equity-krw'),
    hlDetailLiq: document.getElementById('hl-detail-liq'),
    hlDetailDailyChange: document.getElementById('hl-detail-daily-change'),
    hlSafetyPct: document.getElementById('hl-safety-pct'),
    hlSafetyBar: document.getElementById('hl-safety-bar'),
    
    // ETF card
    etfPriceDisplay: document.getElementById('etf-price-display'),
    etfPnlDisplay: document.getElementById('etf-pnl-display'),
    etfDetailShares: document.getElementById('etf-detail-shares'),
    etfDetailAvgPrice: document.getElementById('etf-detail-avg-price'),
    etfDetailCost: document.getElementById('etf-detail-cost'),
    etfDetailVal: document.getElementById('etf-detail-val'),
    etfDetailExposure: document.getElementById('etf-detail-exposure'),
    etfDetailRoi: document.getElementById('etf-detail-roi'),
    etfDetailImpliedStock: document.getElementById('etf-detail-implied-stock'),
    etfDetailStockBaseline: document.getElementById('etf-detail-stock-baseline'),
    etfDetailEtfBaseline: document.getElementById('etf-detail-etf-baseline'),
    
    // Panel Trigger & Form
    settingsTrigger: document.getElementById('settings-trigger'),
    settingsForm: document.getElementById('settings-form'),
    triggerArrow: document.getElementById('trigger-arrow')
};

// Load saved config on startup
function loadConfig() {
    const saved = localStorage.getItem('hynix_portfolio_config');
    if (saved) {
        try {
            state.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            showToast('Configuration loaded from localStorage.', 'success');
        } catch (e) {
            console.error('Failed to parse saved config, using defaults', e);
        }
    }
    populateForm(true);
}

// Populate the settings form inputs
function populateForm(force = false) {
    // If settings form is focused (user typing), don't overwrite unless forced
    const isFormFocused = document.activeElement && document.activeElement.form === els.settingsForm;
    if (isFormFocused && !force) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    
    setVal('hl-entry-val', state.config.hlEntryVal);
    setVal('hl-entry-px', state.config.hlEntryPx);
    setVal('hl-leverage', state.config.hlLeverage);
    setVal('hl-liq-px', state.config.hlLiqPx);
    
    setVal('etf-shares', state.config.etfShares);
    setVal('etf-buy-px', state.config.etfBuyPx);
    setVal('etf-leverage-mult', state.config.etfLeverageMult);
    
    setVal('stock-baseline', state.config.stockBaseline);
    setVal('etf-baseline', state.config.etfBaseline);
}

// Save config from form
function saveConfig(e) {
    e.preventDefault();
    
    const getFloatVal = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? (parseFloat(el.value) || fallback) : fallback;
    };
    
    const getIntVal = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? (parseInt(el.value) || fallback) : fallback;
    };
    
    state.config.hlEntryVal = getFloatVal('hl-entry-val', DEFAULT_CONFIG.hlEntryVal);
    state.config.hlEntryPx = getFloatVal('hl-entry-px', DEFAULT_CONFIG.hlEntryPx);
    state.config.hlLeverage = getIntVal('hl-leverage', DEFAULT_CONFIG.hlLeverage);
    state.config.hlLiqPx = getFloatVal('hl-liq-px', DEFAULT_CONFIG.hlLiqPx);
    
    state.config.etfShares = getIntVal('etf-shares', DEFAULT_CONFIG.etfShares);
    state.config.etfBuyPx = getFloatVal('etf-buy-px', DEFAULT_CONFIG.etfBuyPx);
    state.config.etfLeverageMult = getFloatVal('etf-leverage-mult', DEFAULT_CONFIG.etfLeverageMult);
    
    state.config.stockBaseline = getFloatVal('stock-baseline', DEFAULT_CONFIG.stockBaseline);
    state.config.etfBaseline = getFloatVal('etf-baseline', DEFAULT_CONFIG.etfBaseline);
    
    localStorage.setItem('hynix_portfolio_config', JSON.stringify(state.config));
    showToast('Configuration saved and applied!', 'success');
    
    // Collapse settings panel after saving
    if (els.settingsTrigger) {
        els.settingsTrigger.classList.add('collapsed');
    }
    
    populateForm(true);
    calculateAndRender();
}

// Toast System
function showToast(message, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'none'; // reset animation to fade out or remove
        toast.remove();
    }, 4000);
}

// Number Formatting Helpers
const formatKRW = (num) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(num);
const formatUSD = (num, decimals = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
const formatPct = (num) => (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
const formatNum = (num, decimals = 4) => num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Fetch Live Data
async function fetchLiveData() {
    try {
        // 1. Fetch USD/KRW Exchange Rate
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!rateRes.ok) throw new Error('Exchange rate API response not OK');
        const rateData = await rateRes.json();
        const currentRate = rateData.rates.KRW;
        if (currentRate) {
            state.market.usdKrwRate = parseFloat(currentRate);
        }

        // 2. Fetch Hyperliquid xyz:SKHX
        try {
            const hlRes = await fetch('https://api.hyperliquid.xyz/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'metaAndAssetCtxs', dex: 'xyz' })
            });
            if (hlRes.ok) {
                const hlData = await hlRes.json();
                const universe = hlData[0].universe;
                const ctxs = hlData[1];
                
                let targetIndex = -1;
                for (let i = 0; i < universe.length; i++) {
                    if (universe[i].name === 'xyz:SKHX') {
                        targetIndex = i;
                        break;
                    }
                }
                
                if (targetIndex >= 0) {
                    const ctx = ctxs[targetIndex];
                    state.market.hlPrice = parseFloat(ctx.midPx || ctx.markPx) || 0;
                    state.market.hlOraclePrice = parseFloat(ctx.oraclePx) || 0;
                    state.market.hlMidPrice = parseFloat(ctx.midPx || ctx.markPx) || 0;
                    state.market.hlPrevDayPrice = parseFloat(ctx.prevDayPx) || 0;
                } else {
                    console.warn('Asset xyz:SKHX not found in Hyperliquid universe (market likely closed).');
                }
            } else {
                console.error('Hyperliquid API response not OK');
            }
        } catch (e) {
            console.error('Failed to fetch Hyperliquid prices:', e);
        }

        // 3. Fetch Naver Stock & ETF baselines when market is open
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const proxyUrl = isLocal ? '/api/proxy?url=' : 'https://api.allorigins.win/get?url=';
            const stockUrl = proxyUrl + encodeURIComponent('https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:000660');
            const etfUrl = proxyUrl + encodeURIComponent('https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:0195S0');

            let baselinesUpdated = false;

            // Fetch Stock baseline close (pcv = previous close value when open, nv = today's regular session close when closed)
            const stockRes = await fetch(stockUrl);
            if (stockRes.ok) {
                let text = await stockRes.text();
                if (!isLocal) {
                    const json = JSON.parse(text);
                    text = json.contents;
                }
                const data = JSON.parse(text);
                const stockData = data?.result?.areas?.[0]?.datas?.[0];
                if (stockData) {
                    let realStockBaseline = 0;
                    if (stockData.ms === 'OPEN') {
                        realStockBaseline = parseFloat(stockData.pcv || stockData.sv);
                    } else if (stockData.ms === 'CLOSE') {
                        realStockBaseline = parseFloat(stockData.nv || stockData.sv);
                    }
                    
                    if (realStockBaseline && realStockBaseline !== state.config.stockBaseline) {
                        state.config.stockBaseline = realStockBaseline;
                        baselinesUpdated = true;
                    }
                }
            }

            // Fetch ETF baseline close (pcv = previous close value when open, nv = today's regular session close when closed)
            const etfRes = await fetch(etfUrl);
            if (etfRes.ok) {
                let text = await etfRes.text();
                if (!isLocal) {
                    const json = JSON.parse(text);
                    text = json.contents;
                }
                const data = JSON.parse(text);
                const etfData = data?.result?.areas?.[0]?.datas?.[0];
                if (etfData) {
                    let realEtfBaseline = 0;
                    if (etfData.ms === 'OPEN') {
                        realEtfBaseline = parseFloat(etfData.pcv || etfData.sv);
                    } else if (etfData.ms === 'CLOSE') {
                        realEtfBaseline = parseFloat(etfData.nv || etfData.sv);
                    }
                    
                    if (realEtfBaseline && realEtfBaseline !== state.config.etfBaseline) {
                        state.config.etfBaseline = realEtfBaseline;
                        baselinesUpdated = true;
                    }
                }
            }

            if (baselinesUpdated) {
                localStorage.setItem('hynix_portfolio_config', JSON.stringify(state.config));
                populateForm(false); // Sync inputs in form safely (doesn't overwrite if user is typing)
            }
        } catch (e) {
            console.error('Failed to sync baseline close values from Naver:', e);
        }

        // Update timestamp
        const now = new Date();
        if (els.updateTimestamp) {
            els.updateTimestamp.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
        }
        
        // Success Toast (only occasional, not on every poll to prevent noise)
        if (Math.random() < 0.1) {
            showToast('Data synced successfully.', 'success');
        }

        calculateAndRender();

    } catch (error) {
        console.error('Error fetching live data:', error);
        showToast('Error syncing live market data. Using cached/default feeds.', 'error');
        // Render with fallback/existing state anyway
        calculateAndRender();
    }
}

// Flash Animation Handler on Value Change
function updateAndFlash(element, valueText, numericValue, prevNumericValue, isPositiveNegativeStyle = false) {
    if (!element) return;
    
    // Check if value changed
    if (prevNumericValue !== undefined && prevNumericValue !== null && numericValue !== prevNumericValue) {
        element.classList.remove('flash-up', 'flash-down');
        // Force reflow
        void element.offsetWidth;
        
        if (numericValue > prevNumericValue) {
            element.classList.add('flash-up');
        } else {
            element.classList.add('flash-down');
        }
    }
    
    element.textContent = valueText;
    
    if (isPositiveNegativeStyle) {
        if (numericValue > 0) {
            element.className = 'value up';
        } else if (numericValue < 0) {
            element.className = 'value down';
        } else {
            element.className = 'value';
        }
    }
}

// Primary Calculations & Render loop
function calculateAndRender() {
    const config = state.config;
    const market = state.market;
    const prevMarket = state.previousMarket;
    
    // ----------------------------------------------------
    // 1. Hyperliquid Calculations
    // ----------------------------------------------------
    const hlSize = config.hlEntryVal / config.hlEntryPx;
    const hlCurrentPrice = market.hlPrice || config.hlEntryPx; // fallback to entry if 0
    const hlValueUsd = hlSize * hlCurrentPrice;
    const hlValueKrw = hlValueUsd * market.usdKrwRate;
    
    const hlPnlUsd = hlSize * (hlCurrentPrice - config.hlEntryPx);
    const hlPnlKrw = hlPnlUsd * market.usdKrwRate;
    
    const hlCollateralUsd = config.hlEntryVal / config.hlLeverage;
    const hlEquityUsd = hlCollateralUsd + hlPnlUsd;
    const hlEquityKrw = hlEquityUsd * market.usdKrwRate;
    
    // Margin Health / Distance to liquidation
    // Distance from current price to liquidation price
    const distToLiq = hlCurrentPrice - config.hlLiqPx;
    const entryToLiq = config.hlEntryPx - config.hlLiqPx;
    // Health is 100% when current >= entry, scale down to 0% at liquidation
    const safetyScore = Math.max(0, Math.min(100, (distToLiq / entryToLiq) * 100));
    
    // Daily Change
    const hlDailyChangePx = hlCurrentPrice - market.hlPrevDayPrice;
    const hlDailyChangePct = (hlDailyChangePx / market.hlPrevDayPrice) * 100;
    const hlDailyChangeUsd = hlSize * hlDailyChangePx;
    const hlDailyChangeKrw = hlDailyChangeUsd * market.usdKrwRate;

    // ----------------------------------------------------
    // 2. Leveraged ETF Calculations
    // ----------------------------------------------------
    // Underlying stock price in KRW = HL Perp price in USD * exchange rate
    const stockPriceKrw = hlCurrentPrice * market.usdKrwRate;
    
    // Stock daily return = (Current stock price / stock baseline close) - 1
    const stockDailyReturn = (stockPriceKrw / config.stockBaseline) - 1;
    
    // Theoretical ETF Price = ETF baseline close * (1 + 2 * stock daily return)
    const etfTheoreticalPrice = config.etfBaseline * (1 + (config.etfLeverageMult * stockDailyReturn));
    
    const etfTotalCost = config.etfShares * config.etfBuyPx;
    const etfTheoreticalValue = config.etfShares * etfTheoreticalPrice;
    const etfPnlKrw = etfTheoreticalValue - etfTotalCost;
    const etfRoiPct = (etfPnlKrw / etfTotalCost) * 100;
    
    // ETF Daily Change
    const etfDailyReturn = config.etfLeverageMult * stockDailyReturn;
    const etfDailyChangeKrw = (etfTheoreticalPrice - config.etfBaseline) * config.etfShares;

    // ----------------------------------------------------
    // 3. Combined Portfolio Metrics
    // ----------------------------------------------------
    // Net Asset Value (NAV) = HL Margin Equity + ETF Value
    const totalNavKrw = hlEquityKrw + etfTheoreticalValue;
    
    // Total Exposure = HL Position Value + ETF Exposure Value (Value * Leverage Multiplier)
    const etfExposureKrw = etfTheoreticalValue * config.etfLeverageMult;
    const totalExposureKrw = hlValueKrw + etfExposureKrw;
    
    // Total Daily Change = HL Daily Change + ETF Daily Change
    const totalDailyChangeKrw = hlDailyChangeKrw + etfDailyChangeKrw;
    // Total Portfolio NAV Yesterday = Total NAV - Total Daily Change
    const totalNavYesterday = totalNavKrw - totalDailyChangeKrw;
    const totalDailyChangePct = totalNavYesterday > 0 ? (totalDailyChangeKrw / totalNavYesterday) * 100 : 0;

    // Total Unrealized PnL & ROI
    const totalPnlKrw = hlPnlKrw + etfPnlKrw;
    const totalCostKrw = (hlCollateralUsd * market.usdKrwRate) + etfTotalCost;
    const totalRoiPct = totalCostKrw > 0 ? (totalPnlKrw / totalCostKrw) * 100 : 0;

    // ----------------------------------------------------
    // 4. Render UI
    // ----------------------------------------------------
    
    // Top Bar exchange rate
    const prevRate = prevMarket ? prevMarket.usdKrwRate : null;
    updateAndFlash(els.rateDisplay, `${formatNum(market.usdKrwRate, 2)} KRW`, market.usdKrwRate, prevRate);

    // Overview Cards
    const prevNav = prevMarket ? (prevMarket.hlPrice ? 
        ((config.hlEntryVal / config.hlLeverage + (config.hlEntryVal / config.hlEntryPx) * (prevMarket.hlPrice - config.hlEntryPx)) * prevMarket.usdKrwRate) + 
        (config.etfShares * (config.etfBaseline * (1 + config.etfLeverageMult * ((prevMarket.hlPrice * prevMarket.usdKrwRate / config.stockBaseline) - 1))))
        : null) : null;

    const prevExposure = prevMarket ? (prevMarket.hlPrice ? 
        (((config.hlEntryVal / config.hlEntryPx) * prevMarket.hlPrice * prevMarket.usdKrwRate) + 
        (config.etfShares * (config.etfBaseline * (1 + config.etfLeverageMult * ((prevMarket.hlPrice * prevMarket.usdKrwRate / config.stockBaseline) - 1))) * config.etfLeverageMult))
        : null) : null;
        
    updateAndFlash(els.totalNav, formatKRW(totalNavKrw), totalNavKrw, prevNav);
    updateAndFlash(els.totalExposure, formatKRW(totalExposureKrw), totalExposureKrw, prevExposure);
    
    // Render PnL Card
    const prevPnl = prevMarket ? (prevMarket.hlPrice ? 
        (((config.hlEntryVal / config.hlEntryPx) * (prevMarket.hlPrice - config.hlEntryPx)) * prevMarket.usdKrwRate) + 
        (config.etfShares * ((config.etfBaseline * (1 + config.etfLeverageMult * ((prevMarket.hlPrice * prevMarket.usdKrwRate / config.stockBaseline) - 1))) - config.etfBuyPx))
        : null) : null;
        
    const pnlText = `${totalPnlKrw >= 0 ? '+' : ''}${formatKRW(totalPnlKrw)}`;
    updateAndFlash(els.totalPnl, pnlText, totalPnlKrw, prevPnl);
    els.totalPnlRoi.textContent = `${formatPct(totalRoiPct)} Total Return on Investment`;
    
    if (totalPnlKrw >= 0) {
        els.portfolioPnlCard.classList.remove('negative');
        els.totalPnl.style.color = 'var(--color-up)';
    } else {
        els.portfolioPnlCard.classList.add('negative');
        els.totalPnl.style.color = 'var(--color-down)';
    }
    
    // Daily Change Overview Pill
    const dailyChangeText = `${formatKRW(totalDailyChangeKrw)} (${formatPct(totalDailyChangePct)})`;
    updateAndFlash(els.totalChange, dailyChangeText, totalDailyChangeKrw, null);
    els.totalChangePct.textContent = `Daily Change based on KST Timeframe (UTC+09)`;
    
    if (totalDailyChangeKrw >= 0) {
        els.portfolioChangeCard.classList.remove('negative');
        els.totalChange.style.color = 'var(--color-up)';
    } else {
        els.portfolioChangeCard.classList.add('negative');
        els.totalChange.style.color = 'var(--color-down)';
    }

    // --- Hyperliquid Perpetual Details ---
    const prevHlPrice = prevMarket ? prevMarket.hlPrice : null;
    updateAndFlash(els.hlPriceDisplay, formatUSD(hlCurrentPrice), hlCurrentPrice, prevHlPrice);
    updateAndFlash(els.hlPnlDisplay, `${hlPnlUsd >= 0 ? '+' : ''}${formatUSD(hlPnlUsd)}`, hlPnlUsd, null, true);
    
    els.hlDetailSize.textContent = formatNum(hlSize, 4);
    els.hlDetailEntry.textContent = formatUSD(config.hlEntryPx);
    els.hlDetailValUsd.textContent = formatUSD(hlValueUsd);
    els.hlDetailValKrw.textContent = formatKRW(hlValueKrw);
    els.hlDetailCollateral.textContent = formatUSD(hlCollateralUsd);
    els.hlDetailEquityKrw.textContent = formatKRW(hlEquityKrw);
    els.hlDetailLiq.textContent = formatUSD(config.hlLiqPx);
    
    // HL Daily Change display
    els.hlDetailDailyChange.textContent = `${hlDailyChangePx >= 0 ? '+' : ''}${formatUSD(hlDailyChangePx)} (${formatPct(hlDailyChangePct)})`;
    els.hlDetailDailyChange.style.color = hlDailyChangePx >= 0 ? 'var(--color-up)' : 'var(--color-down)';

    // HL Safety Bar
    els.hlSafetyPct.textContent = `${safetyScore.toFixed(1)}% Safe`;
    els.hlSafetyBar.style.width = `${safetyScore}%`;
    if (safetyScore > 50) {
        els.hlSafetyPct.style.color = 'var(--color-up)';
    } else if (safetyScore > 20) {
        els.hlSafetyPct.style.color = '#eab308'; // Warning yellow
    } else {
        els.hlSafetyPct.style.color = 'var(--color-down)';
    }

    // --- Leveraged ETF Details ---
    updateAndFlash(els.etfPriceDisplay, formatKRW(etfTheoreticalPrice), etfTheoreticalPrice, prevNav ? etfTheoreticalPrice : null);
    updateAndFlash(els.etfPnlDisplay, `${etfPnlKrw >= 0 ? '+' : ''}${formatKRW(etfPnlKrw)}`, etfPnlKrw, null, true);
    
    els.etfDetailShares.textContent = formatNum(config.etfShares, 0);
    els.etfDetailAvgPrice.textContent = formatKRW(config.etfBuyPx);
    els.etfDetailCost.textContent = formatKRW(etfTotalCost);
    els.etfDetailVal.textContent = formatKRW(etfTheoreticalValue);
    els.etfDetailExposure.textContent = formatKRW(etfExposureKrw);
    
    els.etfDetailRoi.textContent = formatPct(etfRoiPct);
    els.etfDetailRoi.style.color = etfPnlKrw >= 0 ? 'var(--color-up)' : 'var(--color-down)';
    
    els.etfDetailImpliedStock.textContent = formatKRW(stockPriceKrw);
    els.etfDetailStockBaseline.textContent = formatKRW(config.stockBaseline);
    els.etfDetailEtfBaseline.textContent = formatKRW(config.etfBaseline);

    // Save previous market details to check changes next time
    state.previousMarket = { ...market };
}

// Collapsible Configurations Accordion
els.settingsTrigger.addEventListener('click', () => {
    els.settingsTrigger.classList.toggle('collapsed');
});

// Settings Form Submit Handler
els.settingsForm.addEventListener('submit', saveConfig);

// Initialize App
function init() {
    loadConfig();
    
    // Render immediately using defaults/cache so the page is populated on load
    calculateAndRender();
    
    // Initial fetch
    fetchLiveData();
    
    // Live Polling every 10 seconds
    setInterval(fetchLiveData, 10000);
}

document.addEventListener('DOMContentLoaded', init);
