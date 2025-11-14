# jscpd Server Mode

## Overview

jscpd can now run as a web server, providing a RESTful API for checking code snippets against an indexed codebase. This is useful for:

- Integrating duplication detection into CI/CD pipelines
- Building custom code review tools
- Real-time duplication checking in IDEs or editors
- API-based code quality checks

## Quick Start

### Installation

```bash
npm install -g jscpd
# or
pnpm add -g jscpd
```

### Starting the Server

```bash
# Start in current directory on default port 3000
jscpd server .

# Start in specific directory
jscpd server /path/to/your/project

# Start on custom port
jscpd server . --port 8080
```

### Basic Usage

Once the server is running, you can make HTTP requests:

```bash
# Check if server is running
curl http://localhost:3000/health

# Get project statistics
curl http://localhost:3000/stats

# Check a code snippet
curl -X POST http://localhost:3000/check \
  -H "Content-Type: application/json" \
  -d '{"code":"function test() { return true; }","format":"javascript"}'
```

## API Endpoints

### 1. Health Check

```http
GET /health
```

Returns server status and whether the codebase has been indexed.

**Response:**
```json
{
  "status": "ok",
  "codebaseIndexed": true
}
```

### 2. Project Statistics

```http
GET /stats
```

Returns overall duplication statistics for the entire indexed codebase.

**Response:**
```json
{
  "total": {
    "lines": 1500,
    "tokens": 8500,
    "sources": 15,
    "duplicatedLines": 120,
    "clones": 5,
    "percentage": 8.0
  },
  "formats": { ... },
  "detectionDate": "2024-01-15T10:30:00.000Z"
}
```

### 3. Check Code Snippet

```http
POST /check
```

Checks a code snippet for duplications against the indexed codebase.

**Request Body:**
```json
{
  "code": "function example() { return true; }",
  "format": "javascript",
  "filename": "example.js"
}
```

**Response:**
```json
{
  "duplications": [ ... ],
  "statistics": {
    "snippetLines": 10,
    "snippetTokens": 55,
    "duplicatedLines": 8,
    "duplicationsFound": 2,
    "percentageDuplicated": 80.0
  }
}
```

## Key Features

### ✅ Snippet-Specific Analysis

The `/check` endpoint analyzes **only the submitted code** and reports:
- How many lines/tokens in your snippet are duplicated
- Where duplications exist (both in snippet and codebase)
- Percentage of the snippet that is duplicated

This is different from project-wide statistics returned by `/stats`.

### ✅ Fast Performance

- Codebase is indexed once at startup
- Subsequent checks are fast (no need to re-scan files)
- Suitable for real-time checks

### ✅ Format Detection

Automatically detects code format from:
1. Explicit `format` parameter
2. `filename` extension
3. Falls back to JavaScript if not specified

### ✅ Comprehensive Error Handling

- Validates all inputs
- Returns meaningful error messages
- Appropriate HTTP status codes

## Configuration

You can use standard jscpd options when starting the server:

```bash
# Adjust detection thresholds
jscpd server . --min-lines 10 --min-tokens 50

# Ignore patterns
jscpd server . --ignore "**/node_modules/**,**/dist/**"

# Use specific formats
jscpd server . --format javascript,typescript,python

# For large codebases
jscpd server . --store leveldb
```

## Use Cases

### CI/CD Integration

```bash
# Start server in CI
jscpd server . --port 3000 &

# Check pull request changes
curl -X POST http://localhost:3000/check \
  -d @changes.json

# Fail build if duplications exceed threshold
```

### IDE Plugin

Create a plugin that sends code as you type to the server for real-time duplication warnings.

### Code Review Tool

Build a web interface that shows duplication statistics for code under review.

### Git Hook

```bash
#!/bin/bash
# Pre-commit hook
git diff --cached --name-only | while read file; do
  curl -X POST http://localhost:3000/check \
    -d "{\"code\":\"$(cat $file)\",\"filename\":\"$file\"}"
done
```

## Testing

Run the test suite:

```bash
cd apps/jscpd
pnpm test
```

Tests cover:
- All endpoint functionality
- Error handling
- Edge cases
- Large snippets
- Various formats

## Complete API Documentation

See [SERVER_API.md](./SERVER_API.md) for complete API documentation including:
- Detailed request/response schemas
- All response fields explained
- Integration examples (Node.js, Python, cURL)
- Error handling
- Performance notes

## Troubleshooting

### Server won't start

- Check if port is already in use
- Verify the path exists and is readable
- Check file permissions

### No duplications detected

- Verify `minLines` and `minTokens` thresholds
- Check if the format is correctly detected
- Ensure the codebase was properly indexed

### Slow performance

- Use `--store leveldb` for large codebases
- Consider indexing fewer files with `--ignore` patterns
- Check available memory

## Examples

See the [examples](../../examples/) directory for:
- Node.js client example
- Python integration
- GitHub Action usage
- More use cases

## License

MIT - See [LICENSE](../../LICENSE)

