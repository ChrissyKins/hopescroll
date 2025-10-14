// Logger Tests
import { describe, it, expect } from 'vitest';
import { logger, createLogger } from '@/lib/logger';

describe('Logger', () => {
  describe('Base Logger', () => {
    it('should have a logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    it('should have logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have log level configured', () => {
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });
  });

  describe('createLogger', () => {
    it('should create a child logger', () => {
      const childLogger = createLogger('test-module');

      expect(childLogger).toBeDefined();
      expect(typeof childLogger).toBe('object');
    });

    it('should have logging methods on child logger', () => {
      const childLogger = createLogger('test-module');

      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
    });

    it('should create different instances for different modules', () => {
      const logger1 = createLogger('module-1');
      const logger2 = createLogger('module-2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      // Child loggers are different instances
      expect(logger1).not.toBe(logger2);
    });

    it('should include module name in bindings', () => {
      const childLogger = createLogger('test-module');

      // Pino child loggers have bindings() method
      const bindings = (childLogger as any).bindings();
      expect(bindings).toBeDefined();
      expect(bindings.module).toBe('test-module');
    });

    it('should support multiple child loggers', () => {
      const feedLogger = createLogger('feed-service');
      const filterLogger = createLogger('filter-service');
      const sourceLogger = createLogger('source-service');

      expect(feedLogger).toBeDefined();
      expect(filterLogger).toBeDefined();
      expect(sourceLogger).toBeDefined();

      const feedBindings = (feedLogger as any).bindings();
      const filterBindings = (filterLogger as any).bindings();
      const sourceBindings = (sourceLogger as any).bindings();

      expect(feedBindings.module).toBe('feed-service');
      expect(filterBindings.module).toBe('filter-service');
      expect(sourceBindings.module).toBe('source-service');
    });
  });

  describe('Logger Configuration', () => {
    it('should include environment in base bindings', () => {
      const bindings = (logger as any).bindings();
      expect(bindings).toBeDefined();
      expect(bindings.env).toBeDefined();
      expect(typeof bindings.env).toBe('string');
    });

    it('should support structured logging', () => {
      // Pino supports structured logging natively
      // Just verify the logger can accept object contexts
      const childLogger = createLogger('test');

      // This should not throw
      expect(() => {
        childLogger.info({ userId: 'test', action: 'test' }, 'Test message');
      }).not.toThrow();
    });
  });
});
