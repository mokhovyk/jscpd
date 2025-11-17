# JSCPD Server API Documentation

## Overview

The JSCPD Server provides a RESTful API for detecting code duplications. It scans a codebase on startup and allows clients to check code snippets for duplications against the scanned codebase.

## Starting the Server

### Command Line

```bash
# Start server in current directory
jscpd server

# Start server in specific directory
jscpd server /path/to/project

# Start server on specific port
jscpd server . --port 8080

# Start server with custom host
jscpd server . --host localhost --port 3000
```

### Options

- `--port [number]` - Port to run the server on (Default: 3000)
- `--host [string]` - Host to bind the server to (Default: 0.0.0.0)

All standard jscpd options are also supported (e.g., `--min-lines`, `--format`, `--ignore`, etc.)

## Base URL

When running locally: `http://localhost:3000/api`

## Authentication

Currently, no authentication is required. Future versions may add authentication support.

## Endpoints

### 1. Check Code Snippet

Check a code snippet for duplications against the scanned codebase.

**Endpoint:** `POST /api/check`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "code": "string (required)",
  "language": "string (optional)",
  "filename": "string (optional)"
}
```

**Parameters:**

- `code` (required, string): The code snippet to check for duplications
- `language` (optional, string): Programming language of the snippet (e.g., "javascript", "python", "java")
- `filename` (optional, string): Filename with extension to help determine the language

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() {\n  console.log(\"Hello, World!\");\n}",
    "language": "javascript"
  }'
```

**Success Response (200 OK):**

```json
{
  "duplications": [
    {
      "snippetLocation": {
        "startLine": 1,
        "endLine": 5,
        "startColumn": 0,
        "endColumn": 20
      },
      "codebaseLocation": {
        "file": "src/utils/helper.js",
        "startLine": 10,
        "endLine": 14,
        "startColumn": 0,
        "endColumn": 20,
        "fragment": "function hello() {\n  console.log(\"Hello, World!\");\n}"
      },
      "linesCount": 4
    }
  ],
  "statistics": {
    "totalDuplications": 1,
    "duplicatedLines": 4,
    "totalLines": 5,
    "percentageDuplicated": 80.0
  }
}
```

**Error Responses:**

**400 Bad Request** - Validation error:
```json
{
  "error": "ValidationError",
  "message": "Missing required field: code",
  "statusCode": 400
}
```

**400 Bad Request** - Processing error:
```json
{
  "error": "CheckError",
  "message": "Unable to determine format for snippet. Please provide a valid language or filename with extension.",
  "statusCode": 400
}
```

**503 Service Unavailable** - Server still initializing:
```json
{
  "error": "NotReady",
  "message": "Server not initialized. Please wait for initial scan to complete.",
  "statusCode": 503
}
```

### 2. Get Project Statistics

Get overall duplication statistics for the scanned codebase.

**Endpoint:** `GET /api/stats`

**Request Headers:** None required

**Example Request:**

```bash
curl http://localhost:3000/api/stats
```

**Success Response (200 OK):**

```json
{
  "statistics": {
    "detectionDate": "2025-11-17T10:30:00.000Z",
    "total": {
      "lines": 10000,
      "tokens": 50000,
      "sources": 50,
      "duplicatedLines": 500,
      "duplicatedTokens": 2500,
      "clones": 10,
      "percentage": 5.0,
      "percentageTokens": 5.0,
      "newDuplicatedLines": 0,
      "newClones": 0
    },
    "formats": {
      "javascript": {
        "total": {
          "lines": 5000,
          "tokens": 25000,
          "sources": 30,
          "duplicatedLines": 300,
          "duplicatedTokens": 1500,
          "clones": 6,
          "percentage": 6.0,
          "percentageTokens": 6.0,
          "newDuplicatedLines": 0,
          "newClones": 0
        },
        "sources": {
          "src/file1.js": {
            "lines": 100,
            "tokens": 500,
            "sources": 1,
            "duplicatedLines": 10,
            "duplicatedTokens": 50,
            "clones": 1,
            "percentage": 10.0,
            "percentageTokens": 10.0,
            "newDuplicatedLines": 0,
            "newClones": 0
          }
        }
      }
    }
  },
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

**Error Responses:**

**503 Service Unavailable** - Statistics not ready:
```json
{
  "error": "NotReady",
  "message": "Statistics not available yet. Server is still initializing.",
  "statusCode": 503
}
```

### 3. Health Check

Check server health and initialization status.

**Endpoint:** `GET /api/health`

**Request Headers:** None required

**Example Request:**

```bash
curl http://localhost:3000/api/health
```

**Success Response (200 OK):**

```json
{
  "status": "ready",
  "workingDirectory": "/path/to/project",
  "lastScanTime": "2025-11-17T10:30:00.000Z"
}
```

**Status Values:**
- `initializing` - Server is scanning the codebase
- `ready` - Server is ready to accept requests

### 4. API Information

Get information about the API and available endpoints.

**Endpoint:** `GET /`

**Request Headers:** None required

**Example Request:**

```bash
curl http://localhost:3000/
```

**Success Response (200 OK):**

```json
{
  "name": "jscpd-server",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/check": "Check code snippet for duplications",
    "GET /api/stats": "Get overall project statistics",
    "GET /api/health": "Server health check"
  },
  "documentation": "https://github.com/kucherenko/jscpd"
}
```

## Response Schemas

### CheckSnippetResponse

```typescript
{
  duplications: Array<{
    snippetLocation: {
      startLine: number;
      endLine: number;
      startColumn: number;
      endColumn: number;
    };
    codebaseLocation: {
      file: string;
      startLine: number;
      endLine: number;
      startColumn: number;
      endColumn: number;
      fragment?: string;
    };
    linesCount: number;
  }>;
  statistics: {
    totalDuplications: number;
    duplicatedLines: number;
    totalLines: number;
    percentageDuplicated: number;
  };
}
```

### ErrorResponse

```typescript
{
  error: string;
  message: string;
  statusCode: number;
}
```

## Supported Languages

The server supports all languages that jscpd supports. When checking a snippet, you can specify the language using:

1. The `language` parameter with language name (e.g., "javascript", "python", "java")
2. The `filename` parameter with a file extension (e.g., "test.js", "script.py")

Common language identifiers:
- JavaScript: `javascript`, `js`
- TypeScript: `typescript`, `ts`
- Python: `python`, `py`
- Java: `java`
- C/C++: `c`, `cpp`
- C#: `csharp`, `cs`
- PHP: `php`
- Ruby: `ruby`, `rb`
- Go: `go`
- Rust: `rust`, `rs`

For a complete list, see the [supported formats documentation](../../../supported_formats.md).

## Error Handling

All errors follow a consistent format with an HTTP status code and JSON body:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### Common Error Types

- `ValidationError` (400) - Invalid request parameters
- `CheckError` (400) - Error processing the check request
- `NotReady` (503) - Server still initializing
- `NotFound` (404) - Endpoint not found
- `InternalServerError` (500) - Unexpected server error

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting in production environments.

## Examples

### Example 1: Check JavaScript Code

```javascript
const axios = require('axios');

