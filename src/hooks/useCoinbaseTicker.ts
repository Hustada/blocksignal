import { useState, useEffect, useRef } from 'react';

export interface TickerData {
  price: string;
  time: string;
  product_id: string;
  sequence: number;
  side: 'buy' | 'sell';
  last_size: string;
  best_bid: string;
  best_ask: string;
  volume_24h: string;
  low_24h: string;
  high_24h: string;
  volume_30d: string;
  best_bid_size: string;
  best_ask_size: string;
  open_24h: string;
}

export interface CoinbaseTickerHook {
  price: number | null;
  tickerData: TickerData | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useCoinbaseTicker(productId: string = 'BTC-USD'): CoinbaseTickerHook {
  const [price, setPrice] = useState<number | null>(null);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const fallbackStoppedRef = useRef(false);
  const isConnectingRef = useRef(false);

  const fetchPriceData = async () => {
    try {
      // Get real market data from Coinbase Exchange API
      const [tickerResponse, statsResponse] = await Promise.all([
        fetch(`https://api.exchange.coinbase.com/products/${productId}/ticker`, {
          headers: { 'User-Agent': 'crypto-dashboard/1.0' }
        }),
        fetch(`https://api.exchange.coinbase.com/products/${productId}/stats`, {
          headers: { 'User-Agent': 'crypto-dashboard/1.0' }
        })
      ]);
      
      // Handle rate limiting
      if (tickerResponse.status === 429) {
        console.warn('Rate limited by Coinbase API');
        setError('Rate limited - reducing update frequency');
        return;
      }
      
      if (!tickerResponse.ok) {
        throw new Error(`Ticker API error: ${tickerResponse.status}`);
      }
      
      const [tickerData, statsData] = await Promise.all([
        tickerResponse.json(),
        statsResponse.ok ? statsResponse.json() : null
      ]);
      
      const currentPrice = parseFloat(tickerData.price);
      
      if (currentPrice && !isNaN(currentPrice)) {
        setPrice(currentPrice);
        
        // Build ticker data using ONLY real API data
        const realTickerData: TickerData = {
          price: tickerData.price,
          time: tickerData.time,
          product_id: productId,
          sequence: tickerData.trade_id || Date.now(),
          side: 'buy', // Not available in REST API
          last_size: tickerData.size || '0',
          best_bid: tickerData.bid || '0',
          best_ask: tickerData.ask || '0',
          volume_24h: statsData?.volume || tickerData.volume || '0',
          low_24h: statsData?.low || '0',
          high_24h: statsData?.high || '0',
          volume_30d: statsData?.volume_30day || '0',
          best_bid_size: '0', // Not available in REST API
          best_ask_size: '0', // Not available in REST API
          open_24h: statsData?.open || '0',
        };
        setTickerData(realTickerData);
        setError(null); // Clear error when REST API is working
        setIsConnected(true); // Show as connected when REST API is working
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (err) {
      console.error('Failed to fetch price data:', err);
      setError('Unable to fetch price data');
    }
  };

  const startFallback = () => {
    console.log('Starting REST API polling...');
    fallbackStoppedRef.current = false;
    fetchPriceData(); // Initial fetch
    fallbackIntervalRef.current = setInterval(fetchPriceData, 5000); // Poll every 5 seconds
  };

  const stopFallback = () => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  };

  const connect = () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('⚠️ Connection already in progress, skipping...');
      return;
    }

    try {
      isConnectingRef.current = true;
      setError(null);
      stopFallback(); // Stop fallback if we're trying to reconnect
      fallbackStoppedRef.current = false; // Reset flag when attempting new connection
      
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('🔄 Closing existing WebSocket before creating new one');
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log('🔌 Creating new WebSocket connection...');
      const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      wsRef.current = ws;
      
      // Add timeout for connection (only if not opened within reasonable time)
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout after 15 seconds, closing...');
          ws.close();
          setError('Connection timeout - retrying...');
          // Auto-retry after timeout
          setTimeout(() => connect(), 3000);
        }
      }, 15000); // Longer timeout to allow proper connection

      ws.onopen = () => {
        console.log('✅ WebSocket OPENED - Connected to Coinbase');
        isConnectingRef.current = false; // Connection established
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        // Don't reset counter here - only reset when we actually receive data
        
        // Subscribe to ticker updates with proper format - must be sent within 5 seconds
        const subscribeMessage = {
          type: 'subscribe',
          product_ids: [productId],
          channels: ['ticker']
        };
        
        console.log('📤 Sending subscription:', JSON.stringify(subscribeMessage));
        
        try {
          ws.send(JSON.stringify(subscribeMessage));
          console.log('✅ Subscription message sent successfully');
        } catch (err) {
          console.error('❌ Failed to send subscription message:', err);
          setError('Failed to subscribe to price feed');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type, data.product_id || 'N/A');
          
          if (data.type === 'ticker' && data.product_id === productId) {
            const priceNum = parseFloat(data.price);
            setPrice(priceNum);
            setTickerData(data);
            // Reset counter only when we actually receive ticker data
            reconnectAttemptsRef.current = 0;
            // Stop REST API polling since WebSocket is working (only once)
            if (!fallbackStoppedRef.current) {
              console.log('🚀 WebSocket working! Stopping REST API polling');
              stopFallback();
              fallbackStoppedRef.current = true;
            }
          } else if (data.type === 'subscriptions') {
            console.log('✅ WebSocket subscription confirmed:', data);
          } else if (data.type === 'error') {
            console.error('❌ WebSocket error message:', data);
            setError(`WebSocket error: ${data.message || 'Unknown error'}`);
          } else {
            console.log('📋 Other WebSocket message:', data.type, data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState);
        isConnectingRef.current = false; // Reset connection flag
        clearTimeout(connectionTimeout);
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('🔴 WebSocket CLOSED:', event.code, event.reason || 'No reason provided');
        console.log('🔍 Close event details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        isConnectingRef.current = false; // Reset connection flag
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        
        // Handle different close codes appropriately
        if (event.code !== 1000) { // Not a normal close
          const getErrorMessage = (code: number) => {
            switch (code) {
              case 1001: return 'Server going away';
              case 1002: return 'Protocol error';
              case 1003: return 'Unsupported data type';
              case 1005: return 'No status received';
              case 1006: return 'Abnormal closure';
              case 1007: return 'Invalid data';
              case 1008: return 'Policy violation';
              case 1009: return 'Message too large';
              case 1011: return 'Server error';
              case 1012: return 'Service restart';
              case 1013: return 'Try again later';
              case 1014: return 'Bad gateway';
              case 1015: return 'TLS handshake failed';
              default: return `Connection error (${code})`;
            }
          };

          reconnectAttemptsRef.current++;
          const errorMsg = getErrorMessage(event.code);
          
          // For certain errors, wait longer before retrying
          const shouldDelayLonger = [1008, 1013, 1014].includes(event.code); // Policy, try later, bad gateway
          const baseDelay = shouldDelayLonger ? 30000 : 5000;
          
          if (reconnectAttemptsRef.current >= 2) {
            console.log('🔄 WebSocket unstable after 2 attempts, switching to REST API fallback');
            setError(`${errorMsg} - using REST API fallback`);
            startFallback();
          } else {
            setError(`${errorMsg}. Reconnecting... (${reconnectAttemptsRef.current}/2)`);
            // Add longer delay for reconnection to avoid rapid reconnect cycles
            const baseDelay = 10000; // Start with 10 seconds
            const jitter = Math.random() * 2000; // 0-2 seconds jitter
            const retryDelay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current) + jitter, 30000);
            console.log(`⏰ Will retry in ${Math.round(retryDelay/1000)} seconds`);
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/2)...`);
              connect();
            }, retryDelay);
          }
        }
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      isConnectingRef.current = false; // Reset connection flag
      setError('Failed to connect to price feed');
      // Try fallback if WebSocket creation fails
      if (reconnectAttemptsRef.current >= 2) {
        console.log('WebSocket creation failed multiple times, using REST API fallback');
        startFallback();
      } else {
        // Retry after a delay
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, 5000);
      }
    }
  };

  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0; // Reset attempts when manually reconnecting
    connect();
  };

  useEffect(() => {
    console.log('🚀 useCoinbaseTicker useEffect starting for productId:', productId);
    
    // Reset state when product changes
    setPrice(null);
    setTickerData(null);
    setError(null);
    reconnectAttemptsRef.current = 0;
    
    // Start with reliable REST API for immediate data
    console.log('Starting with REST API for reliable data');
    startFallback();
    
    // Also try WebSocket as an enhancement for real-time updates
    const wsTimeout = setTimeout(() => {
      console.log('Attempting WebSocket enhancement...');
      connect();
    }, 1000); // Give REST API time to establish first

    return () => {
      console.log('🧹 Cleaning up useCoinbaseTicker for productId:', productId);
      
      // Clear timeout
      clearTimeout(wsTimeout);
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close WebSocket connection
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('🔴 Closing WebSocket due to cleanup');
        wsRef.current.close(1000, 'Product changed or unmounting');
        wsRef.current = null;
      }
      
      // Stop fallback polling
      stopFallback();
      
      // Reset flags
      isConnectingRef.current = false;
      fallbackStoppedRef.current = false;
    };
  }, [productId]);

  return {
    price,
    tickerData,
    isConnected,
    error,
    reconnect,
  };
}