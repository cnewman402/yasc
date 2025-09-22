# Yet Another Stock Card (yasc)

A customizable Lovelace card for Home Assistant that displays real-time stock prices with charts.

## Features

- 📈 Real-time stock price updates
- 📊 Simple price chart visualization  
- 🎨 Matches Home Assistant theme
- ⚡ No API key required
- 🔄 Configurable update intervals
- 📱 Mobile-responsive design
- 🎛️ Visual configuration editor
- ⚙️ Easy setup through Home Assistant UI

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant
2. Go to "Frontend" section
3. Click the "+" button
4. Search for "Yet Another Stock Card"
5. Install the repository
6. Add the resource to your Lovelace resources

### Manual Installation

1. Download `yet-another-stock-card.js` from the [latest release](https://github.com/yourusername/yet-another-stock-card/releases)
2. Copy it to `<config>/www/community/yet-another-stock-card/`
3. Add the resource to your Lovelace resources:
   ```yaml
   resources:
     - url: /hacsfiles/yet-another-stock-card/yet-another-stock-card.js
       type: module
   ```

## Configuration

### Visual Editor (Recommended)

1. In Home Assistant, go to your dashboard
2. Click "Edit Dashboard" 
3. Click "Add Card"
4. Search for "Yet Another Stock Card"
5. Configure using the visual interface:
   - **Stock Symbol**: Enter ticker (e.g., AAPL, GOOGL, TSLA)
   - **Display Name**: Optional custom name
   - **Update Interval**: Refresh rate in seconds (10-3600)
   - **Show Chart**: Toggle price chart on/off
   - **Chart Period**: Select time range (1D, 5D, 1M, 3M, 6M, 1Y)

### YAML Configuration

You can also configure manually by adding the card to your Lovelace dashboard:

```yaml
type: custom:yasc
symbol: AAPL
name: Apple Inc.
update_interval: 60
show_chart: true
chart_period: 1D
```

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `symbol` | string | **Required** | Stock ticker symbol (e.g., AAPL, GOOGL, TSLA) |
| `name` | string | symbol | Display name for the stock |
| `update_interval` | number | 60 | Update interval in seconds |
| `show_chart` | boolean | true | Show/hide the price chart |
| `chart_period` | string | 1D | Chart time period |

## Examples

### Basic Configuration
```yaml
type: custom:yasc
symbol: TSLA
```

### Advanced Configuration
```yaml
type: custom:yasc
symbol: GOOGL
name: Alphabet Inc.
update_interval: 30
show_chart: true
chart_period: 1D
```

### Multiple Stocks
```yaml
type: grid
columns: 2
cards:
  - type: custom:yasc
    symbol: AAPL
    name: Apple
  - type: custom:yasc
    symbol: MSFT
    name: Microsoft
  - type: custom:yasc
    symbol: TSLA
    name: Tesla
  - type: custom:yasc
    symbol: AMZN
    name: Amazon
```

## Supported Symbols

The card supports all major stock symbols available on Yahoo Finance, including:
- US Stocks: AAPL, GOOGL, MSFT, TSLA, AMZN, etc.
- International: ASML.AS, SAP.DE, 0700.HK, etc.
- Crypto: BTC-USD, ETH-USD, etc.
- Indices: ^GSPC (S&P 500), ^DJI (Dow Jones), etc.

## Data Source

This card uses Yahoo Finance's free API, which provides:
- Real-time price data during market hours
- Historical price data for charts
- Market status information
- No API key required

**Note:** Yahoo Finance data is for informational purposes only and should not be used for trading decisions.

## Troubleshooting

### Card not loading
- Ensure the resource is added correctly to Lovelace resources
- Check browser console for errors
- Verify the symbol exists on Yahoo Finance

### No data showing
- Check your internet connection
- Try a different stock symbol
- Some symbols may not be available outside market hours

### Chart not displaying
- Charts require historical data which may not be available for all symbols
- Set `show_chart: false` to hide the chart section

## Contributing

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Real-time stock price tracking
- Basic chart visualization
- HACS integration
- Visual configuration editor
- Support for popular stock symbols and crypto

## Support

If you find this card useful, consider:
- ⭐ Starring this repository
- 🐛 Reporting issues
- 💡 Suggesting new features
- ☕ [Buying me a coffee](https://buymeacoffee.com/yourusername)

---

**Disclaimer:** This software is provided for informational purposes only. Stock prices and financial data should not be used for trading decisions. Always consult with a financial advisor for investment advice.
