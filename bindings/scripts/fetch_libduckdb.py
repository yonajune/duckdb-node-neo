import os
import shutil
import urllib.request
import urllib.error
import zipfile
import time
from typing import Union

def _extract_files_from_zip(archive: zipfile.ZipFile, files, output_dir: str) -> bool:
  """Attempt to extract the requested files from a zip archive.

  Returns True if all files were found and extracted, False otherwise.
  This function matches files by suffix so it works whether the archive stores
  the files at the root or within a directory (e.g., "libduckdb-linux-amd64/duckdb.h").
  """
  names = archive.namelist()
  extracted_all = True
  for file in files:
    # Find the first entry that ends with the desired filename
    matching = next((name for name in names if name.endswith("/" + file) or name.endswith(file)), None)
    if not matching:
      extracted_all = False
      break
    print("extracting: " + file)
    archive.extract(matching, output_dir)
  return extracted_all


def _find_nested_lib_zip(archive: zipfile.ZipFile) -> Union[str, None]:
  """Return the name of the nested libduckdb zip inside the archive, if any."""
  for name in archive.namelist():
    lower = name.lower()
    if lower.endswith(".zip") and "libduckdb" in lower:
      return name
  return None


def fetch_libduckdb(zip_url, output_dir, files):
  if not os.path.exists(output_dir):
    os.makedirs(output_dir)

  # Check if all required files already exist
  all_files_exist = all(os.path.exists(os.path.join(output_dir, f)) for f in files)
  if all_files_exist:
    print(f"All required files already exist in {output_dir}, skipping download")
    return

  local_zip_path = os.path.join(output_dir, "libduckdb.zip")
  print("fetching: " + zip_url)
  
  # Set a timeout for the download (30 seconds)
  try:
    # Create a custom opener with timeout
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
    urllib.request.install_opener(opener)
    
    # Download with retries
    max_retries = 3
    for attempt in range(max_retries):
      try:
        print(f"Download attempt {attempt + 1}/{max_retries}...")
        with urllib.request.urlopen(zip_url, timeout=30) as response:
          # Check if we got a successful response
          if response.status != 200:
            print(f"Warning: HTTP status {response.status}")
          
          # Download in chunks to show progress
          total_size = response.headers.get('Content-Length')
          downloaded = 0
          chunk_size = 8192
          
          with open(local_zip_path, 'wb') as out_file:
            while True:
              chunk = response.read(chunk_size)
              if not chunk:
                break
              out_file.write(chunk)
              downloaded += len(chunk)
              
              if total_size:
                percent = (downloaded / int(total_size)) * 100
                print(f"\rDownloading: {percent:.1f}%", end='', flush=True)
        
        print("\nDownload completed successfully")
        break
      except (urllib.error.URLError, OSError) as e:
        print(f"\nDownload failed: {e}")
        if attempt < max_retries - 1:
          print(f"Retrying in 2 seconds...")
          time.sleep(2)
        else:
          raise RuntimeError(f"Failed to download after {max_retries} attempts: {e}")
  except Exception as e:
    # Clean up partial download
    if os.path.exists(local_zip_path):
      os.remove(local_zip_path)
    raise

  # First try extracting directly from the top-level archive
  with zipfile.ZipFile(local_zip_path) as top_zip:
    if _extract_files_from_zip(top_zip, files, output_dir):
      return

    # If files are not present at top-level, look for a nested libduckdb-*.zip
    nested_name = _find_nested_lib_zip(top_zip)
    if not nested_name:
      raise RuntimeError("Could not find libduckdb files or nested libduckdb archive in downloaded zip")

    nested_zip_path = os.path.join(output_dir, "libduckdb-inner.zip")
    print("found nested archive: " + nested_name)
    with top_zip.open(nested_name) as nested_src, open(nested_zip_path, "wb") as nested_dst:
      shutil.copyfileobj(nested_src, nested_dst)

  # Extract requested files from the nested archive
  with zipfile.ZipFile(nested_zip_path) as nested_zip:
    if not _extract_files_from_zip(nested_zip, files, output_dir):
      raise RuntimeError("Requested files not found in nested libduckdb archive")
