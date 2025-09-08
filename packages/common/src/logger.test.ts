import { Logger } from './logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
  });

  it('should be a singleton', () => {
    const logger2 = Logger.getInstance();
    expect(logger).toBe(logger2);
  });

  it('should set log level', () => {
    logger.setLevel('error');
    expect(logger).toBeDefined();
  });

  it('should have log methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});