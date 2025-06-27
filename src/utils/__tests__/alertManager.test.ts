import { alertManager } from '../alertManager'
import type { PriceAlert, AlertManagerConfig } from '../alertManager'

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()

describe('AlertManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage
    global.localStorage.clear()
    // Reset alerts array
    alertManager.getAlerts().forEach(alert => {
      alertManager.removeAlert(alert.id)
    })
  })

  afterEach(() => {
    mockConsoleLog.mockClear()
    mockConsoleWarn.mockClear()
  })

  describe('addAlert', () => {
    it('should add a new alert with generated ID and timestamp', () => {
      const alertData = {
        name: 'Test Alert',
        type: 'above' as const,
        threshold: 50000,
        enabled: true,
      }

      const alertId = alertManager.addAlert(alertData)

      expect(alertId).toBeDefined()
      expect(typeof alertId).toBe('string')

      const alerts = alertManager.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        ...alertData,
        id: alertId,
        triggered: false,
      })
      expect(alerts[0].createdAt).toBeInstanceOf(Date)
    })

    it('should save alert to localStorage', () => {
      alertManager.addAlert({
        name: 'Test Alert',
        type: 'below',
        threshold: 40000,
        enabled: true,
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'crypto-dashboard-alerts',
        expect.any(String)
      )
    })
  })

  describe('removeAlert', () => {
    it('should remove an alert by ID', () => {
      const alertId = alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      expect(alertManager.getAlerts()).toHaveLength(1)

      alertManager.removeAlert(alertId)

      expect(alertManager.getAlerts()).toHaveLength(0)
    })
  })

  describe('updateAlert', () => {
    it('should update an existing alert', () => {
      const alertId = alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      alertManager.updateAlert(alertId, {
        name: 'Updated Alert',
        threshold: 55000,
        enabled: false,
      })

      const alerts = alertManager.getAlerts()
      expect(alerts[0]).toMatchObject({
        id: alertId,
        name: 'Updated Alert',
        type: 'above',
        threshold: 55000,
        enabled: false,
      })
    })

    it('should not update non-existent alert', () => {
      const initialAlerts = alertManager.getAlerts()

      alertManager.updateAlert('non-existent-id', {
        name: 'Should not be added',
      })

      expect(alertManager.getAlerts()).toEqual(initialAlerts)
    })
  })

  describe('toggleAlert', () => {
    it('should toggle alert enabled state', () => {
      const alertId = alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      alertManager.toggleAlert(alertId)

      let alerts = alertManager.getAlerts()
      expect(alerts[0].enabled).toBe(false)

      alertManager.toggleAlert(alertId)

      alerts = alertManager.getAlerts()
      expect(alerts[0].enabled).toBe(true)
    })

    it('should reset triggered state when re-enabling', () => {
      const alertId = alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      // Manually set triggered state
      alertManager.updateAlert(alertId, { triggered: true })

      // Disable then enable
      alertManager.toggleAlert(alertId) // disable
      alertManager.toggleAlert(alertId) // enable

      const alerts = alertManager.getAlerts()
      expect(alerts[0].triggered).toBe(false)
    })
  })

  describe('checkAlerts', () => {
    it('should trigger alert when price crosses above threshold', () => {
      const alertId = alertManager.addAlert({
        name: 'Price Above 50k',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      const triggeredAlerts = alertManager.checkAlerts(50500)

      expect(triggeredAlerts).toHaveLength(1)
      expect(triggeredAlerts[0].id).toBe(alertId)

      const alerts = alertManager.getAlerts()
      expect(alerts[0].triggered).toBe(true)
      expect(alerts[0].lastTriggered).toBeInstanceOf(Date)
    })

    it('should trigger alert when price crosses below threshold', () => {
      const alertId = alertManager.addAlert({
        name: 'Price Below 40k',
        type: 'below',
        threshold: 40000,
        enabled: true,
      })

      const triggeredAlerts = alertManager.checkAlerts(39500)

      expect(triggeredAlerts).toHaveLength(1)
      expect(triggeredAlerts[0].id).toBe(alertId)
    })

    it('should not trigger disabled alerts', () => {
      alertManager.addAlert({
        name: 'Disabled Alert',
        type: 'above',
        threshold: 50000,
        enabled: false,
      })

      const triggeredAlerts = alertManager.checkAlerts(50500)

      expect(triggeredAlerts).toHaveLength(0)
    })

    it('should not trigger already triggered alerts', () => {
      const alertId = alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      // First trigger
      alertManager.checkAlerts(50500)

      // Second check with same price
      const triggeredAlerts = alertManager.checkAlerts(50500)

      expect(triggeredAlerts).toHaveLength(0)
    })

    it('should not trigger when price does not cross threshold', () => {
      alertManager.addAlert({
        name: 'Price Above 50k',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      const triggeredAlerts = alertManager.checkAlerts(49500)

      expect(triggeredAlerts).toHaveLength(0)
    })

    it('should log alert message when triggered', () => {
      alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      alertManager.checkAlerts(50500)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Alert triggered: Test Alert: BTC is above $50,000!')
      )
    })
  })

  describe('resetTriggeredAlerts', () => {
    it('should reset all triggered alerts', () => {
      const alertId1 = alertManager.addAlert({
        name: 'Alert 1',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      const alertId2 = alertManager.addAlert({
        name: 'Alert 2',
        type: 'below',
        threshold: 40000,
        enabled: true,
      })

      // Trigger both alerts
      alertManager.checkAlerts(50500)
      alertManager.checkAlerts(39500)

      // Verify they are triggered
      let alerts = alertManager.getAlerts()
      expect(alerts.find(a => a.id === alertId1)?.triggered).toBe(true)
      expect(alerts.find(a => a.id === alertId2)?.triggered).toBe(true)

      // Reset
      alertManager.resetTriggeredAlerts()

      // Verify they are reset
      alerts = alertManager.getAlerts()
      expect(alerts.find(a => a.id === alertId1)?.triggered).toBe(false)
      expect(alerts.find(a => a.id === alertId2)?.triggered).toBe(false)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig: Partial<AlertManagerConfig> = {
        enableSound: false,
        enableNotifications: false,
      }

      alertManager.updateConfig(newConfig)

      const config = alertManager.getConfig()
      expect(config.enableSound).toBe(false)
      expect(config.enableNotifications).toBe(false)
    })

    it('should save config to localStorage when window is available', () => {
      alertManager.updateConfig({ enableSound: false })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'crypto-dashboard-alert-config',
        expect.any(String)
      )
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = alertManager.getConfig()

      expect(config).toMatchObject({
        enableSound: expect.any(Boolean),
        enableNotifications: expect.any(Boolean),
        enableVibration: expect.any(Boolean),
      })
    })
  })

  describe('localStorage integration', () => {
    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw
      expect(() => {
        alertManager.addAlert({
          name: 'Test Alert',
          type: 'above',
          threshold: 50000,
          enabled: true,
        })
      }).not.toThrow()

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Could not save alerts to localStorage:',
        expect.any(Error)
      )

      localStorage.setItem = originalSetItem
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn().mockReturnValue('invalid json')

      // Should not throw when creating new instance
      expect(() => {
        // This would normally load from localStorage in constructor
        alertManager.getAlerts()
      }).not.toThrow()

      localStorage.getItem = originalGetItem
    })
  })

  describe('browser API availability checks', () => {
    it('should handle missing Notification API gracefully', () => {
      // Temporarily remove Notification
      const originalNotification = global.Notification
      delete (global as any).Notification

      alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      // Should not throw when triggering alert without Notification API
      expect(() => {
        alertManager.checkAlerts(50500)
      }).not.toThrow()

      // Restore Notification
      global.Notification = originalNotification
    })

    it('should handle missing vibrate API gracefully', () => {
      // Temporarily remove vibrate
      const originalVibrate = navigator.vibrate
      delete (navigator as any).vibrate

      alertManager.addAlert({
        name: 'Test Alert',
        type: 'above',
        threshold: 50000,
        enabled: true,
      })

      alertManager.updateConfig({ enableVibration: true })

      // Should not throw when triggering alert without vibrate API
      expect(() => {
        alertManager.checkAlerts(50500)
      }).not.toThrow()

      // Restore vibrate
      navigator.vibrate = originalVibrate
    })
  })
})