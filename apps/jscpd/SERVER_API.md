# jscpd Server API Documentation

The jscpd server provides a RESTful API for detecting code duplications in your codebase. The server indexes your project once at startup and then allows you to check code snippets against the indexed codebase.

## Starting the Server

Start the server using the CLI command:

```bash
jscpd server [path] [options]
```

### Arguments

- `path` - Directory to scan for duplications (defaults to current working directory)

### Options

- `-p, --port <number>` - Port to run the server on (default: 3000)

### Example

```bash
# Start server in current directory on default port 3000
jscpd server .

# Start server in specific directory on port 8080
jscpd server /path/to/project --port 8080

# Start server in current directory on custom port
jscpd server . -p 4000
```

Once started, the server will:
1. Index all supported files in the specified directory
2. Start the HTTP server
3. Display available endpoints

## API Endpoints

### GET /health

Health check endpoint to verify server status.

#### Response

```json
{
  "status": "ok",
  "codebaseIndexed": true
}
```

#### Status Codes

- `200 OK` - Server is running

---

### GET /stats

Returns overall project-level duplication statistics for the entire codebase that was indexed when the server started.

#### Response

```json
{
  "total": {
    "lines": 1500,
    "tokens": 8500,
    "sources": 15,
    "duplicatedLines": 120,
    "duplicatedTokens": 680,
    "clones": 5,
    "percentage": 8.0,
    "percentageTokens": 8.0,
    "newDuplicatedLines": 0,
    "newClones": 0
  },
  "detectionDate": "2024-01-15T10:30:00.000Z",
  "formats": {
    "javascript": {
      "sources": {
        "/path/to/file1.js": {
          "lines": 100,
          "tokens": 550,
          "sources": 1,
          "duplicatedLines": 20,
          "duplicatedTokens": 110,
          "clones": 1,
          "percentage": 20.0,
          "percentageTokens": 20.0,
          "newDuplicatedLines": 0,
          "newClones": 0
        }
      },
      "total": {
        "lines": 1000,
        "tokens": 5500,
        "sources": 10,
        "duplicatedLines": 100,
        "duplicatedTokens": 550,
        "clones": 4,
        "percentage": 10.0,
        "percentageTokens": 10.0,
        "newDuplicatedLines": 0,
        "newClones": 0
      }
    }
  }
}
```

#### Response Fields

- `total` - Overall statistics across all files
  - `lines` - Total lines of code
  - `tokens` - Total tokens
  - `sources` - Number of source files
  - `duplicatedLines` - Number of duplicated lines
  - `duplicatedTokens` - Number of duplicated tokens
  - `clones` - Number of duplicate blocks found
  - `percentage` - Percentage of duplicated lines
  - `percentageTokens` - Percentage of duplicated tokens
- `detectionDate` - ISO timestamp when detection was performed
- `formats` - Statistics broken down by file format

#### Status Codes

- `200 OK` - Statistics retrieved successfully
- `500 Internal Server Error` - Error retrieving statistics

---

### POST /check

Checks a code snippet for duplications against the indexed codebase. Returns duplication statistics specific to the submitted snippet, not project-wide statistics.

#### Request Body

```json
{
  "code": "function example() {\n  return true;\n}",
  "format": "javascript",
  "filename": "example.js"
}
```

#### Request Fields

- `code` (required) - The code snippet to check for duplications
- `format` (optional) - Format/language of the code (e.g., "javascript", "python", "java"). If not provided, will be inferred from filename or default to "javascript"
- `filename` (optional) - Filename to help determine the format if format is not specified

#### Response

```json
{
  "duplications": [
    {
      "format": "javascript",
      "duplicationA": {
        "sourceId": "snippet_1234567890_abc123",
        "start": {
          "line": 1,
          "column": 0,
          "position": 0
        },
        "end": {
          "line": 8,
          "column": 1,
          "position": 150
        },
        "range": [0, 150],
        "fragment": "function example() {\n  console.log('duplicate');\n  ...\n}"
      },
      "duplicationB": {
        "sourceId": "/path/to/existing/file.js",
        "start": {
          "line": 10,
          "column": 0,
          "position": 200
        },
        "end": {
          "line": 17,
          "column": 1,
          "position": 350
        },
        "range": [200, 350],
        "fragment": "function example() {\n  console.log('duplicate');\n  ...\n}"
      }
    }
  ],
  "statistics": {
    "snippetLines": 10,
    "snippetTokens": 55,
    "duplicatedLines": 8,
    "duplicatedTokens": 45,
    "duplicationsFound": 1,
    "percentageDuplicated": 80.0,
    "percentageTokens": 81.82
  }
}
```

