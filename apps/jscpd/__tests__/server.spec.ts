import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import request from 'supertest';
import {JscpdServer} from '../src/server';
import {Express} from 'express';
import {writeFileSync, mkdirSync, rmSync} from 'fs-extra';
import {join} from 'path';
import {tmpdir} from 'os';

describe('JscpdServer', () => {
  let server: JscpdServer;
  let app: Express;
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `jscpd-test-${Date.now()}`);
    mkdirSync(testDir, {recursive: true});

    writeFileSync(
      join(testDir, 'file1.js'),
      `function duplicateCode() {
  console.log('This is duplicated');
  console.log('Line 2');
  console.log('Line 3');
  console.log('Line 4');
  console.log('Line 5');
  console.log('Line 6');
  return true;
}

function uniqueCode1() {
  console.log('This is unique in file1');
}
`
    );

    writeFileSync(
      join(testDir, 'file2.js'),
      `function anotherFunction() {
  console.log('This is duplicated');
  console.log('Line 2');
  console.log('Line 3');
  console.log('Line 4');
  console.log('Line 5');
  console.log('Line 6');
  return true;
}

function uniqueCode2() {
  console.log('This is unique in file2');
}
`
    );

    writeFileSync(
      join(testDir, 'file3.js'),
      `function noDuplicates() {
  console.log('Completely unique code here');
  const x = 42;
  const y = x * 2;
  return y;
}
`
    );

    server = new JscpdServer(testDir, {
      minLines: 5,
      minTokens: 25,
    });

    app = server.getApp();

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  });

  afterAll(async () => {
    await server.close();
    rmSync(testDir, {recursive: true, force: true});
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('codebaseIndexed');
    });
  });

  describe('GET /stats', () => {
    it('should return project statistics', async () => {
      const response = await request(app).get('/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toHaveProperty('sources');
      expect(response.body.total).toHaveProperty('lines');
      expect(response.body.total).toHaveProperty('tokens');
      expect(response.body.total).toHaveProperty('clones');
      expect(response.body.total).toHaveProperty('duplicatedLines');
      expect(response.body.total).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('formats');
    });

    it('should have indexed the test files', async () => {
      const response = await request(app).get('/stats');

      expect(response.status).toBe(200);
      expect(response.body.total.sources).toBeGreaterThan(0);
    });
  });

  describe('POST /check', () => {
    it('should return 400 when code is missing', async () => {
      const response = await request(app)
        .post('/check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: code');
    });

    it('should detect duplications in submitted code', async () => {
      const snippetWithDuplication = `function testFunction() {
  console.log('This is duplicated');
  console.log('Line 2');
  console.log('Line 3');
  console.log('Line 4');
  console.log('Line 5');
  console.log('Line 6');
  return true;
}`;

      const response = await request(app)
        .post('/check')
        .send({
          code: snippetWithDuplication,
          format: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('duplications');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('snippetLines');
      expect(response.body.statistics).toHaveProperty('snippetTokens');
      expect(response.body.statistics).toHaveProperty('duplicatedLines');
      expect(response.body.statistics).toHaveProperty('duplicationsFound');
      expect(response.body.statistics).toHaveProperty('percentageDuplicated');
      expect(response.body.statistics.snippetLines).toBeGreaterThan(0);
    });

    it('should return no duplications for unique code', async () => {
      const uniqueSnippet = `function veryUniqueFunction() {
  const specialVariable = 'unique_value_12345';
  const anotherSpecial = specialVariable.toUpperCase();
  const yetAnother = anotherSpecial + '_suffix';
  return yetAnother;
}`;

      const response = await request(app)
        .post('/check')
        .send({
          code: uniqueSnippet,
          format: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.statistics.duplicationsFound).toBe(0);
      expect(response.body.statistics.duplicatedLines).toBe(0);
      expect(response.body.statistics.percentageDuplicated).toBe(0);
    });

    it('should work with filename to detect format', async () => {
      const snippet = `function test() { return 42; }`;

      const response = await request(app)
        .post('/check')
        .send({
          code: snippet,
          filename: 'test.js',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('duplications');
      expect(response.body).toHaveProperty('statistics');
    });

    it('should handle empty code snippet', async () => {
      const response = await request(app)
        .post('/check')
        .send({
          code: '',
        });

      expect(response.status).toBe(400);
    });

    it('should return snippet-specific statistics not project-wide', async () => {
      const snippet = `function anotherFunction() {
  console.log('This is duplicated');
  console.log('Line 2');
  console.log('Line 3');
  console.log('Line 4');
  console.log('Line 5');
  console.log('Line 6');
  return true;
}`;

      const checkResponse = await request(app)
        .post('/check')
        .send({
          code: snippet,
          format: 'javascript',
        });

      const statsResponse = await request(app).get('/stats');

      expect(checkResponse.status).toBe(200);
      expect(statsResponse.status).toBe(200);

      expect(checkResponse.body.statistics.snippetLines).not.toBe(statsResponse.body.total.lines);
    });

    it('should handle large code snippets', async () => {
      let largeSnippet = '';
      for (let i = 0; i < 100; i++) {
        largeSnippet += `function func${i}() { return ${i}; }\n`;
      }

      const response = await request(app)
        .post('/check')
        .send({
          code: largeSnippet,
          format: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.statistics.snippetLines).toBeGreaterThan(50);
    });

    it('should calculate percentage correctly', async () => {
      const snippet = `function duplicateCode() {
  console.log('This is duplicated');
  console.log('Line 2');
  console.log('Line 3');
  console.log('Line 4');
  console.log('Line 5');
  console.log('Line 6');
  return true;
}

function extraUnique1() {
  const a = 1;
  const b = 2;
}

function extraUnique2() {
  const c = 3;
  const d = 4;
}`;

      const response = await request(app)
        .post('/check')
        .send({
          code: snippet,
          format: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.statistics.percentageDuplicated).toBeGreaterThanOrEqual(0);
      expect(response.body.statistics.percentageDuplicated).toBeLessThanOrEqual(100);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/check')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle requests with invalid format', async () => {
      const response = await request(app)
        .post('/check')
        .send({
          code: 'function test() {}',
          format: 'nonexistent-format-xyz',
        });

      expect(response.status).toBe(200);
    });
  });
});

