import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JscpdServerService } from '../src/server/service';
import { join } from 'path';

describe('JscpdServerService', () => {
  let service: JscpdServerService;
  const testDirectory = join(__dirname, '../../..', 'fixtures', 'javascript');

  beforeEach(async () => {
    service = new JscpdServerService(testDirectory);
    await service.initialize({
      minLines: 5,
      minTokens: 50,
    });
  });

  afterEach(async () => {
    await service.close();
  });

  describe('initialize', () => {
    it('should initialize and scan the codebase', async () => {
      const newService = new JscpdServerService(testDirectory);
      await newService.initialize();

      const state = newService.getState();
      expect(state.isScanning).toBe(false);
      expect(state.lastScanTime).not.toBeNull();
      expect(state.workingDirectory).toBe(testDirectory);

      await newService.close();
    });

    it('should throw error if scan already in progress', async () => {
      const newService = new JscpdServerService(testDirectory);
      const promise1 = newService.initialize();
      
      await expect(async () => {
        await newService.initialize();
      }).rejects.toThrow('Scan already in progress');

      await promise1;
      await newService.close();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics after initialization', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('statistics');
      expect(stats).toHaveProperty('timestamp');
      expect(stats.statistics).not.toBeNull();
      expect(stats.statistics?.total).toHaveProperty('sources');
      expect(stats.statistics?.total).toHaveProperty('lines');
    });
  });

  describe('checkSnippet', () => {
    it('should check a code snippet against the codebase', async () => {
      const result = await service.checkSnippet({
        code: `
function test() {
  const a = 1;
  const b = 2;
  const c = 3;
  const d = 4;
  const e = 5;
  const f = 6;
  return a + b + c;
}
        `.trim(),
        language: 'javascript',
      });

      expect(result).toHaveProperty('duplications');
      expect(result).toHaveProperty('statistics');
      expect(Array.isArray(result.duplications)).toBe(true);
      expect(result.statistics).toHaveProperty('totalDuplications');
      expect(result.statistics).toHaveProperty('duplicatedLines');
      expect(result.statistics).toHaveProperty('totalLines');
      expect(result.statistics).toHaveProperty('percentageDuplicated');
    });

    it('should throw error for empty code', async () => {
      await expect(async () => {
        await service.checkSnippet({
          code: '',
        });
      }).rejects.toThrow('Code snippet cannot be empty');
    });

    it('should throw error for whitespace-only code', async () => {
      await expect(async () => {
        await service.checkSnippet({
          code: '   \n  \t  ',
        });
      }).rejects.toThrow('Code snippet cannot be empty');
    });

    it('should handle code with no duplications', async () => {
      const result = await service.checkSnippet({
        code: `
function veryUniqueFunction_${Date.now()}() {
  const uniqueVar1 = "unique_value_${Date.now()}_1";
  const uniqueVar2 = "unique_value_${Date.now()}_2";
  const uniqueVar3 = "unique_value_${Date.now()}_3";
  const uniqueVar4 = "unique_value_${Date.now()}_4";
  const uniqueVar5 = "unique_value_${Date.now()}_5";
  const uniqueVar6 = "unique_value_${Date.now()}_6";
  return uniqueVar1 + uniqueVar2;
}
        `.trim(),
        language: 'javascript',
      });

      expect(result.duplications).toHaveLength(0);
      expect(result.statistics.totalDuplications).toBe(0);
      expect(result.statistics.percentageDuplicated).toBe(0);
    });

    it('should include duplication locations', async () => {
      const result = await service.checkSnippet({
        code: `
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
const f = 6;
const g = 7;
        `.trim(),
        language: 'javascript',
      });

      if (result.duplications.length > 0) {
        const duplication = result.duplications[0];
        expect(duplication).toHaveProperty('snippetLocation');
        expect(duplication).toHaveProperty('codebaseLocation');
        expect(duplication).toHaveProperty('linesCount');
        expect(duplication.snippetLocation).toHaveProperty('startLine');
        expect(duplication.snippetLocation).toHaveProperty('endLine');
        expect(duplication.codebaseLocation).toHaveProperty('file');
        expect(duplication.codebaseLocation).toHaveProperty('startLine');
        expect(duplication.codebaseLocation).toHaveProperty('endLine');
      }
    });

    it('should calculate percentage correctly', async () => {
      const result = await service.checkSnippet({
        code: `
const line1 = 1;
const line2 = 2;
const line3 = 3;
const line4 = 4;
const line5 = 5;
const line6 = 6;
const line7 = 7;
const line8 = 8;
const line9 = 9;
const line10 = 10;
        `.trim(),
        language: 'javascript',
      });

      expect(result.statistics.percentageDuplicated).toBeGreaterThanOrEqual(0);
      expect(result.statistics.percentageDuplicated).toBeLessThanOrEqual(100);
      expect(result.statistics.totalLines).toBeGreaterThan(0);
      expect(result.statistics.duplicatedLines).toBeLessThanOrEqual(result.statistics.totalLines);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = service.getState();
      
      expect(state).toHaveProperty('workingDirectory');
      expect(state).toHaveProperty('statistics');
      expect(state).toHaveProperty('isScanning');
      expect(state).toHaveProperty('lastScanTime');
      expect(state.workingDirectory).toBe(testDirectory);
      expect(state.isScanning).toBe(false);
    });
  });
});

