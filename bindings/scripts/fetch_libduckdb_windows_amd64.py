import os
from fetch_libduckdb import fetch_libduckdb

zip_url = "https://artifacts.duckdb.org/latest/duckdb-binaries-windows.zip"
output_dir = os.path.join(os.path.dirname(__file__), "..", "libduckdb")
files = [
  "duckdb.h",
  "duckdb.lib",
  "duckdb.dll",
]

fetch_libduckdb(zip_url, output_dir, files)
