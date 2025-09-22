console.log('YASC v1.4.0 - Complete Implementation with Blur Update Fix');

class YetAnotherStockCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._stocksData = {};
    this._updateInterval = null;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    // Support both single symbol (backwards compatibility) and symbols array
    if (config.symbol && !config.symbols) {
      // Convert single symbol to array format
      this._config = {
        symbols: [config.symbol.toUpperCase()],
        names: [config.name || config.symbol.toUpperCase()],
        update_interval: config.update_interval || 60,
        show_chart: config.show_chart === true
      };
    } else if (config.symbols) {
      // Use array format
      this._config = {
        symbols: config.symbols.map(s => s.toUpperCase()),
        names: config.names || config.symbols.map(s => s.toUpperCase()),
        update_interval: config.update_interval || 60,
        show_chart: config.show_chart === true
      };
    } else {
      throw new Error("You need to define either 'symbol' or 'symbols' array");
    }
  }

  connectedCallback() {
    this.startUpdateInterval();
  }

  disconnectedCallback() {
    this.stopUpdateInterval();
  }

  startUpdateInterval() {
    this.stopUpdateInterval();
    var self = this;
    this.fetchStockData();
    this._updateInterval = setInterval(function() {
      self.fetchStockData();
    }, this._config.update_interval * 1000);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  fetchStockData() {
    var self = this;
    var symbols = this._config.symbols;
    
    // Fetch real data for all symbols
    this._stocksData = {};
    var promises = [];
    
    for (var i = 0; i < symbols.length; i++) {
      var symbol = symbols[i];
      promises.push(this.fetchSingleStock(symbol, i));
    }
    
    Promise.all(promises).then(function(results) {
      for (var i = 0; i < results.length; i++) {
        var stockData = results[i];
        if (stockData && stockData.symbol) {
          self._stocksData[stockData.symbol] = stockData;
        }
      }
      self.render();
    }).catch(function(error) {
      console.error('YASC: Error fetching stock data:', error);
      self.render();
    });
  }

  fetchSingleStock(symbol, index) {
    var self = this;
    var displayName = this._config.names[index] || symbol;
    
    // Try multiple approaches for getting real data
    var corsProxy = 'https://api.allorigins.win/raw?url=';
    var yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + symbol;
    var fullUrl = corsProxy + encodeURIComponent(yahooUrl);
    
    return fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (data && data.chart && data.chart.result && data.chart.result.length > 0) {
        var result = data.chart.result[0];
        var meta = result.meta;
        
        if (!meta.regularMarketPrice) {
          throw new Error('No price data available');
        }
        
        var currentPrice = meta.regularMarketPrice;
        var previousClose = meta.previousClose;
        var change = currentPrice - previousClose;
        var changePercent = (change / previousClose) * 100;
        
        return {
          symbol: symbol,
          name: displayName,
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          currency: meta.currency || 'USD',
          marketState: meta.marketState || 'REGULAR',
          lastUpdated: new Date().toLocaleTimeString(),
          chartData: result.indicators?.quote?.[0] || null,
          timestamps: result.timestamp || null,
          error: null
        };
      } else {
        throw new Error('Invalid data format');
      }
    })
    .catch(function(error) {
      // Fallback to demo data if real data fails (silent fallback)
      var demoData = self.generateDemoData(symbol);
      return {
        symbol: symbol,
        name: displayName + ' (Demo)',
        price: demoData.price,
        change: demoData.change,
        changePercent: demoData.changePercent,
        currency: 'USD',
        marketState: 'DEMO',
        lastUpdated: new Date().toLocaleTimeString(),
        chartData: demoData.chartData,
        timestamps: demoData.timestamps,
        error: null
      };
    });
  }

  generateDemoData(symbol) {
    var basePrice = symbol === 'AAPL' ? 185.00 : 
                   symbol === 'GOOGL' ? 140.00 :
                   symbol === 'MSFT' ? 410.00 :
                   symbol === 'TSLA' ? 245.00 :
                   symbol === 'AMZN' ? 155.00 :
                   symbol === 'NVDA' ? 880.00 :
                   symbol === 'META' ? 325.00 : 100.00;
    
    var seed = 0;
    for (var i = 0; i < symbol.length; i++) {
      seed += symbol.charCodeAt(i);
    }
    var pseudoRandom = (seed * 9301 + 49297) % 233280 / 233280;
    var variation = (pseudoRandom - 0.5) * 0.06;
    var price = basePrice * (1 + variation);
    var previousClose = basePrice;
    var change = price - previousClose;
    var changePercent = (change / previousClose) * 100;
    
    var chartData = {
      close: []
    };
    
    for (var i = 0; i < 30; i++) {
      var trend = change > 0 ? i * 0.2 : i * -0.1;
      var noise = (((seed + i) * 9301 + 49297) % 233280 / 233280 - 0.5) * 4;
      chartData.close.push(basePrice + trend + noise);
    }
    
    var timestamps = [];
    for (var i = 0; i < 30; i++) {
      timestamps.push(Date.now() - (30 - i) * 120000);
    }
    
    return {
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      chartData: chartData,
      timestamps: timestamps
    };
  }

  render() {
    if (!this._config || !this._config.symbols) {
      this.shadowRoot.innerHTML = this.getLoadingHTML();
      return;
    }

    if (!this._stocksData || Object.keys(this._stocksData).length === 0) {
      this.shadowRoot.innerHTML = this.getLoadingHTML();
      return;
    }

    this.shadowRoot.innerHTML = this.getMainHTML();
  }

  getLoadingHTML() {
    return '<style>' + this.getStyles() + '</style><div class="loading">Loading stocks...</div>';
  }

  getMainHTML() {
    var html = '<style>' + this.getStyles() + '</style>';
    html += '<div class="card-content multi-stock-layout">';
    html += '<div class="stocks-container">';
    
    for (var i = 0; i < this._config.symbols.length; i++) {
      var symbol = this._config.symbols[i];
      var stockData = this._stocksData[symbol];
      
      if (stockData) {
        html += this.renderStockRow(stockData);
      }
    }
    
    html += '</div>';
    html += '<div class="updated-time">Updated: ' + (Object.values(this._stocksData)[0] ? Object.values(this._stocksData)[0].lastUpdated : 'Unknown') + '</div>';
    html += '</div>';
    
    return html;
  }

  renderStockRow(stockData) {
    var isPositive = parseFloat(stockData.change) >= 0;
    var changeClass = isPositive ? "positive" : "negative";
    var changeSign = isPositive ? '+' : '';
    
    var html = '<div class="stock-row">';
    html += '<div class="symbol-section">';
    html += '<div class="symbol">' + stockData.symbol + '</div>';
    html += '<div class="company-name">' + stockData.name + '</div>';
    html += '</div>';
    
    if (this._config.show_chart) {
      html += this.renderSparkline(stockData);
    } else {
      html += '<div class="sparkline-placeholder"></div>';
    }
    
    html += '<div class="price-data">';
    html += '<div class="current-price">' + stockData.price + '</div>';
    html += '<div class="change-data ' + changeClass + '">';
    html += '<span class="change-amount">' + changeSign + stockData.change + '</span>';
    html += '<span class="change-percent">' + changeSign + stockData.changePercent + '%</span>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="market-badge ' + (stockData.marketState ? stockData.marketState.toLowerCase() : 'closed') + '">';
    html += (stockData.marketState === 'DEMO' ? 'DEMO' : stockData.marketState || "CLOSED");
    html += '</div>';
    
    html += '</div>';
    return html;
  }

  renderSparkline(stockData) {
    if (!stockData.chartData || !stockData.timestamps) {
      return '<div class="sparkline-container"><div class="no-data">—</div></div>';
    }

    var prices = stockData.chartData.close || [];
    if (prices.length === 0) {
      return '<div class="sparkline-container"><div class="no-data">—</div></div>';
    }

    var validPrices = [];
    for (var i = 0; i < prices.length; i++) {
      if (prices[i] !== null && prices[i] !== undefined) {
        validPrices.push(prices[i]);
      }
    }
    
    if (validPrices.length === 0) {
      return '<div class="sparkline-container"><div class="no-data">—</div></div>';
    }

    var minPrice = Math.min.apply(Math, validPrices);
    var maxPrice = Math.max.apply(Math, validPrices);
    var priceRange = maxPrice - minPrice || 1;

    var chartPoints = '';
    var last30Prices = validPrices.slice(-30);
    
    for (var i = 0; i < last30Prices.length; i++) {
      var price = last30Prices[i];
      var x = (i / (last30Prices.length - 1)) * 100;
      var y = 100 - ((price - minPrice) / priceRange) * 80 + 10;
      chartPoints += x + ',' + y;
      if (i < last30Prices.length - 1) chartPoints += ' ';
    }

    var isPositive = validPrices[validPrices.length - 1] >= validPrices[0];
    var strokeColor = isPositive ? '#00C853' : '#FF5252';

    return '<div class="sparkline-container">' +
           '<svg viewBox="0 0 100 100" class="sparkline">' +
           '<polyline points="' + chartPoints + '" fill="none" stroke="' + strokeColor + '" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
           '</svg>' +
           '</div>';
  }

  getStyles() {
    return '.card-content{padding:0;background:var(--card-background-color,#1e1e1e);color:var(--primary-text-color,#ffffff)}.multi-stock-layout{padding:0}.stocks-container{display:flex;flex-direction:column}.stock-row{display:grid;grid-template-columns:120px 80px 1fr auto;gap:16px;align-items:center;min-height:44px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)}.stock-row:last-child{border-bottom:none}.stock-row:hover{background:rgba(255,255,255,0.02)}.symbol-section{display:flex;flex-direction:column;gap:2px}.symbol{font-size:14px;font-weight:600;color:var(--primary-text-color,#ffffff);letter-spacing:0.5px}.company-name{font-size:12px;color:var(--secondary-text-color,#a0a0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}.sparkline-container{width:80px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:4px;border:1px solid rgba(255,255,255,0.1);overflow:hidden}.sparkline{width:76px;height:36px;max-width:76px;max-height:36px}.sparkline-placeholder{width:80px;height:40px}.no-data{font-size:12px;color:var(--secondary-text-color,#666);text-align:center}.price-data{display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:80px}.current-price{font-size:16px;font-weight:600;color:var(--primary-text-color,#ffffff);font-variant-numeric:tabular-nums}.change-data{display:flex;gap:6px;font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}.change-data.positive{color:#00C853}.change-data.negative{color:#FF5252}.change-percent{opacity:0.9}.market-badge{font-size:10px;font-weight:600;padding:3px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px;min-width:40px;text-align:center}.market-badge.demo{background:rgba(255,193,7,0.2);color:#FFC107;border:1px solid rgba(255,193,7,0.3)}.updated-time{text-align:right;font-size:10px;color:var(--secondary-text-color,#666);margin-top:8px;padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1)}.loading{padding:16px;text-align:center;color:var(--secondary-text-color,#666)}';
  }

  getCardSize() {
    return Math.max(2, (this._config.symbols || []).length);
  }

  static getConfigElement() {
    return document.createElement('yasc-card-editor');
  }

  static getStubConfig() {
    return {
      symbols: ['AAPL', 'GOOGL', 'MSFT'],
      names: ['Apple Inc.', 'Alphabet Inc.', 'Microsoft Corp.'],
      update_interval: 60,
      show_chart: true
    };
  }
}

class YascCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pendingUpdates = {}; // Track pending changes
  }

  setConfig(config) {
    this._config = config || {};
    this.render();
  }

  configChanged(newConfig) {
    var event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    var symbols = this._config.symbols || ['AAPL'];
    var names = this._config.names || [];
    
    var html = '<div style="padding: 16px;">';
    
    html += '<div style="margin-bottom: 20px;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
    html += '<label style="font-weight: 500; font-size: 16px; color: var(--primary-text-color, #ffffff);">Stock Symbols:</label>';
    html += '<button type="button" id="add-symbol" style="background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">+ Add Symbol</button>';
    html += '</div>';
    
    html += '<div id="symbols-container" style="display: flex; flex-direction: column; gap: 8px;">';
    for (var i = 0; i < symbols.length; i++) {
      var symbol = symbols[i];
      var name = names[i] || '';
      html += this.renderSymbolRow(symbol, name, i);
    }
    html += '</div>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label style="font-weight: 500; color: var(--primary-text-color, #ffffff);">Update Interval:</label><br>';
    html += '<input type="number" id="update_interval" value="' + (this._config.update_interval || 60) + '" min="10" max="3600" style="width: 100px; padding: 8px; margin-top: 4px; border: 1px solid var(--divider-color, #555); border-radius: 4px; background: var(--primary-background-color, #1e1e1e); color: var(--primary-text-color, #ffffff);">';
    html += '<span style="font-size: 12px; color: var(--secondary-text-color, #aaa); margin-left: 8px;">seconds (10-3600)</span>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label style="font-weight: 500; color: var(--primary-text-color, #ffffff);"><input type="checkbox" id="show_chart" ' + (this._config.show_chart === true ? 'checked' : '') + ' style="margin-right: 8px;"> Show Sparkline Charts</label>';
    html += '</div>';
    
    html += '<div style="background: var(--secondary-background-color, #2c2c2c); padding: 12px; border-radius: 4px; margin-top: 16px; border: 1px solid var(--divider-color, #555);">';
    html += '<strong style="color: var(--primary-text-color, #ffffff);">Popular Symbols - Click to Add:</strong>';
    html += '<div style="margin: 8px 0; display: flex; flex-wrap: wrap; gap: 4px;">';
    
    var popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'BTC-USD', 'ETH-USD'];
    for (var i = 0; i < popularSymbols.length; i++) {
      var sym = popularSymbols[i];
      html += '<button type="button" class="symbol-suggestion" data-symbol="' + sym + '" style="background: var(--primary-background-color, #3c3c3c); color: var(--primary-text-color, #ffffff); border: 1px solid var(--divider-color, #555); padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; margin: 2px; transition: background 0.2s; font-weight: 500;">' + sym + '</button>';
    }
    
    html += '</div>';
    html += '<div style="font-size: 11px; color: var(--secondary-text-color, #aaa);">Click any symbol above to add it quickly to your watchlist</div>';
    html += '</div>';
    
    html += '</div>';
    
    this.shadowRoot.innerHTML = html;
    this.attachEventListeners();
  }

  renderSymbolRow(symbol, name, index) {
    var isOnlySymbol = (this._config.symbols || ['AAPL']).length === 1;
    return '<div class="symbol-row" style="display: grid; grid-template-columns: 120px 1fr 40px; gap: 8px; align-items: center; padding: 12px; background: var(--card-background-color, #2c2c2c); border-radius: 6px; border: 1px solid var(--divider-color, #555);">' +
           '<input type="text" class="symbol-input" data-index="' + index + '" value="' + symbol + '" placeholder="SYMBOL" style="padding: 8px; border: 1px solid var(--divider-color, #555); border-radius: 4px; text-transform: uppercase; font-weight: 600; font-size: 13px; background: var(--primary-background-color, #1e1e1e); color: var(--primary-text-color, #ffffff);">' +
           '<input type="text" class="name-input" data-index="' + index + '" value="' + name + '" placeholder="Company name (optional)" style="padding: 8px; border: 1px solid var(--divider-color, #555); border-radius: 4px; font-size: 13px; background: var(--primary-background-color, #1e1e1e); color: var(--primary-text-color, #ffffff);">' +
           '<button type="button" class="remove-symbol" data-index="' + index + '" style="background: ' + (isOnlySymbol ? '#666' : '#f44336') + '; color: white; border: none; padding: 8px; border-radius: 4px; cursor: ' + (isOnlySymbol ? 'not-allowed' : 'pointer') + '; font-size: 14px; font-weight: bold; transition: background 0.2s;" ' + (isOnlySymbol ? 'disabled title="Cannot remove last symbol"' : '') + '>×</button>' +
           '</div>';
  }

  attachEventListeners() {
    var self = this;
    
    var addButton = this.shadowRoot.getElementById('add-symbol');
    if (addButton) {
      addButton.addEventListener('click', function() {
        self.addSymbol();
      });
    }

    var suggestionButtons = this.shadowRoot.querySelectorAll('.symbol-suggestion');
    for (var i = 0; i < suggestionButtons.length; i++) {
      var button = suggestionButtons[i];
      button.addEventListener('click', function() {
        var symbol = this.getAttribute('data-symbol');
        self.addSymbol(symbol);
      });
      button.addEventListener('mouseenter', function() {
        this.style.background = 'var(--primary-color, #03a9f4)';
        this.style.color = '#ffffff';
      });
      button.addEventListener('mouseleave', function() {
        this.style.background = 'var(--primary-background-color, #3c3c3c)';
        this.style.color = 'var(--primary-text-color, #ffffff)';
      });
    }

    this.attachSymbolRowListeners();

    var numberInput = this.shadowRoot.getElementById('update_interval');
    if (numberInput) {
      numberInput.addEventListener('input', function(e) {
        var value = parseInt(e.target.value) || 60;
        self.updateConfig('update_interval', value);
      });
    }

    var checkbox = this.shadowRoot.getElementById('show_chart');
    if (checkbox) {
      checkbox.addEventListener('change', function(e) {
        self.updateConfig('show_chart', e.target.checked);
      });
    }
  }

  attachSymbolRowListeners() {
    var self = this;
    
    var symbolInputs = this.shadowRoot.querySelectorAll('.symbol-input');
    for (var i = 0; i < symbolInputs.length; i++) {
      var input = symbolInputs[i];
      
      // Use blur event instead of input event
      input.addEventListener('blur', function(e) {
        var index = parseInt(e.target.getAttribute('data-index'));
        var value = e.target.value.toUpperCase();
        e.target.value = value; // Update display to show uppercase
        self.updateSymbol(index, value);
      });
      
      // Still handle input event for auto-uppercase display but don't trigger config update
      input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
      });
    }

    var nameInputs = this.shadowRoot.querySelectorAll('.name-input');
    for (var i = 0; i < nameInputs.length; i++) {
      var input = nameInputs[i];
      
      // Use blur event instead of input event  
      input.addEventListener('blur', function(e) {
        var index = parseInt(e.target.getAttribute('data-index'));
        var value = e.target.value;
        self.updateName(index, value);
      });
    }

    var removeButtons = this.shadowRoot.querySelectorAll('.remove-symbol');
    for (var i = 0; i < removeButtons.length; i++) {
      var button = removeButtons[i];
      if (!button.disabled) {
        button.addEventListener('click', function(e) {
          var index = parseInt(e.target.getAttribute('data-index'));
          self.removeSymbol(index);
        });
        button.addEventListener('mouseenter', function() {
          if (!this.disabled) {
            this.style.background = '#d32f2f';
          }
        });
        button.addEventListener('mouseleave', function() {
          if (!this.disabled) {
            this.style.background = '#f44336';
          }
        });
      }
    }
  }

  addSymbol(symbol = '') {
    var symbols = [];
    for (var i = 0; i < (this._config.symbols || ['AAPL']).length; i++) {
      symbols.push((this._config.symbols || ['AAPL'])[i]);
    }
    
    var names = [];
    for (var i = 0; i < (this._config.names || []).length; i++) {
      names.push((this._config.names || [])[i]);
    }
    
    symbols.push(symbol || '');
    names.push('');
    
    this.updateConfig('symbols', symbols);
    this.updateConfig('names', names);
    this.render();
  }

  removeSymbol(index) {
    var symbols = [];
    for (var i = 0; i < (this._config.symbols || ['AAPL']).length; i++) {
      symbols.push((this._config.symbols || ['AAPL'])[i]);
    }
    
    var names = [];
    for (var i = 0; i < (this._config.names || []).length; i++) {
      names.push((this._config.names || [])[i]);
    }
    
    if (symbols.length <= 1) {
      return;
    }
    
    symbols.splice(index, 1);
    names.splice(index, 1);
    
    this.updateConfig('symbols', symbols);
    this.updateConfig('names', names);
    this.render();
  }

  updateSymbol(index, value) {
    var symbols = [];
    for (var i = 0; i < (this._config.symbols || ['AAPL']).length; i++) {
      symbols.push((this._config.symbols || ['AAPL'])[i]);
    }
    symbols[index] = value;
    this.updateConfig('symbols', symbols);
  }

  updateName(index, value) {
    var names = [];
    for (var i = 0; i < (this._config.names || []).length; i++) {
      names.push((this._config.names || [])[i]);
    }
    while (names.length <= index) {
      names.push('');
    }
    names[index] = value;
    this.updateConfig('names', names);
  }

  updateConfig(key, value) {
    var newConfig = {};
    for (var prop in this._config) {
      newConfig[prop] = this._config[prop];
    }
    
    if (key === 'symbols' && Array.isArray && Array.isArray(value)) {
      newConfig[key] = value;
    } else if (key === 'names' && Array.isArray && Array.isArray(value)) {
      newConfig[key] = value;
    } else if (key === 'update_interval') {
      newConfig[key] = Math.max(10, Math.min(3600, value));
    } else {
      newConfig[key] = value;
    }
    
    if (key === 'symbols') {
      delete newConfig['symbol'];
      delete newConfig['name'];
    }
    
    this._config = newConfig;
    this.configChanged(newConfig);
  }
}

customElements.define('yasc-card', YetAnotherStockCard);
customElements.define('yasc-card-editor', YascCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yasc-card',
  name: 'YASC - Yet Another Stock Card',
  description: 'Multi-stock card with GUI editor and sparklines',
  preview: false,
  documentationURL: 'https://github.com/yourusername/yasc'
});

console.log('YASC v1.4.0 - Complete Implementation with Blur Update Fix Loaded Successfully!');
