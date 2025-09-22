class YetAnotherStockCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    this.stockData = {};
    this.updateInterval = null;
  }

  setConfig(config) {
    if (!config.symbol) {
      throw new Error('You need to define a stock symbol');
    }
    
    this.config = {
      symbol: config.symbol.toUpperCase(),
      name: config.name || config.symbol.toUpperCase(),
      update_interval: config.update_interval || 60, // seconds
      show_chart: config.show_chart !== false,
      chart_period: config.chart_period || '1D',
      ...config
    };
    
    this.render();
    this.startUpdating();
  }

  connectedCallback() {
    this.startUpdating();
  }

  disconnectedCallback() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  async fetchStockData() {
    try {
      // Using Yahoo Finance alternative API (no key required)
      const symbol = this.config.symbol;
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      this.stockData = {
        symbol: this.config.symbol,
        name: this.config.name,
        price: currentPrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        currency: meta.currency || 'USD',
        marketState: meta.marketState,
        lastUpdated: new Date().toLocaleTimeString(),
        chartData: result.indicators?.quote?.[0] || null,
        timestamps: result.timestamp || null
      };
      
      this.updateDisplay();
      
    } catch (error) {
      console.error('Error fetching stock data:', error);
      this.stockData.error = 'Failed to fetch data';
      this.updateDisplay();
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

  updateDisplay() {
    const card = this.shadowRoot.querySelector('.yasc-card');
    if (!card) return;

    if (this.stockData.error) {
      card.innerHTML = `
        <div class="yasc-error">
          <ha-icon icon="mdi:alert-circle"></ha-icon>
          <span>Error loading ${this.config.symbol}</span>
        </div>
      `;
      return;
    }

    const isPositive = parseFloat(this.stockData.change) >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeIcon = isPositive ? 'mdi:trending-up' : 'mdi:trending-down';

    card.innerHTML = `
      <div class="yasc-header">
        <div class="yasc-title">
          <span class="yasc-symbol">${this.stockData.symbol}</span>
          <span class="yasc-name">${this.stockData.name}</span>
        </div>
        <div class="yasc-market-state ${this.stockData.marketState?.toLowerCase()}">${this.stockData.marketState || 'CLOSED'}</div>
      </div>
      
      <div class="yasc-price-section">
        <div class="yasc-current-price">${this.stockData.currency} ${this.stockData.price}</div>
        <div class="yasc-change ${changeClass}">
          <ha-icon icon="${changeIcon}"></ha-icon>
          <span>${this.stockData.change} (${this.stockData.changePercent}%)</span>
        </div>
      </div>
      
      ${this.config.show_chart ? this.renderChart() : ''}
      
      <div class="yasc-footer">
        <span class="yasc-updated">Updated: ${this.stockData.lastUpdated}</span>
      </div>
    `;
  }

  renderChart() {
    // Simple chart implementation using CSS
    if (!this.stockData.chartData || !this.stockData.timestamps) {
      return '<div class="yasc-chart-placeholder">Chart data unavailable</div>';
    }

    const prices = this.stockData.chartData.close || [];
    if (prices.length === 0) return '';

    const minPrice = Math.min(...prices.filter(p => p !== null));
    const maxPrice = Math.max(...prices.filter(p => p !== null));
    const priceRange = maxPrice - minPrice;

    const chartPoints = prices.slice(-50).map((price, index) => {
      if (price === null) return '';
      const x = (index / 49) * 100;
      const y = 100 - ((price - minPrice) / priceRange) * 100;
      return `${x},${y}`;
    }).filter(p => p).join(' ');

    return `
      <div class="yasc-chart">
        <svg viewBox="0 0 100 40" class="yasc-chart-svg">
          <polyline
            points="${chartPoints}"
            fill="none"
            stroke="var(--yasc-chart-color, var(--primary-color))"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .yasc-card {
          background: var(--card-background-color, var(--ha-card-background, #fff));
          border-radius: var(--ha-card-border-radius, 8px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family);
        }
        
        .yasc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .yasc-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .yasc-symbol {
          font-size: 1.2em;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        
        .yasc-name {
          font-size: 0.9em;
          color: var(--secondary-text-color);
        }
        
        .yasc-market-state {
          font-size: 0.8em;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 500;
        }
        
        .yasc-market-state.regular {
          background: var(--success-color, #4caf50);
          color: white;
        }
        
        .yasc-market-state.closed,
        .yasc-market-state.prepre,
        .yasc-market-state.postpost {
          background: var(--divider-color, #ddd);
          color: var(--secondary-text-color);
        }
        
        .yasc-price-section {
          margin: 16px 0;
        }
        
        .yasc-current-price {
          font-size: 2em;
          font-weight: 300;
          color: var(--primary-text-color);
          margin-bottom: 4px;
        }
        
        .yasc-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 1.1em;
          font-weight: 500;
        }
        
        .yasc-change.positive {
          color: var(--success-color, #4caf50);
        }
        
        .yasc-change.negative {
          color: var(--error-color, #f44336);
        }
        
        .yasc-chart {
          margin: 16px 0;
          height: 80px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 4px;
          padding: 8px;
        }
        
        .yasc-chart-svg {
          width: 100%;
          height: 100%;
        }
        
        .yasc-chart-placeholder {
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
          padding: 20px;
        }
        
        .yasc-footer {
          text-align: right;
          margin-top: 12px;
        }
        
        .yasc-updated {
          font-size: 0.8em;
          color: var(--secondary-text-color);
        }
        
        .yasc-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--error-color, #f44336);
          justify-content: center;
          padding: 20px;
        }
        
        ha-icon {
          --mdc-icon-size: 16px;
        }
        
        .yasc-change ha-icon {
          --mdc-icon-size: 20px;
        }
        
        @media (max-width: 480px) {
          .yasc-current-price {
            font-size: 1.6em;
          }
        }
      </style>
      
      <div class="yasc-card">
        <div class="yasc-loading">Loading ${this.config.symbol || 'stock'}...</div>
      </div>
    `;
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement('yasc-editor');
  }

  static getStubConfig() {
    return {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      update_interval: 60,
      show_chart: true,
      chart_period: '1D'
    };
  }

  static get version() {
    return '1.0.0';
  }
}

// Define the custom element
customElements.define('yasc', YetAnotherStockCard);

// Register with Home Assistant card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yasc',
  name: 'Yet Another Stock Card',
  description: 'A customizable stock price tracking card with real-time updates',
  preview: true,
  documentationURL: 'https://github.com/yourusername/yet-another-stock-card',
  configurable: true
});

