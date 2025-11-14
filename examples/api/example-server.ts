/**
 * Example: Using jscpd Server API
 * 
 * This example demonstrates how to:
 * 1. Start jscpd as a server
 * 2. Check code snippets for duplications
 * 3. Get project statistics
 */

import { JscpdServer } from 'jscpd/src/server';
import axios from 'axios';

async function main() {
  // Example 1: Start the server programmatically
  console.log('Starting jscpd server...');
  const server = new JscpdServer(process.cwd(), {
    minLines: 5,
    minTokens: 30,
  });

  await server.start(3000);
  console.log('Server started on port 3000\n');

  // Give the server a moment to fully initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Example 2: Health Check
    console.log('1. Checking server health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('Health status:', healthResponse.data);
    console.log();

    // Example 3: Get Project Statistics
    console.log('2. Getting project statistics...');
    const statsResponse = await axios.get('http://localhost:3000/stats');
    console.log('Project Statistics:');
    console.log(`  Total files: ${statsResponse.data.total.sources}`);
    console.log(`  Total lines: ${statsResponse.data.total.lines}`);
    console.log(`  Duplicated lines: ${statsResponse.data.total.duplicatedLines}`);
    console.log(`  Duplication percentage: ${statsResponse.data.total.percentage}%`);
    console.log();

    // Example 4: Check a code snippet with duplications
    console.log('3. Checking code snippet for duplications...');
    const codeWithDuplication = `
function calculateSum(a, b) {
  const result = a + b;
  console.log('Calculating sum');
  console.log('Input a:', a);
  console.log('Input b:', b);
  console.log('Result:', result);
  return result;
}
    `.trim();

    const checkResponse = await axios.post('http://localhost:3000/check', {
      code: codeWithDuplication,
      format: 'javascript',
    });

    console.log('Snippet Analysis:');
    console.log(`  Lines in snippet: ${checkResponse.data.statistics.snippetLines}`);
    console.log(`  Duplicated lines: ${checkResponse.data.statistics.duplicatedLines}`);
    console.log(`  Duplication percentage: ${checkResponse.data.statistics.percentageDuplicated}%`);
    console.log(`  Duplications found: ${checkResponse.data.statistics.duplicationsFound}`);

    if (checkResponse.data.duplications.length > 0) {
      console.log('\n  Duplications details:');
      checkResponse.data.duplications.forEach((dup: any, index: number) => {
        console.log(`    ${index + 1}. Found in: ${dup.duplicationB.sourceId}`);
        console.log(`       Lines: ${dup.duplicationB.start.line}-${dup.duplicationB.end.line}`);
      });
    }
    console.log();

    // Example 5: Check unique code (no duplications)
    console.log('4. Checking unique code snippet...');
    const uniqueCode = `
function verySpecificUniqueFunction_${Date.now()}() {
  const uniqueVariable = 'unique_value_12345';
  const anotherUnique = uniqueVariable.toUpperCase();
  return anotherUnique + '_suffix';
}
    `.trim();

    const uniqueResponse = await axios.post('http://localhost:3000/check', {
      code: uniqueCode,
      format: 'javascript',
    });

    console.log('Unique Code Analysis:');
    console.log(`  Lines in snippet: ${uniqueResponse.data.statistics.snippetLines}`);
    console.log(`  Duplications found: ${uniqueResponse.data.statistics.duplicationsFound}`);
    console.log();

    // Example 6: Check with filename for format detection
    console.log('5. Checking with filename (auto-format detection)...');
    const pythonCode = `
def example_function():
    print("Hello, World!")
    return True
    `.trim();

    const pythonResponse = await axios.post('http://localhost:3000/check', {
      code: pythonCode,
      filename: 'example.py',
    });

    console.log('Python Code Analysis:');
    console.log(`  Format detected: python`);
    console.log(`  Lines in snippet: ${pythonResponse.data.statistics.snippetLines}`);
    console.log(`  Duplications found: ${pythonResponse.data.statistics.duplicationsFound}`);
    console.log();

    // Example 7: Error handling - missing code
    console.log('6. Testing error handling (missing code)...');
    try {
      await axios.post('http://localhost:3000/check', {
        format: 'javascript',
      });
    } catch (error: any) {
      if (error.response) {
        console.log('  Expected error:', error.response.data.error);
      }
    }
    console.log();

    console.log('All examples completed successfully!');

  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    // Clean up
    console.log('\nShutting down server...');
    await server.close();
    process.exit(0);
  }
}

// Run the examples
main().catch(console.error);

