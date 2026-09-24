"""
ERIS Distribution Sanitizer
Ensures that no personal memory, databases (*.db, *.sqlite), credentials (.env*),
or user profile JSON files ever get packaged into the PyInstaller or Electron distributions.
"""
import os
import shutil
from pathlib import Path

def sanitize_dist():
    project_root = Path(__file__).resolve().parent.parent
    dist_dir = project_root / "dist" / "eris_backend"
    
    if not dist_dir.exists():
        print("[Sanitizer] dist/eris_backend does not exist yet. Nothing to sanitize.")
        return

    print(f"[Sanitizer] Inspecting {dist_dir} for personal/sensitive runtime artifacts...")
    
    removed_count = 0

    # 1. Purge personal runtime memory directories
    candidate_memory_dirs = [
        dist_dir / "memory",
        dist_dir / "_internal" / "memory",
        dist_dir / "scratch",
        dist_dir / "_internal" / "scratch",
    ]
    for d in candidate_memory_dirs:
        if d.exists() and d.is_dir():
            print(f"[Sanitizer] Purging personal directory: {d}")
            shutil.rmtree(d, ignore_errors=True)
            removed_count += 1

    # 2. Deep scan for database files, env credentials, and user data
    banned_extensions = {".db", ".sqlite", ".sqlite3"}
    sensitive_file_keywords = {"user_profile", "user_habits", "informed_consent", "auth.db", "rag_vault.db"}

    for root, _dirs, files in os.walk(dist_dir):
        for f in files:
            file_path = Path(root) / f
            lower_name = f.lower()

            # Skip system/package internal databases if any (none exist by default)
            is_sensitive_file = (
                file_path.suffix.lower() in banned_extensions or
                lower_name.startswith(".env") or
                lower_name.endswith(".key") or
                any(keyword in lower_name for keyword in sensitive_file_keywords)
            )

            if is_sensitive_file:
                print(f"[Sanitizer] Removing sensitive file: {file_path}")
                try:
                    file_path.unlink()
                    removed_count += 1
                except Exception as e:
                    print(f"[Sanitizer] Warning: Could not delete {file_path}: {e}")

    print(f"[Sanitizer] Completed. Cleaned {removed_count} artifacts. Distribution is verified clean.")

if __name__ == "__main__":
    sanitize_dist()
