/**
 * Integration tests for jscpd server
 * These tests demonstrate real-world usage scenarios
 */

import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import request from 'supertest';
import {JscpdServer} from '../../src/server';
import {writeFileSync, mkdirSync, rmSync} from 'fs-extra';
import {join} from 'path';
import {tmpdir} from 'os';

describe('Server Integration Tests', () => {
  let server: JscpdServer;
  let testDir: string;
  const port = 3001;

  beforeAll(async () => {
    testDir = join(tmpdir(), `jscpd-integration-${Date.now()}`);
    mkdirSync(testDir, {recursive: true});

    // Create a realistic project structure
    mkdirSync(join(testDir, 'src'), {recursive: true});
    mkdirSync(join(testDir, 'lib'), {recursive: true});

    // File with common utility functions
    writeFileSync(
      join(testDir, 'src', 'utils.js'),
      `
function validateEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return \`\${year}-\${month}-\${day}\`;
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
`
    );

    // File with similar email validation (duplication)
    writeFileSync(
      join(testDir, 'lib', 'validators.js'),
      `
function checkEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}

function isValidPhone(phone) {
  return /^\\d{10}$/.test(phone);
}
`
    );

    // File with date formatting (duplication)
    writeFileSync(
      join(testDir, 'lib', 'formatters.js'),
      `
function dateToString(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return \`\${year}-\${month}-\${day}\`;
}

function timeToString(time) {
  return time.toTimeString();
}
`
    );

    server = new JscpdServer(testDir, {
      minLines: 3,
      minTokens: 20,
    });

    await server.start(port);
  }, 30000);

  afterAll(async () => {
    await server.close();
    rmSync(testDir, {recursive: true, force: true});
  });

  describe('Real-world scenario: Code review', () => {
    it('should detect when a developer copies existing validation logic', async () => {
      const newCode = `
function verifyEmail(emailAddress) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(emailAddress);
}
`;

      const response = await request(server.getApp())
        .post('/check')
        .send({code: newCode, format: 'javascript'});

      expect(response.status).toBe(200);
      expect(response.body.statistics.duplicationsFound).toBeGreaterThan(0);
      expect(response.body.statistics.percentageDuplicated).toBeGreaterThan(50);
    });

    it('should not flag truly unique code', async () => {
      const newCode = `
function calculateFibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
`;

      const response = await request(server.getApp())
        .post('/check')
        .send({code: newCode, format: 'javascript'});

      expect(response.status).toBe(200);
      expect(response.body.statistics.duplicationsFound).toBe(0);
    });
  });

  describe('Real-world scenario: CI/CD pipeline', () => {
    it('should provide data for failing builds on high duplication', async () => {
      const duplicatedCode = `
function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return \`\${year}-\${month}-\${day}\`;
}
`;

      const response = await request(server.getApp())
        .post('/check')
        .send({code: duplicatedCode, format: 'javascript'});

      expect(response.status).toBe(200);

      const threshold = 80;
      if (response.body.statistics.percentageDuplicated > threshold) {
        expect(response.body.duplications.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple file checks in sequence', async () => {
      const files = [
        {name: 'file1.js', code: 'function test1() { return 1; }'},
        {name: 'file2.js', code: 'function test2() { return 2; }'},
        {name: 'file3.js', code: 'function test3() { return 3; }'},
      ];

      for (const file of files) {
        const response = await request(server.getApp())
          .post('/check')
          .send({code: file.code, filename: file.name});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('statistics');
      }
    });
  });

  describe('Real-world scenario: IDE integration', () => {
    it('should respond quickly for real-time checks', async () => {
      const code = 'function quickTest() { return true; }';
      const startTime = Date.now();

      const response = await request(server.getApp())
        .post('/check')
        .send({code, format: 'javascript'});

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle incomplete code snippets gracefully', async () => {
      const incompleteCode = 'function incomplete(';

      const response = await request(server.getApp())
        .post('/check')
        .send({code: incompleteCode, format: 'javascript'});

      expect(response.status).toBe(200);
    });
  });

  describe('Real-world scenario: API monitoring', () => {
    it('should provide consistent project statistics', async () => {
      const response1 = await request(server.getApp()).get('/stats');
      const response2 = await request(server.getApp()).get('/stats');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.total.sources).toBe(response2.body.total.sources);
      expect(response1.body.total.lines).toBe(response2.body.total.lines);
    });

    it('should maintain health status', async () => {
      const response = await request(server.getApp()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.codebaseIndexed).toBe(true);
    });
  });

  describe('Real-world scenario: Batch processing', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({length: 5}, (_, i) =>
        request(server.getApp())
          .post('/check')
          .send({
            code: `function test${i}() { return ${i}; }`,
            format: 'javascript'
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('statistics');
      });
    });
  });

  describe('Real-world scenario: Different languages', () => {
    it('should handle Python code', async () => {
      const pythonCode = `
def calculate_sum(a, b):
    result = a + b
    print(f"Result: {result}")
    return result
`;

      const response = await request(server.getApp())
        .post('/check')
        .send({code: pythonCode, format: 'python'});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('statistics');
    });

    it('should handle TypeScript code', async () => {
      const tsCode = `
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return {id, name: 'Test'};
}
`;

      const response = await request(server.getApp())
        .post('/check')
        .send({code: tsCode, format: 'typescript'});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('statistics');
    });
  });
});

