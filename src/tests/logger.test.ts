import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

describe('Winston Logger Tests', () => {
  const logDir = path.join(process.cwd(), 'logs');
  const combinedLogPath = path.join(logDir, 'combined.log');
  const errorLogPath = path.join(logDir, 'error.log');

  // Helper to wait for logs to flush
  const waitForLogs = () => new Promise((resolve) => setTimeout(resolve, 200));

  beforeAll(async () => {
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  });

  describe('Log File Creation', () => {
    it('should create logs directory', () => {
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should create combined.log file', async () => {
      logger.info('Test combined log');
      await waitForLogs();
      expect(fs.existsSync(combinedLogPath)).toBe(true);
    });

    it('should create error.log file', async () => {
      logger.error('Test error log');
      await waitForLogs();
      expect(fs.existsSync(errorLogPath)).toBe(true);
    });
  });

  describe('Log Levels', () => {
    it('should log INFO messages', async () => {
      const testMessage = `Test INFO ${Date.now()}`;
      logger.info(testMessage, { test: true });

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      expect(logs).toContain(testMessage);
      expect(logs).toContain('"level":"info"');
    });

    it('should log ERROR messages', async () => {
      const testMessage = `Test ERROR ${Date.now()}`;
      logger.error(testMessage, {
        error: 'Test error',
        stack: 'Test stack trace',
      });

      await waitForLogs();

      const errorLogs = fs.readFileSync(errorLogPath, 'utf-8');
      expect(errorLogs).toContain(testMessage);
      expect(errorLogs).toContain('"level":"error"');
    });

    it('should log WARNING messages', async () => {
      const testMessage = `Test WARNING ${Date.now()}`;
      logger.warn(testMessage, { threshold: 100 });

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      expect(logs).toContain(testMessage);
      expect(logs).toContain('"level":"warn"');
    });

    it('should log DEBUG messages in test environment', async () => {
      const testMessage = `Test DEBUG ${Date.now()}`;
      logger.debug(testMessage, { detail: 'debug info' });

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      // Debug logs should appear in test environment
      expect(logs).toContain(testMessage);
    });
  });

  describe('Log Metadata', () => {
    it('should include metadata in logs', async () => {
      const testMessage = `Test with metadata ${Date.now()}`;
      logger.info(testMessage, {
        userId: 'user-123',
        action: 'test',
        timestamp: new Date().toISOString(),
      });

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      expect(logs).toContain('"userId":"user-123"');
      expect(logs).toContain('"action":"test"');
    });

    it('should include service name in logs', async () => {
      const testMessage = `Test service metadata ${Date.now()}`;
      logger.info(testMessage);

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      expect(logs).toContain('"service":"car-rental-api"');
    });

    it('should include environment in logs', async () => {
      const testMessage = `Test environment ${Date.now()}`;
      logger.info(testMessage);

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      expect(logs).toContain('"environment"');
    });
  });

  describe('Log Format', () => {
    it('should write JSON format to files', async () => {
      const testMessage = `Test JSON format ${Date.now()}`;
      logger.info(testMessage);

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      const lines = logs.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      // Should be valid JSON
      expect(() => JSON.parse(lastLine)).not.toThrow();

      const logEntry = JSON.parse(lastLine);
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level');
      expect(logEntry).toHaveProperty('message');
      expect(logEntry).toHaveProperty('service');
    });

    it('should include timestamp in correct format', async () => {
      const testMessage = `Test timestamp ${Date.now()}`;
      logger.info(testMessage);

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      const lines = logs.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const logEntry = JSON.parse(lastLine);

      // Timestamp should match format: YYYY-MM-DD HH:mm:ss
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle error objects correctly', async () => {
      const testError = new Error('Test error object');
      logger.error('Error occurred', {
        error: testError.message,
        stack: testError.stack,
      });

      await waitForLogs();

      const errorLogs = fs.readFileSync(errorLogPath, 'utf-8');
      expect(errorLogs).toContain('Test error object');
      expect(errorLogs).toContain('"stack"');
    });

    it('should log errors only to error.log', async () => {
      const errorLogSizeBefore = fs.existsSync(errorLogPath) ? fs.statSync(errorLogPath).size : 0;

      const testMessage = `Test error separation ${Date.now()}`;
      logger.error(testMessage, { code: 'TEST_ERROR' });

      await waitForLogs();

      const errorLogSizeAfter = fs.statSync(errorLogPath).size;
      expect(errorLogSizeAfter).toBeGreaterThan(errorLogSizeBefore);

      const errorLogs = fs.readFileSync(errorLogPath, 'utf-8');
      expect(errorLogs).toContain(testMessage);
    });
  });

  describe('Production Readiness', () => {
    it('should have log files with reasonable size', () => {
      if (fs.existsSync(combinedLogPath)) {
        const stats = fs.statSync(combinedLogPath);
        // Should have written some logs
        expect(stats.size).toBeGreaterThan(0);
        // Should not be too large (< 5MB configured max)
        expect(stats.size).toBeLessThan(5242880);
      }
    });

    it('should create valid JSON for all log entries', async () => {
      const testMessage = `Test all entries valid ${Date.now()}`;
      logger.info(testMessage);

      await waitForLogs();

      const logs = fs.readFileSync(combinedLogPath, 'utf-8');
      const lines = logs
        .trim()
        .split('\n')
        .filter((line) => line);

      // All lines should be valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });
});
