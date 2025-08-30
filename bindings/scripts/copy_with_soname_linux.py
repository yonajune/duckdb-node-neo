#!/usr/bin/env python3
import os
import re
import shutil
import subprocess
import sys


def get_soname(so_path: str) -> str | None:
  """Return SONAME (e.g., 'libduckdb.so.1.4') from a shared object using readelf or objdump."""
  try:
    out = subprocess.check_output(["readelf", "-d", so_path], text=True)
    m = re.search(r"SONAME\s+Library soname: \[(.+?)\]", out)
    if m:
      return m.group(1)
  except Exception:
    pass
  try:
    out = subprocess.check_output(["objdump", "-p", so_path], text=True)
    for line in out.splitlines():
      line = line.strip()
      if line.startswith("SONAME"):
        return line.split()[1]
  except Exception:
    pass
  return None


def main():
  if len(sys.argv) < 3:
    print("usage: copy_with_soname_linux.py <src_so_path> <dest_dir> [stamp_file]")
    sys.exit(2)
  src_so = sys.argv[1]
  dest_dir = sys.argv[2]
  stamp_file = sys.argv[3] if len(sys.argv) >= 4 else None
  os.makedirs(dest_dir, exist_ok=True)

  # Always ensure the base .so is present
  shutil.copy2(src_so, os.path.join(dest_dir, os.path.basename(src_so)))

  soname = get_soname(src_so)
  if not soname:
    print("warning: could not determine SONAME; skipping versioned copy")
    return

  dest_versioned = os.path.join(dest_dir, soname)
  if not os.path.exists(dest_versioned):
    shutil.copy2(src_so, dest_versioned)
    print(f"copied {src_so} -> {dest_versioned}")
  else:
    print(f"versioned file already exists: {dest_versioned}")
  if stamp_file:
    # Create/overwrite a stamp file so build systems can track completion
    with open(stamp_file, 'w') as f:
      f.write('ok')


if __name__ == "__main__":
  main()


