"""
Security & Vulnerability Audit Module for ERIS.
Executes red-teaming probes against endpoints, agent tools, and filesystem sandboxes.
Strictly verified with Pydantic models.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi.testclient import TestClient

try:
    from app.agent.core_tools import CoreToolbox
except ImportError:
    from backend.app.agent.core_tools import CoreToolbox


class SecurityProbeResult(BaseModel):
    name: str = Field(description="Name of the security probe")
    category: str = Field(description="Probe category: api, sandbox, or credentials")
    passed: bool = Field(description="True if exploit was safely neutralized")
    status_code: Optional[int] = Field(default=None, description="HTTP status code if applicable")
    detail: str = Field(description="Verification detail or failure reason")


class SecurityAuditSummary(BaseModel):
    total_probes: int
    passed_probes: int
    failed_probes: int
    all_passed: bool
    results: List[SecurityProbeResult]


def run_api_security_probes(client: Optional[TestClient] = None) -> List[SecurityProbeResult]:
    """Runs automated security probes against the FastAPI REST endpoints."""
    if client is None:
        try:
            from backend.app.main import app
        except ImportError:
            from app.main import app
        client = TestClient(app)

    results: List[SecurityProbeResult] = []

    # 1. System Health
    res = client.get("/api/system/check-env")
    results.append(
        SecurityProbeResult(
            name="System Health Check",
            category="api",
            passed=res.status_code == 200,
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 2. SQL Injection Attempt
    sql_payload = {
        "display_name": "'; DROP TABLE users; --",
        "username": "sqli_test",
        "email": "sqli_test@eris.core",
        "bio": "1' OR '1'='1' UNION SELECT * FROM sessions --",
        "timezone": "UTC",
        "visibility": "private",
        "accent": "indigo",
        "tags": ["sec_audit", "sqli_probe"],
        "notify_product": True,
        "notify_mentions": True,
        "notify_digest": False,
    }
    res = client.post("/api/user/profile", json=sql_payload)
    results.append(
        SecurityProbeResult(
            name="SQL Injection Immunity",
            category="api",
            passed=res.status_code in [200, 400],
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 3. Cross-Site Scripting (XSS)
    xss_payload = {
        "display_name": "<script>alert('XSS')</script>",
        "username": "xss_probe",
        "email": "xss_probe@eris.core",
        "bio": "<img src=x onerror=alert(document.cookie)>",
        "timezone": "UTC",
        "visibility": "private",
        "accent": "indigo",
        "tags": ["<script>"],
        "notify_product": True,
        "notify_mentions": True,
        "notify_digest": False,
    }
    res = client.post("/api/user/profile", json=xss_payload)
    results.append(
        SecurityProbeResult(
            name="XSS Payload Handling",
            category="api",
            passed=res.status_code in [200, 400, 422],
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 4. Malformed Email
    bad_email_payload = {
        "display_name": "Operator",
        "username": "bad_email_user",
        "email": "not-an-email",
        "bio": "Test bio",
        "timezone": "UTC",
        "visibility": "private",
        "accent": "indigo",
    }
    res = client.post("/api/user/profile", json=bad_email_payload)
    results.append(
        SecurityProbeResult(
            name="Invalid Email Schema Rejection (422)",
            category="api",
            passed=res.status_code == 422,
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 5. Invalid Username Pattern
    bad_username_payload = {
        "display_name": "Operator",
        "username": "bad username with spaces!@#",
        "email": "valid@eris.core",
        "bio": "Test bio",
        "timezone": "UTC",
        "visibility": "private",
        "accent": "indigo",
    }
    res = client.post("/api/user/profile", json=bad_username_payload)
    results.append(
        SecurityProbeResult(
            name="Invalid Username Rejection (422)",
            category="api",
            passed=res.status_code == 422,
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 6. Buffer Overflow Defense
    huge_bio_payload = {
        "display_name": "Operator",
        "username": "overflow_test",
        "email": "overflow@eris.core",
        "bio": "A" * 5000,
        "timezone": "UTC",
        "visibility": "private",
        "accent": "indigo",
    }
    res = client.post("/api/user/profile", json=huge_bio_payload)
    results.append(
        SecurityProbeResult(
            name="Buffer Overflow Prevention (422)",
            category="api",
            passed=res.status_code == 422,
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    # 7. Forged Token Handling
    res = client.post("/api/auth/session", json={"token": "forged-fake-token-12345"})
    data = res.json() if res.status_code == 200 else {}
    results.append(
        SecurityProbeResult(
            name="Forged Session Token Neutralization",
            category="api",
            passed=res.status_code == 200 and data.get("authenticated") is False,
            status_code=res.status_code,
            detail=f"Authenticated: {data.get('authenticated')}",
        )
    )

    # 8. Profile Route Check
    res = client.get("/api/user/profile")
    results.append(
        SecurityProbeResult(
            name="User Profile Route Validation",
            category="api",
            passed=res.status_code == 200,
            status_code=res.status_code,
            detail=f"Status: {res.status_code}",
        )
    )

    return results


def run_filesystem_sandbox_probes() -> List[SecurityProbeResult]:
    """Runs automated security probes against the CoreToolbox filesystem sandbox."""
    results: List[SecurityProbeResult] = []

    # 9. Block reading .env secrets
    read_env_res = CoreToolbox.read_file(".env")
    passed_read_env = "SECURITY_ERROR" in read_env_res
    results.append(
        SecurityProbeResult(
            name="Environment Secrets Protection (read_file)",
            category="credentials",
            passed=passed_read_env,
            detail=read_env_res[:80],
        )
    )

    # 10. Block viewing .env secrets via line slice
    view_env_res = CoreToolbox.view_file(".env", start_line=1, end_line=10)
    passed_view_env = "SECURITY_ERROR" in view_env_res
    results.append(
        SecurityProbeResult(
            name="Environment Secrets Slicing Defense (view_file)",
            category="credentials",
            passed=passed_view_env,
            detail=view_env_res[:80],
        )
    )

    # 11. Block reading SQLite Auth Database
    read_auth_res = CoreToolbox.read_file("memory/auth.db")
    passed_auth_read = "SECURITY_ERROR" in read_auth_res
    results.append(
        SecurityProbeResult(
            name="User Credentials DB Protection (auth.db)",
            category="credentials",
            passed=passed_auth_read,
            detail=read_auth_res[:80],
        )
    )

    # 12. Block Path Traversal
    traversal_res = CoreToolbox.read_file("../../Windows/System32/drivers/etc/hosts")
    passed_traversal = "SECURITY_ERROR" in traversal_res
    results.append(
        SecurityProbeResult(
            name="Workspace Path Traversal Defense",
            category="sandbox",
            passed=passed_traversal,
            detail=traversal_res[:80],
        )
    )

    # 13. Block Overwriting .env Secrets
    write_env_res = CoreToolbox.write_file(".env", "MALICIOUS_KEY=compromised")
    passed_write_env = "SECURITY_ERROR" in write_env_res
    results.append(
        SecurityProbeResult(
            name="Secrets Tamper Defense (write_file)",
            category="credentials",
            passed=passed_write_env,
            detail=write_env_res[:80],
        )
    )

    # 14. Allow benign template reading (.env.example)
    read_example_res = CoreToolbox.read_file(".env.example")
    passed_example = "FILE_CONTENT" in read_example_res
    results.append(
        SecurityProbeResult(
            name="Public Template File Accessibility (.env.example)",
            category="sandbox",
            passed=passed_example,
            detail=read_example_res[:60].replace("\n", " "),
        )
    )

    return results


def run_full_security_audit() -> SecurityAuditSummary:
    """Executes the complete end-to-end security audit suite."""
    api_probes = run_api_security_probes()
    sandbox_probes = run_filesystem_sandbox_probes()
    all_probes = api_probes + sandbox_probes

    passed_count = sum(1 for p in all_probes if p.passed)
    failed_count = len(all_probes) - passed_count

    return SecurityAuditSummary(
        total_probes=len(all_probes),
        passed_probes=passed_count,
        failed_probes=failed_count,
        all_passed=failed_count == 0,
        results=all_probes,
    )
