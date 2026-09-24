import os
import requests
from pathlib import Path

BASE_URL = "http://localhost:8080"
TEST_FILES_DIR = Path(r"c:\AK\markitdown\packages\markitdown\tests\test_files")

files_to_test = [
    ("PDF", TEST_FILES_DIR / "test.pdf"),
    ("PDF Table", TEST_FILES_DIR / "movie-theater-booking-2024.pdf"),
    ("Word DOCX", TEST_FILES_DIR / "test.docx"),
    ("Excel XLSX", TEST_FILES_DIR / "test.xlsx"),
    ("PowerPoint PPTX", TEST_FILES_DIR / "test.pptx"),
    ("HTML Blog", TEST_FILES_DIR / "test_blog.html"),
    ("ZIP Archive", TEST_FILES_DIR / "test_files.zip"),
    ("Image JPG", TEST_FILES_DIR / "test.jpg"),
]

print("=== STARTING END-TO-END CONVERSION TESTS ===")

# 1. Health check
try:
    h = requests.get(f"{BASE_URL}/api/health").json()
    print(f"Health Check: {h['status']} | MarkItDown available: {h['markitdown_available']}")
except Exception as e:
    print(f"Server health check failed: {e}")
    exit(1)

# 2. Test File Conversions
for label, file_path in files_to_test:
    if not file_path.exists():
        print(f"WARNING: File missing: {file_path}")
        continue
    
    print(f"\nTesting {label} ({file_path.name}):")
    for fmt in ["markdown", "html", "text", "json"]:
        with open(file_path, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/api/convert",
                files={"files": (file_path.name, f)},
                data={"output_format": fmt}
            )
        
        if resp.status_code == 200:
            res_data = resp.json().get("results", [])[0]
            if res_data.get("status") == "success":
                content_len = len(res_data.get("output", ""))
                words = res_data.get("word_count", 0)
                print(f"  [OK] [{fmt.upper()}] Success | Content length: {content_len} chars | {words} words")
            else:
                print(f"  [ERROR] [{fmt.upper()}] Conversion Error: {res_data.get('error')}")
        else:
            print(f"  [ERROR] [{fmt.upper()}] HTTP {resp.status_code}: {resp.text}")

print("\n=== ALL TESTS COMPLETED ===")
