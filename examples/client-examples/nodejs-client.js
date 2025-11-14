/**
 * Node.js client example for jscpd server
 *
 * Prerequisites:
 * - jscpd server running on localhost:3000
 * - axios installed: npm install axios
 */

const axios = require('axios');

const JSCPD_SERVER_URL = 'http://localhost:3000';

/**
 * Check a code snippet for duplications
 */
async function checkCode(code, format = 'javascript', filename = null) {
  try {
    const response = await axios.post(`${JSCPD_SERVER_URL}/check`, {
      code,
      format,
      filename,
    });

    return response.data;
  } catch (error) {
    console.error('Error checking code:', error.message);
    throw error;
  }
}

/**
 * Get project statistics
 */
async function getProjectStats() {
  try {
    const response = await axios.get(`${JSCPD_SERVER_URL}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error getting stats:', error.message);
    throw error;
  }
}

/**
 * Check server health
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${JSCPD_SERVER_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error.message);
    throw error;
  }
}

/**
 * Check multiple files
 */
async function checkFiles(files) {
  const results = [];

  for (const file of files) {
    console.log(`Checking ${file.path}...`);
    const result = await checkCode(file.content, file.format, file.path);
    results.push({
      path: file.path,
      ...result,
    });
  }

  return results;
}

/**
 * Report duplications above threshold
 */
function reportDuplications(checkResult, threshold = 50) {
  const { statistics } = checkResult;

  console.log('\n=== Duplication Report ===');
  console.log(`Snippet lines: ${statistics.snippetLines}`);
  console.log(`Duplicated lines: ${statistics.duplicatedLines}`);
  console.log(`Duplication percentage: ${statistics.percentageDuplicated}%`);
  console.log(`Duplications found: ${statistics.duplicationsFound}`);

  if (statistics.percentageDuplicated > threshold) {
    console.log(`\n⚠️  WARNING: Duplication exceeds threshold (${threshold}%)`);

    if (checkResult.duplications.length > 0) {
      console.log('\nDuplication details:');
      checkResult.duplications.forEach((dup, index) => {
        console.log(`\n${index + 1}. Duplication found:`);
        console.log(`   Format: ${dup.format}`);
        console.log(`   In snippet: lines ${dup.duplicationA.start.line}-${dup.duplicationA.end.line}`);
        console.log(`   In codebase: ${dup.duplicationB.sourceId}`);
        console.log(`   Lines: ${dup.duplicationB.start.line}-${dup.duplicationB.end.line}`);
      });
    }

    return false;
  } else {
    console.log('\n✅ Duplication is within acceptable range');
    return true;
  }
}

// Example usage
async function main() {
  try {
    // 1. Check server health
    console.log('Checking server health...');
    const health = await checkHealth();
    console.log('Server status:', health);

    // 2. Get project statistics
    console.log('\nGetting project statistics...');
    const stats = await getProjectStats();
    console.log('Project stats:', {
      totalFiles: stats.total.sources,
      totalLines: stats.total.lines,
      duplicatedLines: stats.total.duplicatedLines,
      percentage: stats.total.percentage,
    });

    // 3. Check a single snippet
    console.log('\nChecking code snippet...');
    const codeSnippet = `
function calculateTotal(items) {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price * items[i].quantity;
  }
  return sum;
}
    `.trim();

    const result = await checkCode(codeSnippet, 'javascript');
    reportDuplications(result, 50);

    // 4. Check multiple files
    console.log('\nChecking multiple files...');
    const files = [
      {
        path: 'utils/helpers.js',
        content: 'function helper() { return true; }',
        format: 'javascript',
      },
      {
        path: 'services/api.ts',
        content: 'const fetchData = async () => { return await fetch("/api"); }',
        format: 'typescript',
      },
    ];

    const fileResults = await checkFiles(files);
    fileResults.forEach(result => {
      console.log(`\nFile: ${result.path}`);
      console.log(`  Duplications: ${result.statistics.duplicationsFound}`);
      console.log(`  Percentage: ${result.statistics.percentageDuplicated}%`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  checkCode,
  getProjectStats,
  checkHealth,
  checkFiles,
  reportDuplications,
};

