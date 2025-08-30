#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys


def get_install_name(dylib_path: str) -> str | None:
  """Return the install name of the dylib (e.g., '@rpath/libduckdb.1.4.dylib')."""
  try:
    out = subprocess.check_output(["otool", "-D", dylib_path], text=True)
    # Output format:
    # <path>:
    # 	@rpath/libduckdb.1.4.dylib
    lines = [line.strip() for line in out.splitlines() if line.strip()]
    if len(lines) >= 2:
      return lines[1]
  except Exception:
    pass
  try:
    out = subprocess.check_output(["otool", "-L", dylib_path], text=True)
    for line in out.splitlines():
      line = line.strip()
      if line.startswith("@rpath/libduckdb") and ".dylib" in line:
        return line.split(" ")[0]
  except Exception:
    pass
  return None


def main():
  if len(sys.argv) != 3:
    print("usage: copy_with_install_name_darwin.py <src_dylib_path> <dest_dir>")
    sys.exit(2)

  src_dylib = sys.argv[1]
  dest_dir = sys.argv[2]
  os.makedirs(dest_dir, exist_ok=True)

  # Always copy the base file
  shutil.copy2(src_dylib, os.path.join(dest_dir, os.path.basename(src_dylib)))

  install_name = get_install_name(src_dylib)
  if not install_name:
    print("warning: could not determine install name; skipping versioned copy")
    return

  # Only need the filename
  versioned_name = os.path.basename(install_name)
  dest_versioned = os.path.join(dest_dir, versioned_name)
  if not os.path.exists(dest_versioned):
    shutil.copy2(src_dylib, dest_versioned)
    print(f"copied {src_dylib} -> {dest_versioned}")
  else:
    print(f"versioned file already exists: {dest_versioned}")


if __name__ == "__main__":
  main()


