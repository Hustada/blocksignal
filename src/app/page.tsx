'use client';

import { useState, useEffect, useCallback } from 'react';
import { PriceTicker } from '@/components/PriceTicker';
import { AlertBar } from '@/components/AlertBar';
import { CryptoSelector, CryptoOption, SUPPORTED_CRYPTOS } from '@/components/CryptoSelector';
import { logger, wsLogger, perfLogger } from '@/utils/logger';

export default function Dashboard() {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('unknown');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC-USD');

  useEffect(() => {
    logger.info('Dashboard mounted', 'Dashboard');
    
    // Load saved crypto preference
    const savedCrypto = localStorage.getItem('selectedCrypto');
    if (savedCrypto && SUPPORTED_CRYPTOS.some(c => c.id === savedCrypto)) {
      setSelectedCrypto(savedCrypto);
    }
    
    // Set notification permission state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Request notification permission on mount if default
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          logger.info(`Notification permission: ${permission}`, 'Dashboard');
          setNotificationPermission(permission);
        });
      }
    }

    return () => {
      logger.info('Dashboard unmounted', 'Dashboard');
    };
  }, []);

  const handlePriceChange = useCallback((price: number) => {
    const measurePerf = perfLogger.start('price-update');
    
    setCurrentPrice(price);
    setLastUpdate(new Date());
    
    logger.debug(`Price updated: $${price.toLocaleString()}`, 'Dashboard', { price });
    
    measurePerf();
  }, []);

  const handleCryptoChange = useCallback((crypto: CryptoOption) => {
    logger.info(`Switching to ${crypto.symbol}`, 'Dashboard');
    setSelectedCrypto(crypto.id);
    setCurrentPrice(null); // Reset price when switching
    localStorage.setItem('selectedCrypto', crypto.id);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              Block<span className="text-burnt">Signal</span>
            </h1>
            <CryptoSelector 
              selectedCrypto={selectedCrypto}
              onCryptoChange={handleCryptoChange}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-lg">
            Real-time cryptocurrency price monitoring with custom alerts
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Price Ticker - Takes up more space on larger screens */}
          <div className="xl:col-span-2">
            <PriceTicker 
              productId={selectedCrypto}
              onPriceChange={handlePriceChange} 
            />
          </div>
          
          {/* Alert Bar */}
          <div className="xl:col-span-1">
            <AlertBar 
              currentPrice={currentPrice} 
              selectedCrypto={selectedCrypto}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-16 text-center">
        <div className="border-t border-gray-800 pt-8">
          <p className="text-gray-500 text-sm">
            Built for continuous monitoring • Data from Coinbase Exchange
          </p>
        </div>
      </div>

      {/* Debug Panel - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4">
          <details className="bg-gray-900 border border-gray-700 rounded p-2 text-xs">
            <summary className="cursor-pointer text-gray-400">Debug Info</summary>
            <div className="mt-2 space-y-1 text-gray-300">
              <div>Price: {currentPrice ? `$${currentPrice.toLocaleString()}` : 'Loading...'}</div>
              <div>Last Update: {lastUpdate?.toLocaleTimeString() || 'None'}</div>
              <div>Notifications: {notificationPermission}</div>
              <button
                onClick={() => logger.exportLogs()}
                className="mt-2 px-2 py-1 bg-burnt text-white rounded text-xs hover:bg-burnt/80"
              >
                Export Logs
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}