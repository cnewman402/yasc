// YASC - Yet Another Stock Card
// Version 1.0.0

const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class YASCCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      stockData: { type: Object }
    };
  }

  constructor() {
    super();
    this.stockData = {};
    this.updateInterval = null;
  }

  static getConfigElement() {
    return document.createElement("yasc-card-editor");
  }

  static getStubConfig() {
    return {
      symbols: ['AAPL', 'GOOGL', 'MSFT'],
      names: ['Apple Inc.', 'Alphabet Inc.', 'Microsoft Corp.'],
      update_interval: 60,
      show_chart: true
    };
  }

  setConfig(config) {
    // Support both single symbol (backwards compatibility) and symbols array
    if (config.symbol && !config.symbols) {
      // Convert single symbol to array format
      this.config = {
        symbols: [config.symbol.toUpperCase()],
        names: [config.name || config.symbol.toUpperCase()],
        update_interval: config.update_interval || 60,
        show_chart: config.show_chart === true,
        ...config
      };
    } else if (config.symbols) {
      // Use array format
      this.config = {
        symbols: config.symbols.map(s => s.toUpperCase()),
        names: config.names || config.symbols.map(s => s.toUpperCase()),
        update_interval: config.update_interval || 60,
        show_chart: config.show_chart === true,
        ...config
      };
    } else {
      throw new Error("You need to define either 'symbol' or 'symbols' array");
    }

    this.stocksData = {}; // Will hold data for multiple stocks
    this.startUpdating();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.config && this.config.symbol) {
      this.startUpdating();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async fetchStockData() {
    try {
      // Fetch data for all symbols
      const symbols = this.config.symbols;
      const promises = symbols.map(symbol => this.fetchSingleStock(symbol));
      const results = await Promise.all(promises);
      
      // Store all stock data
      this.stocksData = {};
      symbols.forEach((symbol, index) => {
        this.stocksData[symbol] = results[index];
      });
      
      this.requestUpdate();
      
    } catch (error) {
      console.error("Error fetching stocks data:", error);
      // Set error state for all stocks
      this.stocksData = {};
      this.config.symbols.forEach(symbol => {
        this.stocksData[symbol] = {
          symbol: symbol,
          name: this.config.names[this.config.symbols.indexOf(symbol)] || symbol,
          price: "Error",
          change: "0.00",
          changePercent: "0.00",
          currency: "USD",
          marketState: "ERROR",
          lastUpdated: new Date().toLocaleTimeString(),
          chartData: null,
          timestamps: null,
          error: "Failed to fetch data"
        };
      });
      this.requestUpdate();
    }
  }

  async fetchSingleStock(symbol) {
    try {
      console.log("Using demo data for", symbol);
      
      // Generate realistic demo data based on the symbol
      const demoData = this.generateDemoData(symbol);
      const nameIndex = this.config.symbols.indexOf(symbol);
      const displayName = this.config.names[nameIndex] || symbol;
      
      return {
        symbol: symbol,
        name: displayName,
        price: demoData.price,
        change: demoData.change,
        changePercent: demoData.changePercent,
        currency: "USD",
        marketState: "DEMO",
        lastUpdated: new Date().toLocaleTimeString(),
        chartData: demoData.chartData,
        timestamps: demoData.timestamps,
        error: null
      };
      
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      
      const nameIndex = this.config.symbols.indexOf(symbol);
      const displayName = this.config.names[nameIndex] || symbol;
      
      return {
        symbol: symbol,
        name: displayName,
        price: "123.45",
        change: "1.23",
        changePercent: "1.01",
        currency: "USD",
        marketState: "DEMO",
        lastUpdated: new Date().toLocaleTimeString(),
        chartData: null,
        timestamps: null,
        error: null
      };
    }
  }

  generateDemoData(symbol) {
    // Generate somewhat realistic demo data based on symbol
    const basePrice = symbol === 'AAPL' ? 185.00 : 
                     symbol === 'GOOGL' ? 140.00 :
                     symbol === 'MSFT' ? 410.00 :
                     symbol === 'TSLA' ? 245.00 :
                     symbol === 'AMZN' ? 155.00 :
                     symbol === 'NVDA' ? 880.00 :
                     symbol === 'META' ? 325.00 : 100.00;
    
    // Add some random variation (±3%) with symbol-based seed for consistency
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (seed * 9301 + 49297) % 233280 / 233280;
    const variation = (pseudoRandom - 0.5) * 0.06;
    const price = basePrice * (1 + variation);
    const previousClose = basePrice;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // Generate simple chart data (30 points showing trend)
    const chartData = {
      close: Array.from({length: 30}, (_, i) => {
        const trend = change > 0 ? i * 0.2 : i * -0.1; // Trend based on direction
        const noise = (((seed + i) * 9301 + 49297) % 233280 / 233280 - 0.5) * 4; // Consistent noise
        return basePrice + trend + noise;
      })
    };
    
    const timestamps = Array.from({length: 30}, (_, i) => 
      Date.now() - (30 - i) * 120000 // Last 60 minutes
    );
    
    return {
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      chartData,
      timestamps
    };
  }

  startUpdating() {
    this.fetchStockData();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.fetchStockData();
    }, this.config.update_interval * 1000);
  }

  renderChart() {
    if (!this.stockData.chartData || !this.stockData.timestamps) {
      return html`<div class="chart-placeholder">Chart data unavailable</div>`;
    }

    const prices = this.stockData.chartData.close || [];
    if (prices.length === 0) {
      return html`<div class="chart-placeholder">No chart data</div>`;
    }

    const validPrices = prices.filter(p => p !== null && p !== undefined);
    if (validPrices.length === 0) {
      return html`<div class="chart-placeholder">No valid price data</div>`;
    }

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const priceRange = maxPrice - minPrice || 1;

    const chartPoints = prices
      .slice(-50)
      .map((price, index) => {
        if (price === null || price === undefined) return "";
        const x = (index / 49) * 100;
        const y = 100 - ((price - minPrice) / priceRange) * 100;
        return `${x},${y}`;
      })
      .filter(p => p)
      .join(" ");

    const isPositive = validPrices[validPrices.length - 1] >= validPrices[0];
    const strokeColor = isPositive ? "#4caf50" : "#f44336";

    return html`
      <div class="chart">
        <svg viewBox="0 0 100 40" class="chart-svg">
          <polyline
            points="${chartPoints}"
            fill="none"
            stroke="${strokeColor}"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `;
  }

  render() {
    if (!this.config) {
      return html`<div class="error">Invalid configuration</div>`;
    }

    if (!this.stocksData || Object.keys(this.stocksData).length === 0) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="loading">Loading ${this.config.symbols?.length || 0} stocks...</div>
          </div>
        </ha-card>
      `;
    }

    const stockRows = this.config.symbols.map(symbol => {
      const stockData = this.stocksData[symbol];
      if (!stockData) {
        return html`
          <div class="stock-row">
            <div class="symbol-section">
              <div class="symbol">${symbol}</div>
              <div class="company-name">Loading...</div>
            </div>
            <div class="sparkline-container"><div class="no-data">—</div></div>
            <div class="price-data">
              <div class="current-price">—</div>
              <div class="change-data">—</div>
            </div>
            <div class="market-badge loading">LOADING</div>
          </div>
        `;
      }

      if (stockData.error) {
        return html`
          <div class="stock-row error-row">
            <div class="symbol-section">
              <div class="symbol">${stockData.symbol}</div>
              <div class="company-name">Error</div>
            </div>
            <div class="sparkline-container"><div class="no-data">✗</div></div>
            <div class="price-data">
              <div class="current-price">—</div>
              <div class="change-data error">Error</div>
            </div>
            <div class="market-badge error">ERROR</div>
          </div>
        `;
      }

      const isPositive = parseFloat(stockData.change) >= 0;
      const changeClass = isPositive ? "positive" : "negative";

      return html`
        <div class="stock-row">
          <div class="symbol-section">
            <div class="symbol">${stockData.symbol}</div>
            <div class="company-name">${stockData.name}</div>
          </div>
          
          ${this.config.show_chart === true ? this.renderSparkline(stockData) : html`<div class="sparkline-placeholder"></div>`}
          
          <div class="price-data">
            <div class="current-price">${stockData.price}</div>
            <div class="change-data ${changeClass}">
              <span class="change-amount">${isPositive ? '+' : ''}${stockData.change}</span>
              <span class="change-percent">${isPositive ? '+' : ''}${stockData.changePercent}%</span>
            </div>
          </div>
          
          <div class="market-badge ${stockData.marketState?.toLowerCase() || 'closed'}">
            ${stockData.marketState === 'DEMO' ? 'DEMO' : stockData.marketState || "CLOSED"}
          </div>
        </div>
      `;
    });

    return html`
      <ha-card>
        <div class="card-content multi-stock-layout">
          <div class="stocks-container">
            ${stockRows}
          </div>
          <div class="updated-time">Updated: ${Object.values(this.stocksData)[0]?.lastUpdated || 'Unknown'}</div>
        </div>
      </ha-card>
    `;
  }

  renderSparkline(stockData) {
    if (!stockData.chartData || !stockData.timestamps) {
      return html`<div class="sparkline-container"><div class="no-data">—</div></div>`;
    }

    const prices = stockData.chartData.close || [];
    if (prices.length === 0) {
      return html`<div class="sparkline-container"><div class="no-data">—</div></div>`;
    }

    const validPrices = prices.filter(p => p !== null && p !== undefined);
    if (validPrices.length === 0) {
      return html`<div class="sparkline-container"><div class="no-data">—</div></div>`;
    }

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const priceRange = maxPrice - minPrice || 1;

    // Create more visible chart points - using the full 30 points
    const chartPoints = validPrices.slice(-30).map((price, index) => {
      const x = (index / (validPrices.slice(-30).length - 1)) * 100;
      const y = 100 - ((price - minPrice) / priceRange) * 80 + 10; // Add 10% padding
      return `${x},${y}`;
    }).join(' ');

    const isPositive = validPrices[validPrices.length - 1] >= validPrices[0];
    const strokeColor = isPositive ? '#00C853' : '#FF5252';

    return html`
      <div class="sparkline-container">
        <svg viewBox="0 0 100 100" class="sparkline">
          <polyline
            points="${chartPoints}"
            fill="none"
            stroke="${strokeColor}"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .card-content {
        padding: 0;
        background: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #ffffff);
      }

      .multi-stock-layout {
        padding: 0;
        background: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #ffffff);
      }

      .stocks-container {
        display: flex;
        flex-direction: column;
      }

      .stock-row {
        display: grid;
        grid-template-columns: 120px 80px 1fr auto;
        gap: 16px;
        align-items: center;
        min-height: 44px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .stock-row:last-child {
        border-bottom: none;
      }

      .stock-row:hover {
        background: rgba(255, 255, 255, 0.02);
      }

      .sparkline-placeholder {
        width: 80px;
        height: 40px;
      }

      .symbol-section {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .symbol {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color, #ffffff);
        letter-spacing: 0.5px;
      }

      .company-name {
        font-size: 12px;
        color: var(--secondary-text-color, #a0a0a0);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
      }

      .sparkline-container {
        width: 80px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .sparkline {
        width: 76px;
        height: 36px;
      }

      .no-data {
        font-size: 12px;
        color: var(--secondary-text-color, #666);
        text-align: center;
      }

      .price-data {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        min-width: 80px;
      }

      .current-price {
        font-size: 16px;
        font-weight: 600;
        color: var(--primary-text-color, #ffffff);
        font-variant-numeric: tabular-nums;
      }

      .change-data {
        display: flex;
        gap: 6px;
        font-size: 12px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .change-data.positive {
        color: #00C853;
      }

      .change-data.negative {
        color: #FF5252;
      }

      .change-amount::before {
        content: attr(data-sign);
      }

      .change-percent {
        opacity: 0.9;
      }

      .market-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 3px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        min-width: 40px;
        text-align: center;
      }

      .market-badge.regular {
        background: rgba(0, 200, 83, 0.2);
        color: #00C853;
        border: 1px solid rgba(0, 200, 83, 0.3);
      }

      .market-badge.demo {
        background: rgba(255, 193, 7, 0.2);
        color: #FFC107;
        border: 1px solid rgba(255, 193, 7, 0.3);
      }

      .market-badge.closed {
        background: rgba(158, 158, 158, 0.2);
        color: #9e9e9e;
        border: 1px solid rgba(158, 158, 158, 0.3);
      }

      .updated-time {
        text-align: right;
        font-size: 10px;
        color: var(--secondary-text-color, #666);
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .error {
        padding: 16px;
        text-align: center;
        color: var(--error-color, #FF5252);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .loading {
        padding: 16px;
        text-align: center;
        color: var(--secondary-text-color, #666);
      }

      /* Mobile responsiveness */
      @media (max-width: 480px) {
        .stock-row {
          grid-template-columns: 100px 60px 1fr auto;
          gap: 8px;
        }

        .symbol-section {
          min-width: 100px;
        }

        .sparkline-container {
          width: 60px;
        }

        .sparkline {
          width: 60px;
        }

        .current-price {
          font-size: 14px;
        }

        .change-data {
          font-size: 11px;
          flex-direction: column;
          gap: 1px;
        }
      }

      /* Dark theme optimizations */
      ha-card {
        background: var(--card-background-color, #1e1e1e);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
  }

  getCardSize() {
    return 3;
  }
}

// Editor class
class YASCCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  setConfig(config) {
    this.config = { ...config };
  }

  configChanged(newConfig) {
    const event = new Event("config-changed", {
      bubbles: true,
      composed: true
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (!configValue) return;

    let value;
    if (target.hasAttribute('checked')) {
      value = target.checked;
    } else if (target.type === 'number') {
      value = target.value ? Number(target.value) : 60;
    } else {
      value = target.value || '';
    }

    const newConfig = { ...this.config };
    if (value === '' && configValue !== 'name') {
      // Don't delete required fields, set defaults instead
      if (configValue === 'symbol') {
        newConfig[configValue] = 'AAPL';
      } else if (configValue === 'update_interval') {
        newConfig[configValue] = 60;
      } else {
        delete newConfig[configValue];
      }
    } else {
      newConfig[configValue] = value;
    }

    this.configChanged(newConfig);
  }

  render() {
    if (!this.hass || !this.config) {
      return html`<div>Loading editor...</div>`;
    }

    return html`
      <div class="card-config">
        <div class="section-header">Stock Information</div>
        <div class="config-row">
          <ha-textfield
            label="Stock Symbol"
            .value="${this.config.symbol || 'AAPL'}"
            .configValue="${'symbol'}"
            @input="${this._valueChanged}"
            required
          ></ha-textfield>
          <div class="help-text">Required: Ticker symbol (e.g., AAPL, GOOGL, TSLA)</div>
        </div>

        <div class="config-row">
          <ha-textfield
            label="Display Name"
            .value="${this.config.name || ''}"
            .configValue="${'name'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
          <div class="help-text">Optional: Custom name to display</div>
        </div>

        <div class="section-header">Settings</div>
        <div class="config-row">
          <ha-textfield
            label="Update Interval (seconds)"
            .value="${this.config.update_interval || 60}"
            .configValue="${'update_interval'}"
            type="number"
            min="10"
            max="3600"
            @input="${this._valueChanged}"
          ></ha-textfield>
          <div class="help-text">How often to refresh data (10-3600 seconds)</div>
        </div>

        <div class="config-row">
          <ha-formfield label="Show Chart">
            <ha-checkbox
              .checked="${this.config.show_chart !== false}"
              .configValue="${'show_chart'}"
              @change="${this._valueChanged}"
            ></ha-checkbox>
          </ha-formfield>
        </div>

        <div class="section-header">Demo Mode</div>
        <div class="config-row">
          <div class="help-text">
            This card runs in demo mode with realistic sample data.<br/>
            <strong>Popular Symbols to try:</strong><br/>
            <strong>US Stocks:</strong> AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META<br />
            <strong>Crypto:</strong> BTC-USD, ETH-USD, ADA-USD<br />
            <strong>Indices:</strong> ^GSPC (S&P 500), ^DJI (Dow Jones)
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .section-header {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--primary-text-color);
        margin: 16px 0 8px 0;
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 4px;
      }

      .config-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
      }

      .help-text {
        font-size: 0.85em;
        color: var(--secondary-text-color);
        font-style: italic;
      }

      ha-textfield {
        width: 100%;
      }

      ha-formfield {
        margin: 8px 0;
      }

      ha-checkbox {
        margin-left: 8px;
      }
    `;
  }
}

// Register the elements
customElements.define("yasc-card", YASCCard);
customElements.define("yasc-card-editor", YASCCardEditor);

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "yasc-card",
  name: "YASC - Yet Another Stock Card",
  description: "A customizable stock price tracking card with real-time updates",
  preview: true,
  documentationURL: "https://github.com/yourusername/yasc"
});

console.info(
  "%c YASC %c v1.1.0 - Enhanced GUI ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
