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
      symbol: "AAPL",
      name: "Apple Inc.",
      update_interval: 60,
      show_chart: true
    };
  }

  setConfig(config) {
    if (!config.symbol) {
      throw new Error("You need to define a stock symbol");
    }

    this.config = {
      symbol: config.symbol.toUpperCase(),
      name: config.name || config.symbol.toUpperCase(),
      update_interval: config.update_interval || 60,
      show_chart: config.show_chart !== false,
      ...config
    };

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
      const symbol = this.config.symbol;
      
      // Try multiple endpoints for better reliability
      const endpoints = [
        // Free proxy service for Yahoo Finance
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`)}`,
        // Backup: Direct Yahoo Finance with no-cors mode (limited data)
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
        // Fallback: Yahoo Finance search endpoint
        `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}`
      ];

      let data = null;
      let usedEndpoint = 0;

      // Try each endpoint until one works
      for (let i = 0; i < endpoints.length; i++) {
        try {
          const response = await fetch(endpoints[i], {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            mode: i === 0 ? "cors" : "no-cors"
          });

          if (response.ok) {
            const responseData = await response.json();
            if (responseData && (responseData.chart || responseData.quoteResponse || responseData.quotes)) {
              data = responseData;
              usedEndpoint = i;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`Endpoint ${i} failed:`, endpointError);
          continue;
        }
      }

      if (!data) {
        throw new Error("All API endpoints failed. Please check your internet connection and try again.");
      }

      // Parse data based on which endpoint worked
      let stockInfo;
      
      if (usedEndpoint === 0 && data.chart && data.chart.result && data.chart.result.length > 0) {
        // Yahoo Finance chart API (via proxy)
        const result = data.chart.result[0];
        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        stockInfo = {
          symbol: this.config.symbol,
          name: this.config.name,
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          currency: meta.currency || "USD",
          marketState: meta.marketState,
          lastUpdated: new Date().toLocaleTimeString(),
          chartData: result.indicators?.quote?.[0] || null,
          timestamps: result.timestamp || null,
          error: null
        };
      } else if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
        // Yahoo Finance quote API
        const quote = data.quoteResponse.result[0];
        const currentPrice = quote.regularMarketPrice;
        const previousClose = quote.regularMarketPreviousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        stockInfo = {
          symbol: this.config.symbol,
          name: this.config.name,
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          currency: quote.currency || "USD",
          marketState: quote.marketState || "UNKNOWN",
          lastUpdated: new Date().toLocaleTimeString(),
          chartData: null, // No chart data from this endpoint
          timestamps: null,
          error: null
        };
      } else {
        // Fallback: create mock data to show the card is working
        stockInfo = {
          symbol: this.config.symbol,
          name: this.config.name,
          price: "Loading...",
          change: "0.00",
          changePercent: "0.00",
          currency: "USD",
          marketState: "LOADING",
          lastUpdated: new Date().toLocaleTimeString(),
          chartData: null,
          timestamps: null,
          error: "API temporarily unavailable - showing demo data"
        };
      }

      this.stockData = stockInfo;
      this.requestUpdate();
      
    } catch (error) {
      console.error("Error fetching stock data:", error);
      this.stockData = {
        symbol: this.config.symbol,
        name: this.config.name,
        price: "Error",
        change: "0.00",
        changePercent: "0.00",
        currency: "USD",
        marketState: "ERROR",
        lastUpdated: new Date().toLocaleTimeString(),
        chartData: null,
        timestamps: null,
        error: "Failed to fetch data: " + error.message + " - This may be due to CORS restrictions in your browser."
      };
      this.requestUpdate();
    }
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

    if (this.stockData.error) {
      return html`
        <ha-card>
          <div class="card-content error">
            <ha-icon icon="mdi:alert-circle"></ha-icon>
            <span>Error: ${this.stockData.error}</span>
            <div class="symbol">${this.config.symbol}</div>
          </div>
        </ha-card>
      `;
    }

    if (!this.stockData.price) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="loading">Loading ${this.config.symbol}...</div>
          </div>
        </ha-card>
      `;
    }

    const isPositive = parseFloat(this.stockData.change) >= 0;
    const changeClass = isPositive ? "positive" : "negative";
    const changeIcon = isPositive ? "mdi:trending-up" : "mdi:trending-down";

    return html`
      <ha-card>
        <div class="card-content">
          <div class="header">
            <div class="title">
              <span class="symbol">${this.stockData.symbol}</span>
              <span class="name">${this.stockData.name}</span>
            </div>
            <div class="market-state ${this.stockData.marketState?.toLowerCase() || 'closed'}">
              ${this.stockData.marketState || "CLOSED"}
            </div>
          </div>

          <div class="price-section">
            <div class="current-price">
              ${this.stockData.currency} ${this.stockData.price}
            </div>
            <div class="change ${changeClass}">
              <ha-icon icon="${changeIcon}"></ha-icon>
              <span>${this.stockData.change} (${this.stockData.changePercent}%)</span>
            </div>
          </div>

          ${this.config.show_chart ? this.renderChart() : ""}

          <div class="footer">
            <span class="updated">Updated: ${this.stockData.lastUpdated}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .card-content {
        padding: 16px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .title {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .symbol {
        font-size: 1.2em;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .name {
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }

      .market-state {
        font-size: 0.8em;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 500;
      }

      .market-state.regular {
        background: #4caf50;
        color: white;
      }

      .market-state.closed,
      .market-state.prepre,
      .market-state.postpost {
        background: var(--divider-color);
        color: var(--secondary-text-color);
      }

      .price-section {
        margin: 16px 0;
      }

      .current-price {
        font-size: 2em;
        font-weight: 300;
        color: var(--primary-text-color);
        margin-bottom: 4px;
      }

      .change {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 1.1em;
        font-weight: 500;
      }

      .change.positive {
        color: #4caf50;
      }

      .change.negative {
        color: #f44336;
      }

      .chart {
        margin: 16px 0;
        height: 80px;
        background: var(--secondary-background-color);
        border-radius: 4px;
        padding: 8px;
      }

      .chart-svg {
        width: 100%;
        height: 100%;
      }

      .chart-placeholder {
        text-align: center;
        color: var(--secondary-text-color);
        font-style: italic;
        padding: 20px;
        font-size: 0.9em;
      }

      .footer {
        text-align: right;
        margin-top: 12px;
      }

      .updated {
        font-size: 0.8em;
        color: var(--secondary-text-color);
      }

      .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: var(--error-color);
        justify-content: center;
        padding: 20px;
        text-align: center;
      }

      .loading {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 20px;
      }

      ha-icon {
        --mdc-icon-size: 16px;
      }

      .change ha-icon {
        --mdc-icon-size: 20px;
      }

      .error ha-icon {
        --mdc-icon-size: 24px;
      }

      @media (max-width: 480px) {
        .current-price {
          font-size: 1.6em;
        }

        .header {
          flex-direction: column;
          gap: 8px;
        }

        .market-state {
          align-self: flex-start;
        }
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
    this.config = config;
  }

  configChanged(newConfig) {
    const event = new Event("config-changed", {
      bubbles: true,
      composed: true
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (!configValue) return;

    let value;
    if (target.type === "checkbox") {
      value = target.checked;
    } else if (target.type === "number") {
      value = target.value ? Number(target.value) : undefined;
    } else {
      value = target.value;
    }

    if (this.config[configValue] === value) {
      return;
    }

    const newConfig = { ...this.config };
    if (value === "" || value == null || value === undefined) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = value;
    }

    this.configChanged(newConfig);
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="section-header">Stock Information</div>
        <div class="config-group">
          <paper-input
            label="Stock Symbol (Required)"
            .value="${this.config.symbol || ""}"
            .configValue="${"symbol"}"
            @value-changed="${this.valueChanged}"
            required
          ></paper-input>
          <div class="help-text">Ticker symbol (e.g., AAPL, GOOGL, TSLA)</div>

          <paper-input
            label="Display Name (Optional)"
            .value="${this.config.name || ""}"
            .configValue="${"name"}"
            @value-changed="${this.valueChanged}"
          ></paper-input>
          <div class="help-text">Custom name to display</div>
        </div>

        <div class="section-header">Settings</div>
        <div class="config-group">
          <paper-input
            label="Update Interval (seconds)"
            .value="${this.config.update_interval || 60}"
            .configValue="${"update_interval"}"
            type="number"
            min="10"
            max="3600"
            @value-changed="${this.valueChanged}"
          ></paper-input>
          <div class="help-text">How often to refresh data (10-3600 seconds)</div>

          <ha-formfield label="Show Chart">
            <ha-switch
              .checked="${this.config.show_chart !== false}"
              .configValue="${"show_chart"}"
              @change="${this.valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="section-header">Popular Symbols</div>
        <div class="config-group">
          <div class="help-text">
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

      .config-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .help-text {
        font-size: 0.85em;
        color: var(--secondary-text-color);
        font-style: italic;
        margin-top: 4px;
      }

      paper-input {
        width: 100%;
      }

      ha-formfield {
        margin: 8px 0;
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
  "%c YASC %c v1.0.0 ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
