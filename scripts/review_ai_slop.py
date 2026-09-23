import os
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent

TARGET_FILES = [
    WORKSPACE / "backend" / "app" / "schemas" / "tools.py",
    WORKSPACE / "backend" / "app" / "schemas" / "state.py",
    WORKSPACE / "backend" / "app" / "schemas" / "events.py",
    WORKSPACE / "backend" / "app" / "schemas" / "settings.py",
    WORKSPACE / "backend" / "app" / "schemas" / "__init__.py",
    WORKSPACE / "backend" / "app" / "agent" / "registry.py",
    WORKSPACE / "backend" / "app" / "services" / "learning.py",
    WORKSPACE / "backend" / "app" / "agent" / "personas.py",
    WORKSPACE / "backend" / "app" / "agent" / "nodes.py",
    WORKSPACE / "backend" / "app" / "agent" / "edges.py",
    WORKSPACE / "backend" / "app" / "agent" / "graph.py",
    WORKSPACE / "backend" / "app" / "agent" / "runner.py",
    WORKSPACE / "backend" / "app" / "agent" / "prompts.py",
    WORKSPACE / "backend" / "app" / "api" / "chat.py",
    WORKSPACE / "backend" / "app" / "api" / "settings_api.py",
]

FORBIDDEN_PATTERNS = [
    (r"\bTODO\b", "Unfinished TODO placeholder"),
    (r"\bFIXME\b", "Unfinished FIXME placeholder"),
    (r"\bpass\s*$", "Empty code stub (pass)"),
    (r"return\s+True\s*#\s*mock", "Mock boolean return"),
    (r"return\s+None\s*#\s*mock", "Mock None return"),
    (r"Serenity\s+Engine", "AI sci-fi naming: Serenity"),
    (r"Divine\s+", "AI sci-fi naming: Divine"),
    (r"SovereignAgentEngine\(\)", "Direct instantiation of legacy SovereignAgentEngine"),
]


def run_slop_review():
    print("=" * 60)
    print("🔍 ERIS AI SLOP & CODE CRAFT REVIEW AGENT")
    print("=" * 60)

    total_issues = 0
    clean_files = 0

    for file_path in TARGET_FILES:
        if not file_path.exists():
            print(f"❌ Missing file: {file_path.relative_to(WORKSPACE)}")
            total_issues += 1
            continue

        content = file_path.read_text(encoding="utf-8")
        file_issues = []

        for pattern, label in FORBIDDEN_PATTERNS:
            matches = list(re.finditer(pattern, content, flags=re.MULTILINE))
            if matches:
                for m in matches:
                    line_no = content[:m.start()].count("\n") + 1
                    file_issues.append((line_no, label, m.group(0)))

        if file_issues:
            print(f"\n⚠️ Issues found in {file_path.relative_to(WORKSPACE)}:")
            for line_no, label, match_str in file_issues:
                print(f"   [Line {line_no}] {label}: '{match_str}'")
            total_issues += len(file_issues)
        else:
            clean_files += 1
            print(f"✓ Clean: {file_path.relative_to(WORKSPACE)} (0 issues)")

    print("\n" + "=" * 60)
    print(f"Summary: {clean_files}/{len(TARGET_FILES)} files 100% clean.")
    if total_issues == 0:
        print("✅ SUCCESS: Zero AI slop, zero placeholders, zero pretentious AI names detected!")
        return 0
    else:
        print(f"❌ FAILED: {total_issues} slop violation(s) detected.")
        return 1


if __name__ == "__main__":
    sys.exit(run_slop_review())
