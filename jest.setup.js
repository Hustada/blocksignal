import '@testing-library/jest-dom'

// Mock WebSocket for tests
const MockWebSocketClass = jest.fn().mockImplementation(function(url) {
  this.url = url
  this.readyState = MockWebSocketClass.CONNECTING
  this.send = jest.fn()
  this.close = jest.fn(() => {
    this.readyState = MockWebSocketClass.CLOSED
    this.onclose?.({ code: 1000, reason: 'Test close' })
  })
  
  // Methods to simulate WebSocket events in tests
  this.simulateMessage = (data) => {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
  
  this.simulateError = () => {
    this.onerror?.()
  }
  
  // Auto-trigger onopen after a brief delay
  setTimeout(() => {
    this.readyState = MockWebSocketClass.OPEN
    this.onopen?.()
  }, 0)
})

MockWebSocketClass.CONNECTING = 0
MockWebSocketClass.OPEN = 1
MockWebSocketClass.CLOSING = 2
MockWebSocketClass.CLOSED = 3

global.WebSocket = MockWebSocketClass

// Mock Notification API
global.Notification = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
}))
global.Notification.permission = 'granted'
global.Notification.requestPermission = jest.fn().mockResolvedValue('granted')

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    type: 'sine',
    start: jest.fn(),
    stop: jest.fn(),
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
  }),
  destination: {},
  currentTime: 0,
}))

// Mock window.webkitAudioContext for Safari
global.webkitAudioContext = global.AudioContext