// Visual Editor
class YetAnotherStockCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this.config = { ...config };
    this.render();
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
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
    const value = target.type === 'checkbox' ? target.checked : target.value;

    if (this.config[configValue] === value) {
      return;
    }

    const newConfig = { ...this.config };
    if (value === '' || value == null) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = value;
    }

    this.configChanged(newConfig);
  }

  render() {
    if (!this.hass) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
        }
        
        .config-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 40px;
        }
        
        .config-row label {
          font-weight: 500;
          color: var(--primary-text-color);
          flex: 1;
        }
        
        .config-row .description {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        
        .config-row .control {
          flex: 1;
          max-width: 200px;
        }
        
        ha-textfield {
          width: 100%;
        }
        
        ha-switch {
          margin-left: 8px;
        }
        
        .section-header {
          font-size: 1.1em;
          font-weight: 600;
          color: var(--primary-text-color);
          margin: 16px 0 8px 0;
          border-bottom: 1px solid var(--divider-color);
          padding-bottom: 4px;
        }
        
        .help-text {
          font-size: 0.85em;
          color: var(--secondary-text-color);
          font-style: italic;
          margin-top: 4px;
        }
        
        .config-group {
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
          padding: 16px;
          margin: 8px 0;
        }
      </style>
      
      <div class="card-config">
        <div class="section-header">Stock Information</div>
        <div class="config-group">
          <div class="config-row">
            <div>
              <label>Stock Symbol *</label>
              <div class="description">Ticker symbol (e.g., AAPL, GOOGL, TSLA)</div>
            </div>
            <div class="control">
              <ha-textfield
                .label=${'Symbol'}
                .value=${this.config.symbol || ''}
                .configValue=${'symbol'}
                @input=${this.valueChanged}
                required
              ></ha-textfield>
            </div>
          </div>
          
          <div class="config-row">
            <div>
              <label>Display Name</label>
              <div class="description">Custom name to display (optional)</div>
            </div>
            <div class="control">
              <ha-textfield
                .label=${'Name'}
                .value=${this.config.name || ''}
                .configValue=${'name'}
                @input=${this.valueChanged}
              ></ha-textfield>
            </div>
          </div>
        </div>

        <div class="section-header">Update Settings</div>
        <div class="config-group">
          <div class="config-row">
            <div>
              <label>Update Interval</label>
              <div class="description">How often to refresh data (seconds)</div>
            </div>
            <div class="control">
              <ha-textfield
                .label=${'Seconds'}
                .value=${this.config.update_interval || 60}
                .configValue=${'update_interval'}
                type="number"
                min="10"
                max="3600"
                @input=${this.valueChanged}
              ></ha-textfield>
            </div>
          </div>
          <div class="help-text">Minimum: 10 seconds, Maximum: 1 hour (3600 seconds)</div>
        </div>

        <div class="section-header">Chart Settings</div>
        <div class="config-group">
          <div class="config-row">
            <div>
              <label>Show Chart</label>
              <div class="description">Display price chart visualization</div>
            </div>
            <div class="control">
              <ha-switch
                .checked=${this.config.show_chart !== false}
                .configValue=${'show_chart'}
                @change=${this.valueChanged}
              ></ha-switch>
            </div>
          </div>
          
          <div class="config-row">
            <div>
              <label>Chart Period</label>
              <div class="description">Time range for chart data</div>
            </div>
            <div class="control">
              <ha-select
                .label=${'Period'}
                .value=${this.config.chart_period || '1D'}
                .configValue=${'chart_period'}
                @selected=${this.valueChanged}
                @closed=${(ev) => ev.stopPropagation()}
              >
                <mwc-list-item value="1D">1 Day</mwc-list-item>
                <mwc-list-item value="5D">5 Days</mwc-list-item>
                <mwc-list-item value="1M">1 Month</mwc-list-item>
                <mwc-list-item value="3M">3 Months</mwc-list-item>
                <mwc-list-item value="6M">6 Months</mwc-list-item>
                <mwc-list-item value="1Y">1 Year</mwc-list-item>
              </ha-select>
            </div>
          </div>
        </div>

        <div class="section-header">Popular Stock Symbols</div>
        <div class="config-group">
          <div class="help-text">
            <strong>US Stocks:</strong> AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META<br>
            <strong>Crypto:</strong> BTC-USD, ETH-USD, ADA-USD<br>
            <strong>Indices:</strong> ^GSPC (S&P 500), ^DJI (Dow Jones), ^IXIC (NASDAQ)<br>
            <strong>International:</strong> ASML.AS, SAP.DE, 0700.HK
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return [];
  }
}

customElements.define('yasc-editor', YetAnotherStockCardEditor);

console.info(
  `%c YET-ANOTHER-STOCK-CARD %c v${YetAnotherStockCard.version} `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);
