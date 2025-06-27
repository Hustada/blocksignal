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
  const [newAlertAutoReset, setNewAlertAutoReset] = useState(false);
  const [newAlertResetThreshold, setNewAlertResetThreshold] = useState('');

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

    let resetThreshold: number | undefined;
    if (newAlertAutoReset && newAlertResetThreshold) {
      resetThreshold = parseFloat(newAlertResetThreshold);
      if (isNaN(resetThreshold) || resetThreshold < 0) {
        resetThreshold = undefined; // Use default if invalid
      }
    }

    const alertId = alertManager.addAlert({
      name: newAlertName.trim(),
      type: newAlertType,
      threshold,
      enabled: true,
      autoReset: newAlertAutoReset,
      resetThreshold,
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
    setNewAlertAutoReset(false);
    setNewAlertResetThreshold('');
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

  const handleSnoozeAlert = (id: string) => {
    alertManager.snoozeAlert(id, 5); // Snooze for 5 minutes
    setAlerts(alertManager.getAlerts());
  };

  const handleUnsnoozeAlert = (id: string) => {
    alertManager.unsnoozeAlert(id);
    setAlerts(alertManager.getAlerts());
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
              <button
                onClick={handleAddAlert}
                disabled={!newAlertName.trim() || !newAlertThreshold}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-base font-medium"
              >
                Add Alert
              </button>
            </div>
          </div>
          
          {/* Auto-reset options */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAlertAutoReset}
                  onChange={(e) => setNewAlertAutoReset(e.target.checked)}
                  className="w-4 h-4 text-burnt bg-gray-900 border-gray-600 rounded focus:ring-burnt focus:ring-2"
                />
                <span className="text-sm text-gray-300">🔄 Auto-reset alert (can trigger multiple times)</span>
              </label>
            </div>
            
            {newAlertAutoReset && (
              <div className="ml-6">
                <label className="block text-xs text-gray-400 mb-1">
                  Reset Distance ($) - Optional (default: 1% of threshold)
                </label>
                <input
                  type="number"
                  value={newAlertResetThreshold}
                  onChange={(e) => setNewAlertResetThreshold(e.target.value)}
                  placeholder="Auto (1% of threshold)"
                  className="w-48 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white focus:border-burnt focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How far price must move away to reset the alert
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No alerts configured. Click "Add Alert" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded border ${
                alert.triggered 
                  ? 'bg-red-900/20 border-red-500/30' 
                  : alert.enabled 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-900 border-gray-800'
              }`}
            >
              {/* Mobile-first: Stack content vertically, horizontal on larger screens */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Alert Content Area */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    alert.triggered ? 'bg-red-400' : alert.enabled ? 'bg-green-400' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-base">{alert.name}</span>
                      {alert.autoReset && <span className="text-xs text-blue-400">🔄</span>}
                      {!alert.autoReset && <span className="text-xs text-gray-500">🔒</span>}
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      When BTC goes {alert.type} {formatThreshold(alert.threshold)}
                      {alert.autoReset && (
                        <span className="text-blue-400 ml-1">(auto-reset)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {alert.triggerCount > 0 && (
                        <span>
                          Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {alert.lastTriggered && (
                        <span className="hidden sm:inline">
                          Last: {alert.lastTriggered.toLocaleString()}
                        </span>
                      )}
                      {alert.snoozedUntil && new Date() < alert.snoozedUntil && (
                        <span className="text-yellow-400">
                          😴 Snoozed until {alert.snoozedUntil.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons Area */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Status Badge */}
                  <div className="flex justify-center sm:justify-start">
                    <span className={`text-sm font-medium px-2 py-1 rounded text-center ${getAlertStatusColor(alert)}`}>
                      {getAlertStatusText(alert)}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-row gap-2 justify-center sm:justify-end">
                    {alert.enabled && (
                      <>
                        {alert.snoozedUntil && new Date() < alert.snoozedUntil ? (
                          <button
                            onClick={() => handleUnsnoozeAlert(alert.id)}
                            className="px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors min-h-[36px] flex-1 sm:flex-none"
                            title="Cancel snooze and reactivate alert"
                          >
                            🔔 Unsnooze
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSnoozeAlert(alert.id)}
                            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors min-h-[36px] flex-1 sm:flex-none"
                            title="Snooze for 5 minutes"
                          >
                            😴 5min
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className={`px-3 py-2 text-sm rounded transition-colors min-h-[36px] flex-1 sm:flex-none ${
                        alert.enabled 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {alert.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleRemoveAlert(alert.id)}
                      className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors min-h-[36px] flex-1 sm:flex-none"
                    >
                      Remove
                    </button>
                  </div>
                </div>
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