# SK Hynix Leveraged Portfolio Terminal

A premium, dark-themed cyberpunk portfolio dashboard designed to track integrated leveraged exposure to **SK Hynix** across two separate asset classes:
1. **Hyperliquid Perpetual Contracts**: 5x Long `xyz:SKHX` position (xyz Sub-DEX).
2. **KOSPI Leveraged ETF**: 2x TIGER SK하이닉스레버리지 (`0195S0`) spot position.

The terminal automatically calculates net assets, combined face-value leverage exposure, unrealized P&L, and daily changes in KRW. It implements automatic baseline calibration using Naver Finance API data when the KOSPI market is open.

---

## 📊 Core Portfolio Calculations & Formulas

All calculations are executed in real time inside `app.js` and updated dynamically.

### 1. Exchange Rate & Currency Conversion
* **Source**: `https://open.er-api.com/v6/latest/USD`
* **Rate**: $R_{\text{USD/KRW}}$ (Current USD to KRW rate, default fallback: `1506.66`).

### 2. Hyperliquid Perpetual Position (5x Long)

**Position Size ($N_{\text{HL}}$)**: 
$$N_{\text{HL}} = \frac{V_{\text{Entry, USDC}}}{P_{\text{Entry, USDC}}} = \frac{23,020.23}{1,553.5} \approx 14.8183 \text{ contracts}$$

**Position Value**:
$$V_{\text{HL, USD}} = N_{\text{HL}} \times P_{\text{Current, USD}}$$

$$V_{\text{HL, KRW}} = V_{\text{HL, USD}} \times R_{\text{USD/KRW}}$$

**Unrealized P&L**:
$$\text{PnL}_{\text{HL, USD}} = N_{\text{HL}} \times (P_{\text{Current, USD}} - P_{\text{Entry, USD}})$$

$$\text{PnL}_{\text{HL, KRW}} = \text{PnL}_{\text{HL, USD}} \times R_{\text{USD/KRW}}$$

**Margin Net Equity**:
$$E_{\text{HL, USD}} = \frac{V_{\text{Entry, USDC}}}{5} + \text{PnL}_{\text{HL, USD}}$$

$$E_{\text{HL, KRW}} = E_{\text{HL, USD}} \times R_{\text{USD/KRW}}$$

**Margin Safety (Distance to Liquidation)**:
$$\text{Safety Score (\%)} = \max\left(0, \min\left(100, \frac{P_{\text{Current, USD}} - P_{\text{Liq, USD}}}{P_{\text{Entry, USD}} - P_{\text{Liq, USD}}} \times 100\right)\right)$$

### 3. Leveraged ETF Position (2x TIGER SK하이닉스레버리지)
The Leveraged ETF tracks 2x the daily returns of the underlying SK Hynix stock. When KOSPI is closed, the theoretical market value of the ETF is projected based on the movements of the Hyperliquid SKHX perp.

**Implied Stock Price ($S_{\text{Theoretical, KRW}}$)**:
$$S_{\text{Theoretical, KRW}} = P_{\text{Current, USD}} \times R_{\text{USD/KRW}}$$

**Stock Daily Return ($R_{\text{Stock}}$)**:
$$R_{\text{Stock}} = \frac{S_{\text{Theoretical, KRW}}}{S_{\text{Baseline}}} - 1$$
*(where $S_{\text{Baseline}}$ is the baseline closing price of the stock from the previous trading day).*

**Theoretical ETF Price ($P_{\text{ETF, Theoretical}}$)**:
$$P_{\text{ETF, Theoretical}} = \text{ETF}_{\text{Baseline}} \times (1 + 2 \times R_{\text{Stock}})$$
*(where $\text{ETF}_{\text{Baseline}}$ is the baseline closing price of the ETF from the previous trading day).*

**ETF Position Value**:
$$V_{\text{ETF, KRW}} = N_{\text{ETF}} \times P_{\text{ETF, Theoretical}}$$

**ETF Unrealized P&L**:
$$\text{PnL}_{\text{ETF, KRW}} = V_{\text{ETF, KRW}} - (N_{\text{ETF}} \times B_{\text{ETF}})$$
*(where $B_{\text{ETF}}$ is your average purchase price: `25,288 KRW`).*

