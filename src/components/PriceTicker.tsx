'use client';

import { useState, useEffect, useRef } from 'react';
import { useCoinbaseTicker } from '@/hooks/useCoinbaseTicker';
import { SUPPORTED_CRYPTOS } from './CryptoSelector';

interface PriceTickerProps {
  productId?: string;
  onPriceChange?: (price: number) => void;
}

export function PriceTicker({ productId = 'BTC-USD', onPriceChange }: PriceTickerProps) {
  const { price, tickerData, isConnected, error, reconnect } = useCoinbaseTicker(productId);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const lastReportedPrice = useRef<number | null>(null);

  useEffect(() => {
    if (price !== null && price !== lastReportedPrice.current) {
      // Update price direction
      if (previousPrice !== null) {
        if (price > previousPrice) {
          setPriceDirection('up');
        } else if (price < previousPrice) {
          setPriceDirection('down');
        } else {
          setPriceDirection('neutral');
        }
      }
      
      // Update previous price for next comparison
      setPreviousPrice(price);
      
      // Call the callback only when price actually changes
      onPriceChange?.(price);
      lastReportedPrice.current = price;
    }
  }, [price, previousPrice, onPriceChange]);

  const formatPrice = (price: number, forceDecimals?: boolean) => {
    // Get decimal places for current crypto
    const crypto = SUPPORTED_CRYPTOS.find(c => c.id === productId);
    const decimals = forceDecimals ? 2 : (crypto?.decimals ?? 2);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(price);
  };

  const formatChange = (current: number, open: number) => {
    const change = current - open;
    const changePercent = ((change / open) * 100);
    return {
      dollar: change >= 0 ? `+$${Math.abs(change).toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`,
      percent: change >= 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`,
      isPositive: change >= 0,
    };
  };

  const getPriceColorClass = () => {
    switch (priceDirection) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-charcoal rounded-lg border border-red-500/20">
        <div className="text-red-400 text-lg mb-4">{error}</div>
        <button
          onClick={reconnect}
          className="px-4 py-2 bg-burnt hover:bg-burnt/80 text-white rounded-lg transition-colors"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 bg-charcoal rounded-lg border border-burnt/20 glow-burnt">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div 
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        <span className="text-sm text-gray-400">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {/* Product ID */}
      <div className="text-burnt text-xl font-semibold mb-2">
        {productId}
      </div>

      {/* Main Price Display */}
      <div className={`price-display text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 transition-all duration-300 break-all ${getPriceColorClass()} ${
        priceDirection !== 'neutral' ? 'pulse-price' : ''
      }`}>
        {price !== null ? formatPrice(price) : '--'}
      </div>

      {/* 24h Stats */}
      {tickerData && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 text-center">
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm">24h High</span>
            <span className="text-white text-base sm:text-lg font-semibold">
              {formatPrice(parseFloat(tickerData.high_24h))}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm">24h Low</span>
            <span className="text-white text-base sm:text-lg font-semibold">
              {formatPrice(parseFloat(tickerData.low_24h))}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm">24h Volume</span>
            <span className="text-white text-base sm:text-lg font-semibold">
              {parseFloat(tickerData.volume_24h).toLocaleString()} {SUPPORTED_CRYPTOS.find(c => c.id === productId)?.symbol || 'BTC'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm">24h Change</span>
            {(() => {
              const open = parseFloat(tickerData.open_24h);
              const current = parseFloat(tickerData.price);
              const change = formatChange(current, open);
              return (
                <span className={`text-base sm:text-lg font-semibold ${
                  change.isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {change.dollar} ({change.percent})
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Last Update Time */}
      {tickerData && (
        <div className="mt-4 text-xs text-gray-500">
          Last updated: {new Date(tickerData.time).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}