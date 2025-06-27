import { render, screen, fireEvent } from '@testing-library/react'
import { PriceTicker } from '../PriceTicker'

// Mock the useCoinbaseTicker hook
jest.mock('@/hooks/useCoinbaseTicker', () => ({
  useCoinbaseTicker: jest.fn(),
}))

const mockUseCoinbaseTicker = require('@/hooks/useCoinbaseTicker').useCoinbaseTicker

describe('PriceTicker', () => {
  const mockReconnect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state when price is null', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: null,
      tickerData: null,
      isConnected: false,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByText('BTC-USD')).toBeInTheDocument()
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('renders price and connection status correctly', () => {
    const mockTickerData = {
      price: '50000.00',
      time: '2023-01-01T12:00:00.000000Z',
      product_id: 'BTC-USD',
      sequence: 123,
      side: 'buy' as const,
      last_size: '0.1',
      best_bid: '49999.99',
      best_ask: '50000.01',
      volume_24h: '1000.0',
      low_24h: '49000.0',
      high_24h: '51000.0',
      volume_30d: '30000.0',
      best_bid_size: '1.0',
      best_ask_size: '1.0',
      open_24h: '49500.0',
    }

    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: mockTickerData,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    expect(screen.getByText('$50,000.00')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('BTC-USD')).toBeInTheDocument()
  })

  it('renders 24h statistics when ticker data is available', () => {
    const mockTickerData = {
      price: '50000.00',
      time: '2023-01-01T12:00:00.000000Z',
      product_id: 'BTC-USD',
      sequence: 123,
      side: 'buy' as const,
      last_size: '0.1',
      best_bid: '49999.99',
      best_ask: '50000.01',
      volume_24h: '1000.0',
      low_24h: '49000.0',
      high_24h: '51000.0',
      volume_30d: '30000.0',
      best_bid_size: '1.0',
      best_ask_size: '1.0',
      open_24h: '49500.0',
    }

    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: mockTickerData,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    expect(screen.getByText('24h High')).toBeInTheDocument()
    expect(screen.getByText('$51,000.00')).toBeInTheDocument()
    expect(screen.getByText('24h Low')).toBeInTheDocument()
    expect(screen.getByText('$49,000.00')).toBeInTheDocument()
    expect(screen.getByText('24h Volume')).toBeInTheDocument()
    expect(screen.getByText('1,000 BTC')).toBeInTheDocument()
    expect(screen.getByText('24h Change')).toBeInTheDocument()
  })

  it('calculates and displays 24h change correctly for positive change', () => {
    const mockTickerData = {
      price: '50000.00',
      open_24h: '49000.0',
      time: '2023-01-01T12:00:00.000000Z',
      product_id: 'BTC-USD',
      sequence: 123,
      side: 'buy' as const,
      last_size: '0.1',
      best_bid: '49999.99',
      best_ask: '50000.01',
      volume_24h: '1000.0',
      low_24h: '49000.0',
      high_24h: '51000.0',
      volume_30d: '30000.0',
      best_bid_size: '1.0',
      best_ask_size: '1.0',
    }

    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: mockTickerData,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    // Change: 50000 - 49000 = +1000 (+2.04%)
    expect(screen.getByText('+$1000.00 (+2.04%)')).toBeInTheDocument()
  })

  it('calculates and displays 24h change correctly for negative change', () => {
    const mockTickerData = {
      price: '48000.00',
      open_24h: '49000.0',
      time: '2023-01-01T12:00:00.000000Z',
      product_id: 'BTC-USD',
      sequence: 123,
      side: 'buy' as const,
      last_size: '0.1',
      best_bid: '47999.99',
      best_ask: '48000.01',
      volume_24h: '1000.0',
      low_24h: '47000.0',
      high_24h: '51000.0',
      volume_30d: '30000.0',
      best_bid_size: '1.0',
      best_ask_size: '1.0',
    }

    mockUseCoinbaseTicker.mockReturnValue({
      price: 48000,
      tickerData: mockTickerData,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    // Change: 48000 - 49000 = -1000 (-2.04%)
    expect(screen.getByText('-$1000.00 (-2.04%)')).toBeInTheDocument()
  })

  it('displays last update time', () => {
    const mockTickerData = {
      price: '50000.00',
      time: '2023-01-01T12:00:00.000Z',
      product_id: 'BTC-USD',
      sequence: 123,
      side: 'buy' as const,
      last_size: '0.1',
      best_bid: '49999.99',
      best_ask: '50000.01',
      volume_24h: '1000.0',
      low_24h: '49000.0',
      high_24h: '51000.0',
      volume_30d: '30000.0',
      best_bid_size: '1.0',
      best_ask_size: '1.0',
      open_24h: '49500.0',
    }

    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: mockTickerData,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('renders error state and reconnect button', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: null,
      tickerData: null,
      isConnected: false,
      error: 'Connection failed',
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    expect(screen.getByText('Connection failed')).toBeInTheDocument()
    expect(screen.getByText('Reconnect')).toBeInTheDocument()
  })

  it('calls reconnect function when reconnect button is clicked', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: null,
      tickerData: null,
      isConnected: false,
      error: 'Connection failed',
      reconnect: mockReconnect,
    })

    render(<PriceTicker />)

    fireEvent.click(screen.getByText('Reconnect'))

    expect(mockReconnect).toHaveBeenCalledTimes(1)
  })

  it('calls onPriceChange callback when price changes', () => {
    const mockOnPriceChange = jest.fn()

    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: null,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker onPriceChange={mockOnPriceChange} />)

    expect(mockOnPriceChange).toHaveBeenCalledWith(50000)
  })

  it('uses custom product ID', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: 3000,
      tickerData: null,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    render(<PriceTicker productId="ETH-USD" />)

    expect(screen.getByText('ETH-USD')).toBeInTheDocument()
    expect(mockUseCoinbaseTicker).toHaveBeenCalledWith('ETH-USD')
  })

  it('applies correct CSS classes for connection status indicator', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: 50000,
      tickerData: null,
      isConnected: true,
      error: null,
      reconnect: mockReconnect,
    })

    const { container } = render(<PriceTicker />)

    const indicator = container.querySelector('.bg-green-400')
    expect(indicator).toBeInTheDocument()
  })

  it('applies correct CSS classes for disconnected status indicator', () => {
    mockUseCoinbaseTicker.mockReturnValue({
      price: null,
      tickerData: null,
      isConnected: false,
      error: null,
      reconnect: mockReconnect,
    })

    const { container } = render(<PriceTicker />)

    const indicator = container.querySelector('.bg-red-400')
    expect(indicator).toBeInTheDocument()
  })
})