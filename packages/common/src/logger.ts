export class Logger {
  private static instance: Logger;
  private level: 'debug' | 'info' | 'warn' | 'error' = 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.level = level;
  }

  debug(message: string, ...args: any[]) {
    if (this.level === 'debug') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (['debug', 'info'].includes(this.level)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

export const logger = Logger.getInstance();