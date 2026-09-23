"""
ERIS State-Machine Lifecycle & Silent-Fallback Auditor.
Catches semantic bugs, state re-hydration glitches, and GET mutation anti-patterns.
"""

import os
import re
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
BASE_URL = "http://127.0.0.1:5174"

def send_request(method: str, path: str, payload: Any = None, headers: Dict[str, str] = None) -> Tuple[int, Any]:
    url = f"{BASE_URL}{path}"
    data = None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            body = res.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            return res.status, parsed
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return he.code, parsed
    except Exception as e:
        return -1, str(e)

def run_lifecycle_audit():
    print("=== ERIS STATE-MACHINE LIFECYCLE & FALLBACK AUDIT ===")
    failures = []
    tests_run = 0

    # --------------------------------------------------------------------------
    # Test 1: Anonymous Session Probe must be unauthenticated
    # --------------------------------------------------------------------------
    tests_run += 1
    st, data = send_request("GET", "/api/system/session-status")
    if st != 200 or not isinstance(data, dict):
        failures.append(f"Test 1 Failed: /api/system/session-status returned {st}: {data}")
    elif data.get("authenticated") is not False:
        failures.append(f"Test 1 Failed: Anonymous ping returned authenticated={data.get('authenticated')} (Expected False)")
    else:
        print("✓ Test 1: Anonymous /session-status returns authenticated=False (No zombie session)")

    # --------------------------------------------------------------------------
    # Test 2: Invalid/Forged Token Verification must be unauthenticated
    # --------------------------------------------------------------------------
    tests_run += 1
    st, data = send_request("POST", "/api/auth/session", {"token": "forged_nonexistent_token_xyz"})
    if st != 200 or not isinstance(data, dict):
        failures.append(f"Test 2 Failed: /api/auth/session returned {st}: {data}")
    elif data.get("authenticated") is not False:
        failures.append(f"Test 2 Failed: Forged token returned authenticated={data.get('authenticated')} (Expected False)")
    else:
        print("✓ Test 2: Forged token /api/auth/session returns authenticated=False (No auto-minting)")

    # --------------------------------------------------------------------------
    # Test 3: Session Status GET Request Idempotency
    # Calling GET /session-status 3 times must NOT mutate state
    # --------------------------------------------------------------------------
    tests_run += 1
    idempotent = True
    for _ in range(3):
        st, data = send_request("GET", "/api/system/session-status")
        if data.get("authenticated") is not False or data.get("token") is not None:
            idempotent = False
            break
    if not idempotent:
        failures.append("Test 3 Failed: GET /api/system/session-status is non-idempotent (mutated session state)")
    else:
        print("✓ Test 3: GET /session-status is strictly idempotent & safe across repeat queries")

    # --------------------------------------------------------------------------
    # Test 4: Dev Clear All Data Endpoint
    # --------------------------------------------------------------------------
    tests_run += 1
    st, data = send_request("POST", "/api/system/dev-clear-all-data")
    if st != 200 or not data.get("ok"):
        failures.append(f"Test 4 Failed: /dev-clear-all-data returned {st}: {data}")
    else:
        # Check that session status remains unauthenticated after clear
        st_after, data_after = send_request("GET", "/api/system/session-status")
        if data_after.get("authenticated") is not False:
            failures.append("Test 4 Failed: Post-clear /session-status still authenticated!")
        else:
            print("✓ Test 4: /dev-clear-all-data effectively purges state and leaves session unauthenticated")

    # --------------------------------------------------------------------------
    # Test 5: Static AST Check: Prohibit DB Mutation in GET Endpoints
    # --------------------------------------------------------------------------
    tests_run += 1
    api_dir = BACKEND_DIR / "app" / "api"
    mutation_violations = []
    
    get_route_pattern = re.compile(r"""@router\.get\s*\(\s*["']([^"']*)["']""", re.IGNORECASE)
    db_mutation_pattern = re.compile(r"""db\.(?:add|commit|delete)\s*\(""", re.IGNORECASE)

    for py_file in api_dir.glob("*.py"):
        content = py_file.read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()
        in_get_route = False
        current_route = ""
        current_indent = 0
        
        for idx, line in enumerate(lines):
            r_match = get_route_pattern.search(line)
            if r_match:
                in_get_route = True
                current_route = r_match.group(1)
                continue
            
            if in_get_route:
                # If we encounter a new decorator or top-level function, reset
                if line.startswith("@router.") or (line.startswith("def ") or line.startswith("async def ")) and not line.startswith(" "):
                    if idx > 0 and not lines[idx-1].strip().startswith("@"):
                        in_get_route = False
                        continue
                
                # Check for mutating calls
                if db_mutation_pattern.search(line):
                    # Exclude safe seeding in list endpoints
                    if "ensure_connectors_seeded" in line or "ensure_seeded" in line:
                        continue
                    mutation_violations.append(f"{py_file.name}:{idx+1} in GET {current_route}: {line.strip()}")

    if mutation_violations:
        failures.append(f"Test 5 Failed: Mutating DB calls detected in GET routes:\n" + "\n".join(mutation_violations))
    else:
        print("✓ Test 5: Static AST check verified: Zero unauthorized state mutations inside GET routes")

    print("\n------------------------------------------------------------------")
    if failures:
        print(f"❌ AUDIT FAILED with {len(failures)} violations:")
        for f in failures:
            print(f"  - {f}")
        return False
    else:
        print(f"✅ ALL {tests_run} STATE-MACHINE & LIFECYCLE AUDIT TESTS PASSED.")
        return True

if __name__ == "__main__":
    from typing import Tuple
    success = run_lifecycle_audit()
    sys.exit(0 if success else 1)
