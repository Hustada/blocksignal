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
  enableTitleFlashing?: boolean;
  enableFaviconAlerts?: boolean;
  persistentNotifications?: boolean;
}

class AlertManager {
  private alerts: PriceAlert[] = [];
  private config: AlertManagerConfig = {
    enableSound: true,
    enableNotifications: true,
    enableVibration: false,
    enableTitleFlashing: true,
    enableFaviconAlerts: true,
    persistentNotifications: true,
  };
  private notificationPermission: NotificationPermission = 'default';
  private audioContext?: AudioContext;
  private isTabVisible: boolean = true;
  private originalTitle: string = '';
  private titleFlashInterval?: NodeJS.Timeout;
  private currentFavicon: string = '/favicon.ico';

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadAlertsFromStorage();
      this.requestNotificationPermission();
      this.setupPageVisibilityDetection();
      this.originalTitle = document.title;
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  private setupPageVisibilityDetection(): void {
    if (typeof document === 'undefined') return;

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      this.isTabVisible = !document.hidden;
      
      if (this.isTabVisible) {
        // Tab became visible - stop title flashing and restore original title
        this.stopTitleFlashing();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle window focus/blur for additional coverage
    window.addEventListener('focus', () => {
      this.isTabVisible = true;
      this.stopTitleFlashing();
    });
    
    window.addEventListener('blur', () => {
      this.isTabVisible = false;
    });
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
      if (this.config.enableFaviconAlerts) {
        this.updateFavicon(); // Update favicon when alerts are triggered
      }
    }

    return triggeredAlerts;
  }

  private triggerAlert(alert: PriceAlert, currentPrice: number): void {
    const message = `${alert.name}: BTC is ${alert.type} $${alert.threshold.toLocaleString()}! Current price: $${currentPrice.toLocaleString()}`;
    const shortMessage = `${alert.name}: BTC ${alert.type} $${alert.threshold.toLocaleString()}`;
    
    // Start title flashing for background tabs
    if (!this.isTabVisible && this.config.enableTitleFlashing) {
      this.startTitleFlashing(shortMessage);
    }
    
    // Enhanced desktop notification
    if (typeof window !== 'undefined' && this.config.enableNotifications && this.notificationPermission === 'granted') {
      const notification = new Notification('🚨 BlockSignal Alert', {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id,
        requireInteraction: this.config.persistentNotifications && !this.isTabVisible, // Persistent when tab is hidden
      });
      
      // Click notification to focus tab
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Sound notification (enhanced for background)
    if (this.config.enableSound) {
      this.playAlertSound();
    }

    // Vibration (mobile devices)
    if (typeof window !== 'undefined' && this.config.enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Console log for debugging
    console.log(`🚨 Alert triggered: ${message} | Tab visible: ${this.isTabVisible}`);
  }

  private playAlertSound(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Create a simple beep sound using Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended (helps with background tabs)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different frequency for background alerts to make them more noticeable
      const frequency = this.isTabVisible ? 800 : 1000;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      // Slightly louder for background alerts
      const volume = this.isTabVisible ? 0.1 : 0.15;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.7);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.7);
      
      // Play a second beep for background alerts to make them more noticeable
      if (!this.isTabVisible) {
        setTimeout(() => {
          try {
            const secondOscillator = this.audioContext!.createOscillator();
            const secondGainNode = this.audioContext!.createGain();
            
            secondOscillator.connect(secondGainNode);
            secondGainNode.connect(this.audioContext!.destination);
            
            secondOscillator.frequency.setValueAtTime(1200, this.audioContext!.currentTime);
            secondOscillator.type = 'sine';
            
            secondGainNode.gain.setValueAtTime(0.15, this.audioContext!.currentTime);
            secondGainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5);
            
            secondOscillator.start(this.audioContext!.currentTime);
            secondOscillator.stop(this.audioContext!.currentTime + 0.5);
          } catch (error) {
            console.warn('Could not play second alert sound:', error);
          }
        }, 800);
      }
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  resetTriggeredAlerts(): void {
    this.alerts.forEach(alert => {
      alert.triggered = false;
    });
    this.saveAlertsToStorage();
    if (this.config.enableTitleFlashing) {
      this.stopTitleFlashing(); // Stop flashing when alerts are reset
    }
    if (this.config.enableFaviconAlerts) {
      this.updateFavicon(); // Reset favicon when alerts are reset
    }
  }

  private startTitleFlashing(alertMessage: string): void {
    if (typeof document === 'undefined') return;
    
    // Don't flash if tab is visible
    if (this.isTabVisible) return;
    
    // Stop any existing flashing
    this.stopTitleFlashing();
    
    let isFlashing = false;
    this.titleFlashInterval = setInterval(() => {
      if (this.isTabVisible) {
        this.stopTitleFlashing();
        return;
      }
      
      document.title = isFlashing ? this.originalTitle : `🚨 ${alertMessage}`;
      isFlashing = !isFlashing;
    }, 1000); // Flash every second
  }

  private stopTitleFlashing(): void {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = undefined;
    }
    
    if (typeof document !== 'undefined') {
      document.title = this.originalTitle;
    }
  }

  private updateFavicon(): void {
    if (typeof document === 'undefined') return;
    
    const triggeredAlerts = this.alerts.filter(alert => alert.triggered && alert.enabled);
    let newFavicon = '/favicon.ico';
    
    if (triggeredAlerts.length > 0) {
      newFavicon = triggeredAlerts.length >= 3 
        ? '/favicon-multiple-alerts.svg'
        : '/favicon-alert.svg';
    }
    
    if (newFavicon !== this.currentFavicon) {
      this.setFavicon(newFavicon);
      this.currentFavicon = newFavicon;
    }
  }

  private setFavicon(faviconUrl: string): void {
    if (typeof document === 'undefined') return;
    
    // Find existing favicon link
    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    if (!faviconLink) {
      // Create favicon link if it doesn't exist
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    
    faviconLink.href = faviconUrl;
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

  getBackgroundAlertStatus(): {
    isTabVisible: boolean;
    triggeredAlertsCount: number;
    hasActiveFlashing: boolean;
  } {
    return {
      isTabVisible: this.isTabVisible,
      triggeredAlertsCount: this.alerts.filter(alert => alert.triggered && alert.enabled).length,
      hasActiveFlashing: !!this.titleFlashInterval,
    };
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