const checkCode = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/check', {
      code: `
function calculateSum(a, b) {
  return a + b;
}
      `,
      language: 'javascript'
    });

    console.log('Duplications found:', response.data.duplications.length);
    console.log('Percentage duplicated:', response.data.statistics.percentageDuplicated + '%');
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

checkCode();
```

### Example 2: Check Python Code

```python
import requests

def check_code():
    url = 'http://localhost:3000/api/check'
    payload = {
        'code': '''
def hello_world():
    print("Hello, World!")
        ''',
        'language': 'python'
    }

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        data = response.json()
        print(f"Duplications found: {len(data['duplications'])}")
        print(f"Percentage duplicated: {data['statistics']['percentageDuplicated']}%")
    else:
        print(f"Error: {response.json()}")

check_code()
```

### Example 3: Get Project Statistics

```bash
#!/bin/bash

# Get statistics
curl -s http://localhost:3000/api/stats | jq '.statistics.total'

# Output:
# {
#   "lines": 10000,
#   "tokens": 50000,
#   "sources": 50,
#   "duplicatedLines": 500,
#   "duplicatedTokens": 2500,
#   "clones": 10,
#   "percentage": 5.0,
#   ...
# }
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Check Code Duplication

on: [push, pull_request]

jobs:
  check-duplication:
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
          sleep 10  # Wait for server to initialize

      - name: Check new code
        run: |
          # Check files changed in this PR
          for file in $(git diff --name-only HEAD~1); do
            if [[ -f "$file" ]]; then
              curl -X POST http://localhost:3000/api/check \
                -H "Content-Type: application/json" \
                -d "{\"code\": \"$(cat $file | jq -Rs .)\", \"filename\": \"$file\"}" \
                | jq .
            fi
          done
```

## Best Practices

1. **Initialize Once**: The server scans the codebase on startup. For large codebases, this may take time.

2. **Language Detection**: Always provide either `language` or `filename` for accurate detection.

3. **Snippet Size**: Keep snippets reasonable in size. Very large snippets may take longer to process.

4. **Error Handling**: Always handle errors appropriately, especially 503 errors during initialization.

5. **Production Use**: For production use, consider:
   - Adding authentication
   - Implementing rate limiting
   - Using a reverse proxy (nginx, Apache)
   - Monitoring and logging
   - Running behind HTTPS

## Troubleshooting

### Server won't start

- **Port already in use**: Try a different port with `--port`
- **Permission denied**: Use a port above 1024 or run with appropriate permissions

### No duplications found

- Ensure `language` or `filename` is correctly specified
- Check that the codebase was successfully scanned (check server logs)
- Verify minimum thresholds (`--min-lines`, `--min-tokens`)

### 503 Service Unavailable

- Wait for the initial scan to complete
- Check `/api/health` endpoint for server status

## Performance Considerations

- **Initial Scan Time**: Depends on codebase size. Large codebases may take several minutes.
- **Memory Usage**: The server keeps the scanned codebase in memory. Monitor memory usage for large projects.
- **Check Response Time**: Typically < 1 second for small snippets, longer for larger snippets.

## Support

For issues, questions, or feature requests, please visit:
- GitHub Issues: https://github.com/kucherenko/jscpd/issues
- Documentation: https://github.com/kucherenko/jscpd