#### Response Fields

- `duplications` - Array of duplication objects found
  - `format` - Language/format of the code
  - `duplicationA` - First instance of the duplication (in snippet)
    - `sourceId` - Identifier of the source (snippet ID or file path)
    - `start` - Starting position of the duplication
      - `line` - Line number (1-indexed)
      - `column` - Column number (0-indexed)
      - `position` - Token position
    - `end` - Ending position
    - `range` - Token range [start, end]
    - `fragment` - Code fragment (if available)
  - `duplicationB` - Second instance of the duplication (in codebase)
- `statistics` - Snippet-specific statistics
  - `snippetLines` - Total lines in the submitted snippet
  - `snippetTokens` - Total tokens in the snippet
  - `duplicatedLines` - Number of lines in snippet that are duplicated
  - `duplicatedTokens` - Number of tokens in snippet that are duplicated
  - `duplicationsFound` - Number of duplicate blocks found
  - `percentageDuplicated` - Percentage of snippet that is duplicated (by lines)
  - `percentageTokens` - Percentage of snippet that is duplicated (by tokens)

#### Status Codes

- `200 OK` - Check completed successfully
- `400 Bad Request` - Missing or invalid request body
- `500 Internal Server Error` - Error during duplication detection

#### Example Usage

```bash
# Check a JavaScript snippet
curl -X POST http://localhost:3000/check \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() {\n  console.log(\"world\");\n}",
    "format": "javascript"
  }'

# Check with filename for format detection
curl -X POST http://localhost:3000/check \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def hello():\n    print(\"world\")",
    "filename": "example.py"
  }'
```

---

## Important Notes

### Snippet vs Project Statistics

The `/check` endpoint returns statistics **specific to the submitted code snippet**, while the `/stats` endpoint returns statistics for the **entire project**.

For example:
- `/check` with a 10-line snippet might report 8 duplicated lines (80%)
- `/stats` might report 120 duplicated lines out of 1500 total (8%)

These are measuring different things:
- `/check` measures how much of your submitted snippet is duplicated
- `/stats` measures overall project duplication

### Performance

- The codebase is indexed once when the server starts
- Subsequent `/check` requests are fast as they only analyze the submitted snippet
- For large codebases, initial startup may take longer
- Consider using `--store leveldb` option for very large codebases

### Supported Formats

The server supports all formats that jscpd supports. See the full list by running:

```bash
jscpd --list
```

Common formats include:
- javascript, typescript, jsx, tsx
- python
- java, kotlin
- c, c++, c#
- ruby, php
- go, rust
- And many more...

### Configuration

You can pass additional jscpd options when starting the server to customize detection behavior:

```bash
# Adjust minimum lines for duplication detection
jscpd server . --min-lines 10

# Use different store for large codebases
jscpd server . --store leveldb

# Ignore specific patterns
jscpd server . --ignore "**/node_modules/**"
```

Note: Some options like reporters are automatically disabled in server mode for optimal performance.

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common errors:
- `400 Bad Request` - Invalid request payload
- `500 Internal Server Error` - Server-side processing error

## Integration Examples

### Node.js/JavaScript

```javascript
const axios = require('axios');

// Check code snippet
async function checkCode(code, format = 'javascript') {
  const response = await axios.post('http://localhost:3000/check', {
    code,
    format
  });
  return response.data;
}

// Get project stats
async function getStats() {
  const response = await axios.get('http://localhost:3000/stats');
  return response.data;
}
```

### Python

```python
import requests

# Check code snippet
def check_code(code, format='javascript'):
    response = requests.post('http://localhost:3000/check', json={
        'code': code,
        'format': format
    })
    return response.json()

# Get project stats
def get_stats():
    response = requests.get('http://localhost:3000/stats')
    return response.json()
```

### cURL

```bash
# Health check
curl http://localhost:3000/health

# Get statistics
curl http://localhost:3000/stats

# Check code
curl -X POST http://localhost:3000/check \
  -H "Content-Type: application/json" \
  -d '{"code":"function test() { return true; }","format":"javascript"}'
```

## Testing

Run the test suite:

```bash
cd apps/jscpd
pnpm test
```

The test suite includes:
- Health check tests
- Statistics endpoint tests
- Code checking with various scenarios
- Error handling tests
- Edge cases (empty code, large snippets, etc.)

