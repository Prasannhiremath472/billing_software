"""Builds the two upload bundles in deploy/out/ (run from anywhere: python deploy/package.py).

  frontend-billing.zip   -> contents of frontend/dist  (upload into billing.infinitytechnohub.com web root)
  backend-apibilling.zip -> backend source without node_modules/.env/tests (for the Node.js app)

Zip entries use forward slashes so they extract correctly on Linux.
"""
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "deploy" / "out"
API_URL = os.environ.get("VITE_API_BASE_URL", "https://apibilling.infinitytechnohub.com/api/v1")

BACKEND_SKIP_DIRS = {"node_modules", "tests", "logs", ".git"}
BACKEND_SKIP_FILES = {".env", "package-lock.json.bak"}


def find_npm() -> str:
    """Prefer the npm that lives next to node (a stray npm shim earlier on PATH can resolve wrongly on Windows)."""
    name = "npm.cmd" if sys.platform == "win32" else "npm"
    node = shutil.which("node")
    if node:
        beside = Path(node).parent / name
        if beside.exists():
            return str(beside)
    return shutil.which(name) or name


def zip_dir(src: Path, dest: Path, skip_dirs=(), skip_files=()):
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(src.rglob("*")):
            rel = path.relative_to(src)
            if any(part in skip_dirs for part in rel.parts) or path.name in skip_files:
                continue
            if path.is_file():
                z.write(path, rel.as_posix())
    print(f"  {dest.relative_to(ROOT)}  ({dest.stat().st_size // 1024} KB)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"Building frontend against {API_URL}")
    env = {**os.environ, "VITE_API_BASE_URL": API_URL}
    npm = find_npm()
    subprocess.run([npm, "run", "build"], cwd=ROOT / "frontend", env=env, check=True)
    dist = ROOT / "frontend" / "dist"
    if not (dist / "index.html").exists() or not (dist / ".htaccess").exists():
        sys.exit("frontend/dist is missing index.html or .htaccess")

    print("Creating bundles:")
    zip_dir(dist, OUT / "frontend-billing.zip")
    backend_zip = OUT / "backend-apibilling.zip"
    zip_dir(ROOT / "backend", backend_zip, BACKEND_SKIP_DIRS, BACKEND_SKIP_FILES)
    with zipfile.ZipFile(backend_zip, "a", zipfile.ZIP_DEFLATED) as z:  # helper scripts ship with the app
        z.write(ROOT / "deploy" / "server-setup.sh", "server-setup.sh")
        z.write(ROOT / "deploy" / "smoke-test.mjs", "deploy/smoke-test.mjs")


if __name__ == "__main__":
    main()
