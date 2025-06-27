'use client';

import { useState, useRef, useEffect } from 'react';

export interface CryptoOption {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const SUPPORTED_CRYPTOS: CryptoOption[] = [
  { id: 'BTC-USD', symbol: 'BTC', name: 'Bitcoin', decimals: 0 },
  { id: 'ETH-USD', symbol: 'ETH', name: 'Ethereum', decimals: 2 },
  { id: 'SOL-USD', symbol: 'SOL', name: 'Solana', decimals: 2 },
  { id: 'MATIC-USD', symbol: 'MATIC', name: 'Polygon', decimals: 4 },
  { id: 'AVAX-USD', symbol: 'AVAX', name: 'Avalanche', decimals: 2 },
  { id: 'LINK-USD', symbol: 'LINK', name: 'Chainlink', decimals: 2 },
  { id: 'ADA-USD', symbol: 'ADA', name: 'Cardano', decimals: 4 },
  { id: 'DOGE-USD', symbol: 'DOGE', name: 'Dogecoin', decimals: 4 },
  { id: 'SHIB-USD', symbol: 'SHIB', name: 'Shiba Inu', decimals: 8 },
];

interface CryptoSelectorProps {
  selectedCrypto: string;
  onCryptoChange: (crypto: CryptoOption) => void;
}

export function CryptoSelector({ selectedCrypto, onCryptoChange }: CryptoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentCrypto = SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto) || SUPPORTED_CRYPTOS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (crypto: CryptoOption) => {
    onCryptoChange(crypto);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors"
      >
        <span className="font-semibold">{currentCrypto.symbol}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {SUPPORTED_CRYPTOS.map((crypto) => (
              <button
                key={crypto.id}
                onClick={() => handleSelect(crypto)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  crypto.id === selectedCrypto ? 'bg-gray-700 text-burnt' : 'text-white'
                }`}
              >
                <div>
                  <div className="font-medium">{crypto.symbol}</div>
                  <div className="text-xs text-gray-400">{crypto.name}</div>
                </div>
                {crypto.id === selectedCrypto && (
                  <svg className="w-4 h-4 text-burnt" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}