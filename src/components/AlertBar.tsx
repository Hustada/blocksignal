'use client';

import { useState, useEffect } from 'react';
import { useAlertManager, PriceAlert } from '@/utils/alertManager';
import { alertLogger } from '@/utils/logger';

interface AlertBarProps {
  currentPrice: number | null;
}

export function AlertBar({ currentPrice }: AlertBarProps) {
  const alertManager = useAlertManager();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertType, setNewAlertType] = useState<'above' | 'below'>('above');
  const [newAlertThreshold, setNewAlertThreshold] = useState('');

  useEffect(() => {
    setAlerts(alertManager.getAlerts());
  }, []);

  useEffect(() => {
    if (currentPrice !== null) {
      const triggeredAlerts = alertManager.checkAlerts(currentPrice);
      if (triggeredAlerts.length > 0) {
        setAlerts(alertManager.getAlerts());
      }
    }
  }, [currentPrice]);

  const handleAddAlert = () => {
    if (!newAlertName.trim() || !newAlertThreshold) return;

    const threshold = parseFloat(newAlertThreshold);
    if (isNaN(threshold) || threshold <= 0) return;

    const alertId = alertManager.addAlert({
      name: newAlertName.trim(),
      type: newAlertType,
      threshold,
      enabled: true,
    });

    alertLogger.created({
      id: alertId,
      name: newAlertName.trim(),
      type: newAlertType,
      threshold,
    });

    setAlerts(alertManager.getAlerts());
    setNewAlertName('');
    setNewAlertThreshold('');
    setShowForm(false);
  };

  const handleRemoveAlert = (id: string) => {
    alertManager.removeAlert(id);
    alertLogger.removed(id);
    setAlerts(alertManager.getAlerts());
  };

  const handleToggleAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alertManager.toggleAlert(id);
      alertLogger.toggled(id, !alert.enabled);
      setAlerts(alertManager.getAlerts());
    }
  };

  const handleResetTriggered = () => {
    alertManager.resetTriggeredAlerts();
    setAlerts(alertManager.getAlerts());
  };

  const formatThreshold = (threshold: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(threshold);
  };

  const getAlertStatusColor = (alert: PriceAlert) => {
    if (!alert.enabled) return 'text-gray-500';
    if (alert.triggered) return 'text-red-400';
    return 'text-green-400';
  };

  const getAlertStatusText = (alert: PriceAlert) => {
    if (!alert.enabled) return 'Disabled';
    if (alert.triggered) return 'Triggered';
    return 'Active';
  };

  return (
    <div className="bg-charcoal rounded-lg border border-burnt/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Price Alerts</h2>
        <div className="flex gap-2">
          {alerts.some(a => a.triggered) && (
            <button
              onClick={handleResetTriggered}
              className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              Reset Triggered
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-burnt hover:bg-burnt/80 text-white rounded transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Alert'}
          </button>
        </div>
      </div>

      {/* Add Alert Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Alert Name</label>
              <input
                type="text"
                value={newAlertName}
                onChange={(e) => setNewAlertName(e.target.value)}
                placeholder="e.g., Moon Alert"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-burnt focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Type</label>
              <select
                value={newAlertType}
                onChange={(e) => setNewAlertType(e.target.value as 'above' | 'below')}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-burnt focus:outline-none"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Threshold ($)</label>
              <input
                type="number"
                value={newAlertThreshold}
                onChange={(e) => setNewAlertThreshold(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-burnt focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddAlert}
                disabled={!newAlertName.trim() || !newAlertThreshold}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No alerts configured. Click "Add Alert" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded border ${
                alert.triggered 
                  ? 'bg-red-900/20 border-red-500/30' 
                  : alert.enabled 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  alert.triggered ? 'bg-red-400' : alert.enabled ? 'bg-green-400' : 'bg-gray-500'
                }`} />
                <div>
                  <div className="text-white font-medium">{alert.name}</div>
                  <div className="text-sm text-gray-400">
                    When BTC goes {alert.type} {formatThreshold(alert.threshold)}
                  </div>
                  {alert.lastTriggered && (
                    <div className="text-xs text-gray-500">
                      Last triggered: {alert.lastTriggered.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${getAlertStatusColor(alert)}`}>
                  {getAlertStatusText(alert)}
                </span>
                <button
                  onClick={() => handleToggleAlert(alert.id)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    alert.enabled 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {alert.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleRemoveAlert(alert.id)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Price Indicator */}
      {currentPrice !== null && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-center text-sm text-gray-400">
            Current BTC Price: <span className="text-white font-semibold">{formatThreshold(currentPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
}