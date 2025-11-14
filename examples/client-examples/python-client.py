"""
Python client example for jscpd server

Prerequisites:
- jscpd server running on localhost:3000
- requests library: pip install requests
"""

import requests
import json
from typing import Dict, List, Optional


class JscpdClient:
    """Client for interacting with jscpd server API"""

    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url

    def check_health(self) -> Dict:
        """Check server health status"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def get_stats(self) -> Dict:
        """Get project-level statistics"""
        response = requests.get(f"{self.base_url}/stats")
        response.raise_for_status()
        return response.json()

    def check_code(
        self,
        code: str,
        format: str = "javascript",
        filename: Optional[str] = None
    ) -> Dict:
        """
        Check a code snippet for duplications

        Args:
            code: The code snippet to check
            format: Programming language format
            filename: Optional filename for format detection

        Returns:
            Dictionary containing duplications and statistics
        """
        payload = {
            "code": code,
            "format": format
        }

        if filename:
            payload["filename"] = filename

        response = requests.post(
            f"{self.base_url}/check",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()

    def check_files(self, files: List[Dict]) -> List[Dict]:
        """
        Check multiple files for duplications

        Args:
            files: List of dicts with 'path', 'content', and 'format'

        Returns:
            List of results for each file
        """
        results = []
        for file in files:
            print(f"Checking {file['path']}...")
            result = self.check_code(
                file['content'],
                file.get('format', 'javascript'),
                file.get('path')
            )
            results.append({
                'path': file['path'],
                **result
            })
        return results


def report_duplications(result: Dict, threshold: float = 50.0) -> bool:
    """
    Print duplication report and return if within threshold

    Args:
        result: Result from check_code
        threshold: Maximum acceptable duplication percentage

    Returns:
        True if within threshold, False otherwise
    """
    stats = result['statistics']

    print("\n=== Duplication Report ===")
    print(f"Snippet lines: {stats['snippetLines']}")
    print(f"Duplicated lines: {stats['duplicatedLines']}")
    print(f"Duplication percentage: {stats['percentageDuplicated']}%")
    print(f"Duplications found: {stats['duplicationsFound']}")

    if stats['percentageDuplicated'] > threshold:
        print(f"\n⚠️  WARNING: Duplication exceeds threshold ({threshold}%)")

        if result['duplications']:
            print("\nDuplication details:")
            for i, dup in enumerate(result['duplications'], 1):
                print(f"\n{i}. Duplication found:")
                print(f"   Format: {dup['format']}")
                print(f"   In snippet: lines {dup['duplicationA']['start']['line']}-{dup['duplicationA']['end']['line']}")
                print(f"   In codebase: {dup['duplicationB']['sourceId']}")
                print(f"   Lines: {dup['duplicationB']['start']['line']}-{dup['duplicationB']['end']['line']}")

        return False
    else:
        print("\n✅ Duplication is within acceptable range")
        return True


def main():
    """Example usage"""
    client = JscpdClient()

    try:
        # 1. Check server health
        print("Checking server health...")
        health = client.check_health()
        print(f"Server status: {health}")

        # 2. Get project statistics
        print("\nGetting project statistics...")
        stats = client.get_stats()
        print(f"Project stats:")
        print(f"  Total files: {stats['total']['sources']}")
        print(f"  Total lines: {stats['total']['lines']}")
        print(f"  Duplicated lines: {stats['total']['duplicatedLines']}")
        print(f"  Percentage: {stats['total']['percentage']}%")

        # 3. Check a Python snippet
        print("\nChecking Python code snippet...")
        python_code = '''
def calculate_total(items):
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total
        '''.strip()

        result = client.check_code(python_code, format='python')
        report_duplications(result, threshold=50.0)

        # 4. Check a JavaScript snippet
        print("\nChecking JavaScript code snippet...")
        js_code = '''
function fetchData(url) {
  return fetch(url)
    .then(response => response.json())
    .catch(error => console.error(error));
}
        '''.strip()

        result = client.check_code(js_code, format='javascript')
        report_duplications(result, threshold=50.0)

        # 5. Check multiple files
        print("\nChecking multiple files...")
        files = [
            {
                'path': 'utils/helpers.py',
                'content': 'def helper():\n    return True',
                'format': 'python',
            },
            {
                'path': 'services/api.js',
                'content': 'const api = async () => { return await fetch("/api"); }',
                'format': 'javascript',
            },
        ]

        file_results = client.check_files(files)
        for result in file_results:
            print(f"\nFile: {result['path']}")
            print(f"  Duplications: {result['statistics']['duplicationsFound']}")
            print(f"  Percentage: {result['statistics']['percentageDuplicated']}%")

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())