### 4. Combined Portfolio Metrics

**Net Asset Value (NAV)** (Combined liquid capital equity):
$$\text{NAV}_{\text{KRW}} = E_{\text{HL, KRW}} + V_{\text{ETF, KRW}}$$

**Total Market Exposure** (Combined face-value market leverage, incorporating the 2x ETF leverage multiplier):
$$\text{Exposure}_{\text{KRW}} = V_{\text{HL, KRW}} + (V_{\text{ETF, KRW}} \times 2)$$

**Total Daily Change (KST / UTC+9)**:
$$\Delta_{\text{Total, KRW}} = \Delta_{\text{HL, KRW}} + \Delta_{\text{ETF, KRW}}$$

**Total Unrealized P&L**:
$$\text{PnL}_{\text{Total, KRW}} = \text{PnL}_{\text{HL, KRW}} + \text{PnL}_{\text{ETF, KRW}}$$

**Total ROI**:
$$\text{Total ROI (\%)} = \frac{\text{PnL}_{\text{Total, KRW}}}{\text{Cost Basis}_{\text{Total, KRW}}} \times 100$$

$$\text{Cost Basis}_{\text{Total, KRW}} = \left(\frac{V_{\text{Entry, USDC}}}{5} \times R_{\text{USD/KRW}}\right) + (N_{\text{ETF}} \times B_{\text{ETF}})$$

---

## 🔄 Dynamic Update & Auto-Calibration Mechanisms

The terminal operates with an intelligent network state machine that handles data polling every 10 seconds:

```
[Start Poll]
     │
     ├──> Fetch live USD/KRW rate (ExchangeRate-API)
     │
     ├──> Fetch xyz:SKHX Perp mark/mid/prevDayPx (Hyperliquid Info API)
     │
     └──> Fetch KOSPI Stock/ETF realtime details (Naver Finance API)
             │
             └──> [Is KOSPI Market Open?] ──(Yes)──> Auto-calibrate:
                                                        - stockBaseline = Naver Stock pcv
                                                        - etfBaseline = Naver ETF pcv
                                                        - Save updated baselines to localStorage
```

### 1. Market-Open Auto-Calibration
* **API Used**: Naver Finance Real-Time Quote API.
* **CORS Handling**: Done via a local CORS proxy for development (`/api/proxy`) and a public CORS relay (`allorigins.win`) when hosted.
* **Auto-Calibration Condition**:
  The KOSPI market status indicator `ms` must equal `"OPEN"`.
* **Action**:
  When KOSPI is active, the app grabs the **previous close value** (`pcv` or open fallback `sv`) directly from the exchange book and overwrites `stockBaseline` and `etfBaseline` in state. It saves these to `localStorage` and updates settings form fields silently in the background (preventing cursor jumps if you are actively editing).
* **Closed Hours Graceful Handling**:
  If the market is closed (`ms === "CLOSE"` or on weekends), the baseline calibration sleeps. The app relies on your last saved baselines, avoiding values resetting to `₩0`.

### 2. Immediate Initial Render (Zero-State Prevention)
To prevent the terminal from showing empty `₩0` or `$0.00` metrics on slow network loads:
* The script calls `calculateAndRender()` **immediately on page load** using defaults or `localStorage` caches.
* Polling network queries run asynchronously in the background and update the elements smoothly once resolved.

---

## 🛠️ Local Setup & Execution

You can run the portfolio locally without installing Node.js, Python, or Webpack. A native PowerShell web server is included.

1. Clone or open the project folder:
   ```powershell
   cd C:\Users\Administrator\.gemini\antigravity\scratch\portfolio-viewer
   ```
2. Start the local server:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```
3. Open your browser and navigate to:
   **`http://127.0.0.1:8080/`**

### Deployed URL
The terminal is configured for GitHub Pages. Any push to the `main` branch automatically triggers deployment:
* **Remote Repository**: `https://github.com/Asayuki397/SK-Hynix-Bull-Portfolio.git`
