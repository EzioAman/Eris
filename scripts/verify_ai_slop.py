#!/usr/bin/env python3
"""
ERIS AI Slop & Font Guard Verification Script
Enforces strict compliance with `doc/ai_slop.md`:
1. Font Unification: Verifies all typography adheres to standard fonts (`font-sans`, `font-mono`).
   Disallows font dissonance (`font-serif`, `Newsreader`, `Playfair`, `font-display`).
2. Legibility: Rejects unreadable micro-font sizes (`text-[8px]`, `text-[9px]`).
3. Anti-Slop Buzzwords: Flags empty pretentious buzzwords ("sovereign agentic system", etc.).
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_SRC = ROOT_DIR / "frontend" / "src"
FRONTEND_TEMPLATES = ROOT_DIR / "frontend" / "ui_templates"

DISALLOWED_PATTERNS = [
    ("font-serif", "Disallowed font family (font-serif). Only font-sans and font-mono permitted."),
    ("Newsreader", "Disallowed font import (Newsreader)."),
    ("Playfair", "Disallowed font import (Playfair Display)."),
    ("font-display", "Disallowed font-display class."),
    ("text-[8px]", "Violates legibility guidelines in doc/ai_slop.md (unreadable micro-font size 8px)."),
    ("text-[9px]", "Violates legibility guidelines in doc/ai_slop.md (unreadable micro-font size 9px)."),
    ("SovereignAgentEngine", "Legacy/pretentious class name SovereignAgentEngine detected in frontend."),
    ("Sovereign Local Mode Active", "AI slop banner text detected."),
]

def scan_files():
    violations = []
    checked_files = 0

    extensions = {".tsx", ".ts", ".html", ".css"}
    dirs_to_scan = [FRONTEND_SRC]
    if FRONTEND_TEMPLATES.exists():
        dirs_to_scan.append(FRONTEND_TEMPLATES)

    for scan_dir in dirs_to_scan:
        for path in scan_dir.rglob("*"):
            if path.is_file() and path.suffix in extensions:
                checked_files += 1
                try:
                    content = path.read_text(encoding="utf-8")
                except Exception:
                    continue

                for pattern, reason in DISALLOWED_PATTERNS:
                    if pattern in content:
                        lines = content.splitlines()
                        for idx, line in enumerate(lines, 1):
                            if pattern in line:
                                violations.append({
                                    "file": str(path.relative_to(ROOT_DIR)),
                                    "line": idx,
                                    "pattern": pattern,
                                    "reason": reason,
                                    "snippet": line.strip()[:100]
                                })

    index_html = ROOT_DIR / "frontend" / "index.html"
    if index_html.exists():
        checked_files += 1
        content = index_html.read_text(encoding="utf-8")
        for pattern, reason in DISALLOWED_PATTERNS:
            if pattern in content:
                violations.append({
                    "file": "frontend/index.html",
                    "line": 1,
                    "pattern": pattern,
                    "reason": reason,
                    "snippet": pattern
                })

    return checked_files, violations

def main():
    print("=" * 65)
    print("  ERIS AI SLOP & FONT UNIFICATION GUARD")
    print("=" * 65)

    checked, violations = scan_files()
    print(f"Scanned {checked} files across frontend.\n")

    if violations:
        print(f"❌ FAILED: Found {len(violations)} AI Slop / Font violations:\n")
        for v in violations:
            print(f"  • [{v['file']}:{v['line']}] '{v['pattern']}'")
            print(f"    Reason: {v['reason']}")
            print(f"    Code:   {v['snippet']}\n")
        sys.exit(1)
    else:
        print("✅ PASSED: Zero font dissonance, zero unreadable micro-fonts, zero AI slop artifacts.")
        sys.exit(0)

if __name__ == "__main__":
    main()
