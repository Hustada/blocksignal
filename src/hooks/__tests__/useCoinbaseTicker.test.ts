import { renderHook, act } from '@testing-library/react'
import { useCoinbaseTicker } from '../useCoinbaseTicker'

// Get reference to the mocked WebSocket class
const MockWebSocket = global.WebSocket as jest.MockedFunction<typeof WebSocket>

describe('useCoinbaseTicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCoinbaseTicker())

    expect(result.current.price).toBeNull()
    expect(result.current.tickerData).toBeNull()
    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.reconnect).toBe('function')
  })

  it('should connect to WebSocket on mount', () => {
    renderHook(() => useCoinbaseTicker('BTC-USD'))

    expect(MockWebSocket).toHaveBeenCalledWith('wss://ws-feed.pro.coinbase.com')
  })

  it('should set connected state when WebSocket opens', async () => {
    const { result } = renderHook(() => useCoinbaseTicker())
    
    // Get the WebSocket instance
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    // Simulate WebSocket open
    act(() => {
      wsInstance.onopen()
    })

    expect(result.current.isConnected).toBe(true)
    expect(wsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        channels: [
          {
            name: 'ticker',
            product_ids: ['BTC-USD']
          }
        ]
      })
    )
  })

  it('should handle ticker messages', () => {
    const { result } = renderHook(() => useCoinbaseTicker('BTC-USD'))
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    // Simulate WebSocket open
    act(() => {
      wsInstance.onopen()
    })

    // Simulate ticker message
    const tickerData = {
      type: 'ticker',
      product_id: 'BTC-USD',
      price: '50000.00',
      time: '2023-01-01T00:00:00.000000Z',
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

    act(() => {
      wsInstance.simulateMessage(tickerData)
    })

    expect(result.current.price).toBe(50000)
    expect(result.current.tickerData).toEqual(tickerData)
  })

  it('should ignore messages for different product IDs', () => {
    const { result } = renderHook(() => useCoinbaseTicker('BTC-USD'))
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    act(() => {
      wsInstance.onopen()
    })

    // Simulate ticker message for different product
    const tickerData = {
      type: 'ticker',
      product_id: 'ETH-USD',
      price: '3000.00',
    }

    act(() => {
      wsInstance.simulateMessage(tickerData)
    })

    expect(result.current.price).toBeNull()
    expect(result.current.tickerData).toBeNull()
  })

  it('should handle WebSocket errors', () => {
    const { result } = renderHook(() => useCoinbaseTicker())
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    act(() => {
      wsInstance.simulateError()
    })

    expect(result.current.error).toBe('Connection error occurred')
  })

  it('should handle WebSocket close and auto-reconnect', () => {
    const { result } = renderHook(() => useCoinbaseTicker())
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    // Simulate connection established
    act(() => {
      wsInstance.onopen()
    })

    expect(result.current.isConnected).toBe(true)

    // Simulate unexpected close (code !== 1000)
    act(() => {
      wsInstance.onclose({ code: 1006, reason: 'Connection lost' })
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBe('Connection lost. Reconnecting...')

    // Fast-forward timers to trigger reconnection
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // Should create a new WebSocket instance
    expect(MockWebSocket).toHaveBeenCalledTimes(2)
  })

  it('should not auto-reconnect on normal close', () => {
    const { result } = renderHook(() => useCoinbaseTicker())
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    // Simulate normal close (code 1000)
    act(() => {
      wsInstance.onclose({ code: 1000, reason: 'Normal close' })
    })

    expect(result.current.isConnected).toBe(false)

    // Fast-forward timers
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // Should not create a new WebSocket instance
    expect(MockWebSocket).toHaveBeenCalledTimes(1)
  })

  it('should reconnect when reconnect function is called', () => {
    const { result } = renderHook(() => useCoinbaseTicker())
    
    act(() => {
      result.current.reconnect()
    })

    // Should create a new WebSocket instance
    expect(MockWebSocket).toHaveBeenCalledTimes(2)
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useCoinbaseTicker())
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    unmount()

    expect(wsInstance.close).toHaveBeenCalledWith(1000, 'Component unmounting')
  })

  it('should handle invalid JSON messages gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const { result } = renderHook(() => useCoinbaseTicker())
    
    const wsInstance = MockWebSocket.mock.instances[0] as any
    
    act(() => {
      wsInstance.onopen()
    })

    // Simulate invalid JSON message
    act(() => {
      wsInstance.onmessage({ data: 'invalid json' })
    })

    expect(result.current.price).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(SyntaxError))
    
    consoleSpy.mockRestore()
  })
})