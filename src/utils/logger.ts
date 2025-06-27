export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  source?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private logLevel: LogLevel = LogLevel.INFO;
  private enableConsole: boolean = true;
  private enableStorage: boolean = true;

  constructor() {
    this.loadConfig();
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.saveConfig();
  }

  setMaxLogs(max: number): void {
    this.maxLogs = max;
    this.trimLogs();
    this.saveConfig();
  }

  enableConsoleLogging(enable: boolean): void {
    this.enableConsole = enable;
    this.saveConfig();
  }

  enableStorageLogging(enable: boolean): void {
    this.enableStorage = enable;
    this.saveConfig();
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      source: this.getCallStack(),
    };

    if (this.enableStorage) {
      this.logs.push(entry);
      this.trimLogs();
      this.saveToStorage();
    }

    if (this.enableConsole) {
      this.logToConsole(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const message = `${timestamp} ${levelStr}${contextStr}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
    }
  }

  private getCallStack(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip the first 4 lines (Error, getCallStack, log, and the calling log method)
        const callerLine = lines[4];
        if (callerLine) {
          const match = callerLine.match(/at\s+(.+)/);
          return match ? match[1] : 'unknown';
        }
      }
    } catch (error) {
      // Ignore errors in stack trace parsing
    }
    return 'unknown';
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  getLogsSince(since: Date): LogEntry[] {
    return this.logs.filter(log => log.timestamp >= since);
  }

  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const byLevel: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    this.logs.forEach(log => {
      byLevel[LogLevel[log.level]]++;
    });

    return {
      totalLogs: this.logs.length,
      byLevel,
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined,
    };
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('crypto-dashboard-logs', JSON.stringify(this.logs.slice(-100))); // Save only last 100 logs
      }
    } catch (error) {
      console.warn('Could not save logs to localStorage:', error);
    }
  }

  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        const config = {
          logLevel: this.logLevel,
          maxLogs: this.maxLogs,
          enableConsole: this.enableConsole,
          enableStorage: this.enableStorage,
        };
        localStorage.setItem('crypto-dashboard-logger-config', JSON.stringify(config));
      }
    } catch (error) {
      console.warn('Could not save logger config:', error);
    }
  }

  private loadConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        const configStr = localStorage.getItem('crypto-dashboard-logger-config');
        if (configStr) {
          const config = JSON.parse(configStr);
          this.logLevel = config.logLevel ?? LogLevel.INFO;
          this.maxLogs = config.maxLogs ?? 1000;
          this.enableConsole = config.enableConsole ?? true;
          this.enableStorage = config.enableStorage ?? true;
        }

        const logsStr = localStorage.getItem('crypto-dashboard-logs');
        if (logsStr) {
          const logs = JSON.parse(logsStr);
          this.logs = logs.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
        }
      }
    } catch (error) {
      console.warn('Could not load logger config or logs:', error);
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// WebSocket specific logging helpers
export const wsLogger = {
  connect: (url: string) => logger.info(`Connecting to WebSocket`, 'WebSocket', { url }),
  connected: (url: string) => logger.info(`WebSocket connected`, 'WebSocket', { url }),
  disconnect: (code: number, reason: string) => logger.info(`WebSocket disconnected`, 'WebSocket', { code, reason }),
  error: (error: any) => logger.error(`WebSocket error`, 'WebSocket', error),
  message: (type: string, data: any) => logger.debug(`WebSocket message received`, 'WebSocket', { type, data }),
  send: (message: any) => logger.debug(`WebSocket message sent`, 'WebSocket', message),
  reconnect: (attempt: number) => logger.warn(`WebSocket reconnection attempt ${attempt}`, 'WebSocket'),
};

// Price alert specific logging
export const alertLogger = {
  created: (alert: any) => logger.info(`Alert created`, 'AlertManager', alert),
  triggered: (alert: any, price: number) => logger.warn(`Alert triggered`, 'AlertManager', { alert, price }),
  removed: (alertId: string) => logger.info(`Alert removed`, 'AlertManager', { alertId }),
  toggled: (alertId: string, enabled: boolean) => logger.info(`Alert toggled`, 'AlertManager', { alertId, enabled }),
};

// Performance logging
export const perfLogger = {
  start: (operation: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      logger.debug(`Performance: ${operation} took ${duration.toFixed(2)}ms`, 'Performance');
    };
  },
  measure: (operation: string, fn: () => void) => {
    const end = perfLogger.start(operation);
    fn();
    end();
  },
};