# JSCPD Server Quick Start Guide

This guide will help you get started with the jscpd server mode in just a few minutes.

## What is jscpd Server?

jscpd server mode allows you to run jscpd as a web service, providing a RESTful API to check code snippets for duplications against a scanned codebase. This is useful for:

- Integrating with IDEs and editors
- Adding duplication checks to CI/CD pipelines
- Building custom tools on top of jscpd
- Checking code snippets on-the-fly without rescanning the entire codebase

## Installation

If you haven't already installed jscpd:

```bash
npm install -g jscpd
```

Or use it directly with npx:

```bash
npx jscpd server
```

## Starting the Server

### Basic Usage

Start the server in your current directory:

```bash
jscpd server
```

The server will:
1. Scan all files in the current directory
2. Start a web server on `http://0.0.0.0:3000`
3. Be ready to accept API requests

### Custom Directory

Start the server for a specific project:

```bash
jscpd server /path/to/my-project
```

### Custom Port

If port 3000 is already in use:

```bash
jscpd server --port 8080
```

### Custom Host

Bind to a specific host:

```bash
jscpd server --host localhost --port 3000
```

### With jscpd Options

You can use any jscpd option with the server:

```bash
# Only scan JavaScript and TypeScript files
jscpd server . --format javascript,typescript

# Use custom thresholds
jscpd server . --min-lines 10 --min-tokens 100

# Ignore certain files
jscpd server . --ignore "**/*.spec.js,**/*.test.js"

# Use gitignore
jscpd server . --gitignore
```

## Making Your First Request

### Check Server Health

```bash
curl http://localhost:3000/api/health
```

### Check a Code Snippet

Create a file `request.json`:

```json
{
  "code": "function calculateSum(a, b) {\n  return a + b;\n}",
  "language": "javascript"
}
```

Send the request:

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d @request.json
```

### Get Project Statistics

```bash
curl http://localhost:3000/api/stats | jq
```

## Understanding the Response

When you check a code snippet, you'll get a response like:

```json
{
  "duplications": [
    {
      "snippetLocation": {
        "startLine": 1,
        "endLine": 3,
        "startColumn": 0,
        "endColumn": 1
      },
      "codebaseLocation": {
        "file": "src/utils.js",
        "startLine": 45,
        "endLine": 47,
        "startColumn": 0,
        "endColumn": 1,
        "fragment": "function calculateSum(a, b) {\n  return a + b;\n}"
      },
      "linesCount": 2
    }
  ],
  "statistics": {
    "totalDuplications": 1,
    "duplicatedLines": 2,
    "totalLines": 3,
    "percentageDuplicated": 66.67
  }
}
```

**Key Points:**
- `duplications` - Array of found duplications
- `snippetLocation` - Where in your snippet the duplication was found
- `codebaseLocation` - Where in the codebase the duplicate exists
- `statistics` - Summary of duplications in your snippet (not the whole project)

## Common Use Cases

### 1. Check Before Committing

```bash
#!/bin/bash
# check-file.sh

FILE=$1
CODE=$(cat "$FILE")

RESPONSE=$(curl -s -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d "{\"code\": $(echo "$CODE" | jq -Rs .), \"filename\": \"$FILE\"}")

DUPLICATIONS=$(echo "$RESPONSE" | jq '.duplications | length')

if [ "$DUPLICATIONS" -gt 0 ]; then
  echo "⚠️  Found $DUPLICATIONS duplication(s) in $FILE"
  echo "$RESPONSE" | jq '.duplications'
  exit 1
else
  echo "✓ No duplications found in $FILE"
  exit 0
fi
```

### 2. VSCode Extension Integration

```javascript
// Check current file
async function checkCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  const code = editor.document.getText();
  const language = editor.document.languageId;

  const response = await fetch('http://localhost:3000/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language })
  });

  const result = await response.json();
  
  if (result.duplications.length > 0) {
    vscode.window.showWarningMessage(
      `Found ${result.duplications.length} duplication(s)`
    );
  }
}
```

### 3. CI/CD Integration

```yaml
# .github/workflows/check-duplications.yml
name: Check Duplications

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install jscpd
        run: npm install -g jscpd
      
      - name: Start jscpd server
        run: |
          jscpd server . --port 3000 &
          sleep 10
      
      - name: Check changed files
        run: |
          for file in $(git diff --name-only origin/main); do
            if [[ -f "$file" ]]; then
              echo "Checking $file..."
              RESPONSE=$(curl -s -X POST http://localhost:3000/api/check \
                -H "Content-Type: application/json" \
                -d "{\"code\": $(cat $file | jq -Rs .), \"filename\": \"$file\"}")
              
              DUPS=$(echo "$RESPONSE" | jq '.duplications | length')
              if [ "$DUPS" -gt 0 ]; then
                echo "⚠️  Found duplications in $file"
                exit 1
              fi
            fi
          done
```

## Tips and Best Practices

### 1. Always Provide Language or Filename

For best results, always specify either the `language` or `filename`:

```json
{
  "code": "...",
  "language": "javascript"
}
```

or

```json
{
  "code": "...",
  "filename": "script.js"
}
```

### 2. Monitor Server Status

Before checking files, verify the server is ready:

```bash
STATUS=$(curl -s http://localhost:3000/api/health | jq -r .status)
if [ "$STATUS" != "ready" ]; then
  echo "Server is not ready yet..."
  exit 1
fi
```

### 3. Handle Large Codebases

For large codebases, the initial scan may take time. Consider:

- Starting the server before your build process
- Using the `/api/health` endpoint to wait for readiness
- Increasing memory limits if needed

### 4. Tune Detection Thresholds

Adjust `--min-lines` and `--min-tokens` based on your needs:

```bash
# More strict (fewer false positives)
jscpd server . --min-lines 10 --min-tokens 100

# More lenient (catch smaller duplications)
jscpd server . --min-lines 3 --min-tokens 30
```

## Troubleshooting

### Port Already in Use

```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Use a different port:
```bash
jscpd server --port 8080
```

### Server Takes Too Long to Start

**Cause:** Large codebase requires more time to scan.

**Solution:** 
- Be patient during initial scan
- Use `--ignore` to exclude unnecessary files
- Consider using `--format` to limit file types

### "Unable to determine format for snippet"

**Cause:** Server couldn't detect the programming language.

**Solution:** Always provide `language` or `filename`:
```json
{
  "code": "...",
  "language": "javascript"
}
```

### Server Returns 503

**Cause:** Server is still initializing (scanning codebase).

**Solution:** Wait for initialization to complete. Check `/api/health`.

## Next Steps

- Read the [full API documentation](SERVER_API.md)
- Check the [examples](../../examples/api/example-server.ts)
- Explore [integration patterns](SERVER_API.md#integration-with-cicd)

## Getting Help

- GitHub Issues: https://github.com/kucherenko/jscpd/issues
- Documentation: https://github.com/kucherenko/jscpd

## Summary

You now know how to:
- ✓ Start the jscpd server
- ✓ Check code snippets via API
- ✓ Get project statistics
- ✓ Integrate with your workflow

Happy coding! 🚀

