export interface PriceAlert {
  id: string;
  name: string;
  type: 'above' | 'below';
  threshold: number;
  enabled: boolean;
  triggered: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface AlertManagerConfig {
  enableSound?: boolean;
  enableNotifications?: boolean;
  soundUrl?: string;
  enableVibration?: boolean;
}

class AlertManager {
  private alerts: PriceAlert[] = [];
  private config: AlertManagerConfig = {
    enableSound: true,
    enableNotifications: true,
    enableVibration: false,
  };
  private notificationPermission: NotificationPermission = 'default';
  private audioContext?: AudioContext;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadAlertsFromStorage();
      this.requestNotificationPermission();
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>): string {
    const newAlert: PriceAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      triggered: false,
    };
    
    this.alerts.push(newAlert);
    this.saveAlertsToStorage();
    return newAlert.id;
  }

  removeAlert(id: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== id);
    this.saveAlertsToStorage();
  }

  updateAlert(id: string, updates: Partial<PriceAlert>): void {
    const alertIndex = this.alerts.findIndex(alert => alert.id === id);
    if (alertIndex !== -1) {
      this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...updates };
      this.saveAlertsToStorage();
    }
  }

  getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  toggleAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.enabled = !alert.enabled;
      if (alert.enabled) {
        alert.triggered = false; // Reset triggered state when re-enabling
      }
      this.saveAlertsToStorage();
    }
  }

  checkAlerts(currentPrice: number): PriceAlert[] {
    const triggeredAlerts: PriceAlert[] = [];

    for (const alert of this.alerts) {
      if (!alert.enabled || alert.triggered) continue;

      const shouldTrigger = 
        (alert.type === 'above' && currentPrice >= alert.threshold) ||
        (alert.type === 'below' && currentPrice <= alert.threshold);

      if (shouldTrigger) {
        alert.triggered = true;
        alert.lastTriggered = new Date();
        triggeredAlerts.push(alert);
        
        this.triggerAlert(alert, currentPrice);
      }
    }

    if (triggeredAlerts.length > 0) {
      this.saveAlertsToStorage();
    }

    return triggeredAlerts;
  }

  private triggerAlert(alert: PriceAlert, currentPrice: number): void {
    const message = `${alert.name}: BTC is ${alert.type} $${alert.threshold.toLocaleString()}! Current price: $${currentPrice.toLocaleString()}`;
    
    // Desktop notification
    if (typeof window !== 'undefined' && this.config.enableNotifications && this.notificationPermission === 'granted') {
      new Notification('Crypto Alert Triggered', {
        body: message,
        icon: '/crypto-icon.png',
        badge: '/crypto-badge.png',
        tag: alert.id,
        requireInteraction: true,
      });
    }

    // Sound notification
    if (this.config.enableSound) {
      this.playAlertSound();
    }

    // Vibration (mobile devices)
    if (typeof window !== 'undefined' && this.config.enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Console log for debugging
    console.log(`🚨 Alert triggered: ${message}`);
  }

  private playAlertSound(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Create a simple beep sound using Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  resetTriggeredAlerts(): void {
    this.alerts.forEach(alert => {
      alert.triggered = false;
    });
    this.saveAlertsToStorage();
  }

  updateConfig(newConfig: Partial<AlertManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-dashboard-alert-config', JSON.stringify(this.config));
    }
  }

  getConfig(): AlertManagerConfig {
    return { ...this.config };
  }

  private saveAlertsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('crypto-dashboard-alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.warn('Could not save alerts to localStorage:', error);
    }
  }

  private loadAlertsFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('crypto-dashboard-alerts');
      if (stored) {
        const alerts = JSON.parse(stored);
        this.alerts = alerts.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          lastTriggered: alert.lastTriggered ? new Date(alert.lastTriggered) : undefined,
        }));
      }

      const storedConfig = localStorage.getItem('crypto-dashboard-alert-config');
      if (storedConfig) {
        this.config = { ...this.config, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.warn('Could not load alerts from localStorage:', error);
    }
  }
}

// Create a singleton instance
export const alertManager = new AlertManager();

// Hook for React components
export function useAlertManager() {
  return alertManager;
}