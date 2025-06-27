# BlockSignal

A real-time Bitcoin price monitoring dashboard with custom alerts and live WebSocket data feeds.

![BlockSignal Dashboard](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript) ![WebSocket](https://img.shields.io/badge/WebSocket-Live%20Data-green?style=for-the-badge)

## 📸 Preview

<div align="center">

> **Live Dashboard Features:**
> - Real-time Bitcoin price with green/red price movement indicators
> - Live WebSocket connection status
> - 24h High, Low, Volume, and Change statistics  
> - Custom price alerts with desktop notifications
> - Clean, responsive design with Space Grotesk typography
> - Auto-reconnection with connection status indicators

*Screenshot coming soon - see the live dashboard at [http://localhost:3000](http://localhost:3000) after running `npm run dev`*

</div>

## ✨ Features

- **Real-time Price Updates** - Live WebSocket connection to Coinbase Exchange
- **Smart Fallback System** - Automatic REST API fallback for reliability
- **Custom Price Alerts** - Desktop notifications when price thresholds are met
- **24h Market Stats** - High, low, volume, and change statistics
- **Auto-reconnection** - Robust connection handling with exponential backoff
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Zero Mock Data** - All data sourced directly from Coinbase Exchange API

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Space Grotesk** - Modern typography

### Data & APIs
- **Coinbase Exchange WebSocket** - Real-time ticker data
- **Coinbase Exchange REST API** - Fallback and initial data
- **Browser Notifications API** - Desktop alert system

### Architecture
- **React Hooks** - Custom hooks for WebSocket management
- **Server-Side Rendering (SSR)** - Next.js SSR with client-side hydration
- **Real-time State Management** - Optimized React state with useCallback/useRef
- **Performance Monitoring** - Built-in performance logging

### Testing
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **WebSocket Mocking** - Comprehensive test coverage

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/blocksignal.git
   cd blocksignal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📊 How It Works

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Coinbase      │    │   BlockSignal    │    │     User        │
│   Exchange      │◄──►│   Dashboard      │◄──►│   Interface     │
│                 │    │                  │    │                 │
│ • WebSocket     │    │ • Real-time      │    │ • Price Display │
│ • REST API      │    │   State Mgmt     │    │ • Custom Alerts │
│ • Ticker Data   │    │ • Fallback Logic │    │ • Notifications │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### WebSocket Connection Strategy

1. **Primary Connection**: WebSocket to `wss://ws-feed.exchange.coinbase.com`
2. **Subscription**: Real-time ticker updates for BTC-USD
3. **Fallback System**: REST API polling if WebSocket fails
4. **Auto-reconnection**: Exponential backoff with jitter
5. **Error Handling**: Comprehensive close code handling

### Alert System

- **Threshold-based**: Set price above/below alerts
- **Browser Notifications**: Desktop notifications when triggered
- **Persistent Storage**: Alerts saved in localStorage
- **Real-time Monitoring**: Continuous price checking

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for custom configuration:

```env
# Development mode (shows debug panel)
NODE_ENV=development

# Custom API endpoints (optional)
NEXT_PUBLIC_COINBASE_WS_URL=wss://ws-feed.exchange.coinbase.com
NEXT_PUBLIC_COINBASE_API_URL=https://api.exchange.coinbase.com
```

### Customization

- **Product ID**: Change `BTC-USD` to other Coinbase pairs in `useCoinbaseTicker.ts`
- **Update Frequency**: Modify polling intervals in the WebSocket hook
- **Styling**: Customize colors and themes in `tailwind.config.js`

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test file
npm test useCoinbaseTicker.test.ts

# Test coverage report
npm run test:coverage
```

**Test Coverage Areas:**
- WebSocket connection handling
- Price ticker component rendering
- Alert management system
- Error boundary scenarios
- Mock WebSocket implementations

## 📱 Browser Support

- **Chrome** 88+
- **Firefox** 85+
- **Safari** 14+
- **Edge** 88+

*WebSocket and Notification APIs required*

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy with Vercel**
   - Connect your GitHub repository
   - Auto-deploys on every push to main
   - Zero configuration required

### Other Platforms

- **Netlify**: Works with static export
- **Railway**: Full-stack deployment
- **DigitalOcean**: App Platform compatible

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Coinbase Exchange** - Real-time market data
- **Next.js Team** - Amazing React framework
- **Tailwind CSS** - Utility-first CSS framework
- **Space Grotesk** - Beautiful typography

---

**Built with ❤️ for the crypto community**

For questions or support, please open an issue on GitHub.