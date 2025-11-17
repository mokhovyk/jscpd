import { JscpdServer } from '../../apps/jscpd/src/server';
import { join } from 'path';

/**
 * Example 1: Start server programmatically
 */
async function startServerExample() {
  const workingDirectory = join(__dirname, '..', 'fixtures', 'javascript');

  const server = new JscpdServer(workingDirectory, {
    port: 3000,
    host: 'localhost',
    jscpdOptions: {
      minLines: 5,
      minTokens: 50,
      format: ['javascript', 'typescript'],
    },
  });

  try {
    await server.start();
    console.log('Server started successfully!');

    // Server will keep running until stopped
    // To stop: await server.stop();
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

/**
 * Example 2: Use server service directly
 */
async function useServiceExample() {
  const { JscpdServerService } = await import('../../apps/jscpd/src/server');
  const workingDirectory = join(__dirname, '..', 'fixtures', 'javascript');

  const service = new JscpdServerService(workingDirectory);

  await service.initialize({
    minLines: 5,
    minTokens: 50,
  });

  console.log('Service initialized!');

  // Check a code snippet
  const result = await service.checkSnippet({
    code: `
function test() {
  const a = 1;
  const b = 2;
  const c = 3;
  return a + b + c;
}
    `,
    language: 'javascript',
  });

  console.log('Duplications found:', result.duplications.length);
  console.log('Statistics:', result.statistics);

  // Get project statistics
  const stats = service.getStatistics();
  console.log('Project statistics:', stats);

  await service.close();
}

/**
 * Example 3: Make HTTP requests to running server
 */
async function clientExample() {
  // First start the server with: jscpd server /path/to/project

  const serverUrl = 'http://localhost:3000';

  // Check health
  const healthResponse = await fetch(`${serverUrl}/api/health`);
  const health = await healthResponse.json();
  console.log('Server health:', health);

  // Check code snippet
  const checkResponse = await fetch(`${serverUrl}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'function hello() { return "Hello, World!"; }',
      language: 'javascript',
    }),
  });
  const checkResult = await checkResponse.json();
  console.log('Check result:', checkResult);

  // Get statistics
  const statsResponse = await fetch(`${serverUrl}/api/stats`);
  const stats = await statsResponse.json();
  console.log('Project stats:', stats);
}

// Run examples
if (require.main === module) {
  // Uncomment the example you want to run:

  // startServerExample();
  // useServiceExample();
  // clientExample();

  console.log('Examples available:');
  console.log('1. startServerExample() - Start server programmatically');
  console.log('2. useServiceExample() - Use service directly');
  console.log('3. clientExample() - Make HTTP requests to running server');
}

export { startServerExample, useServiceExample, clientExample };

