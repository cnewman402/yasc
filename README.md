# 💰 YASC - Yet Another Stock Card

A modern, feature-rich Home Assistant Lovelace card for displaying live stock market data with sparkline charts and an intuitive GUI editor.

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Compatible-blue.svg)](https://www.home-assistant.io/)
[![Version](https://img.shields.io/badge/Version-1.5.0-green.svg)](https://github.com/cnewman402/yasc/releases)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- **📈 Live Stock Data**: Real-time stock prices from Yahoo Finance API
- **📊 Sparkline Charts**: Optional mini-charts showing price trends
- **🖱️ Visual Editor**: Easy-to-use GUI configuration editor
- **📱 Multi-Stock Support**: Display multiple stocks in a single card
- **🔄 Auto-Updates**: Configurable refresh intervals (10-3600 seconds)
- **🎨 Modern Design**: Dark theme with responsive layout
- **⚡ Fallback System**: Demo data when live data is unavailable
- **🌐 CORS Bypass**: Built-in proxy for Yahoo Finance API access

## 📸 Screenshots

### Main Card View
![YASC Main Card](screenshot-main.png)

### Configuration Editor
![YASC Editor](screenshot-editor.png)

## 🚀 Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Go to "Frontend" section
3. Click the three dots menu (⋮) in the top right corner
4. Select "Custom repositories"
5. Add the repository URL: `https://github.com/cnewman402/yasc`
6. Select category: "Dashboard"
7. Click "ADD"
8. Find "YASC - Yet Another Stock Card" in the Frontend section
9. Click "Download" and then "Download" again to confirm
10. Restart Home Assistant
11. Clear your browser cache

### Manual Installation

1. Download `yasc.js` from the [latest release](https://github.com/cnewman402/yasc/releases)
2. Copy the file to your `config/www/` directory
3. Add the resource to your Lovelace configuration:

```yaml
resources:
  - url: /local/yasc.js
    type: module
```

## ⚙️ Configuration

### Basic Configuration

```yaml
type: custom:yasc-card
symbols:
  - AAPL
  - GOOGL
  - MSFT
names:
  - Apple Inc.
  - Alphabet Inc.
  - Microsoft Corp.
update_interval: 60
show_chart: true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `symbols` | array | `['AAPL']` | Stock symbols to display |
| `names` | array | `[]` | Custom display names (optional) |
| `update_interval` | number | `60` | Update interval in seconds (10-3600) |
| `show_chart` | boolean | `false` | Show sparkline charts |

### Legacy Configuration (Single Stock)

For backward compatibility, single stock configuration is still supported:

```yaml
type: custom:yasc-card
symbol: AAPL
name: Apple Inc.
update_interval: 60
show_chart: true
```

## 📊 Supported Symbols

YASC supports most symbols available on Yahoo Finance, including:

**US Stocks**: AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META, etc.
**Cryptocurrencies**: BTC-USD, ETH-USD, ADA-USD, etc.
**ETFs**: SPY, QQQ, VTI, etc.
**International**: NESN.SW, SAP.DE, 7203.T, etc.

## 🛠️ Technical Details

### Data Sources

- **Primary**: Yahoo Finance API via AllOrigins proxy
- **Fallback**: Generated demo data for testing/offline use

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 10.1+
- Edge 79+

### Performance

- Lightweight (~25KB minified)
- Efficient DOM updates
- Memory-optimized chart rendering
- Configurable update intervals to reduce API calls

## 🎨 Theming

YASC automatically adapts to your Home Assistant theme using CSS custom properties:

- `--card-background-color`
- `--primary-text-color`
- `--secondary-text-color`
- `--divider-color`

## 🔧 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/cnewman402/yasc.git
cd yasc

# The main file is already built - yasc.js
# Make your changes and test locally
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 Changelog

### v1.5.0 (Current)
- Multi-stock support with array configuration
- Visual configuration editor with popular symbols
- Improved error handling and fallback system
- Enhanced UI with better responsive design
- Market state indicators (DEMO mode)

### Previous Versions
- v1.4.x: Sparkline charts and theme support
- v1.3.x: CORS proxy integration
- v1.2.x: Basic stock data display
- v1.1.x: Initial Home Assistant integration
- v1.0.x: First release

## 🐛 Troubleshooting

### Common Issues

**"Loading stocks..." shows indefinitely**
- Check your internet connection
- Verify stock symbols are correct
- The card will show demo data if API fails

**Sparklines not showing**
- Ensure `show_chart: true` is set in configuration
- Some symbols may not have historical data

**Configuration editor not working**
- Clear browser cache
- Ensure you're using a supported browser
- Check browser console for JavaScript errors

### Debug Mode

Add this to your browser console to enable debug logging:
```javascript
localStorage.setItem('yasc-debug', 'true');
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Yahoo Finance for providing stock data
- Home Assistant community for feedback and testing
- AllOrigins for CORS proxy service

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/cnewman402/yasc/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/cnewman402/yasc/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/cnewman402/yasc/wiki)

---

<p align="center">Made with ❤️ for the Home Assistant community</p>
