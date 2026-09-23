"""
Comprehensive ERIS Full System Mock Test & Workflow Engine Verification
Tests all active endpoints and services against the running backend server (http://127.0.0.1:5174):
1. Preflight Health & Environment
2. Workspace Security & Path Traversal Prevention
3. Sovereign Authentication (Signup -> OTP -> Verify -> Login -> Session)
4. Third-Party Connectors (Google Drive, Gmail, Notion, Slack, GitHub)
5. Dynamic Tool Registry
6. Live Chat & Agent Execution
7. Workflow Pipeline Creation, AST Conditional Branching & Autonomous Execution
"""

import os
import sys
import json
import time
import asyncio
import urllib.request
import urllib.error
import urllib.parse

BASE_URL = "http://127.0.0.1:5174"

def make_request(
    path: str,
    method: str = "GET",
    data: dict = None,
    headers: dict = None,
    expected_status: int = 200,
) -> tuple[int, dict]:
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                parsed = json.loads(content)
            except Exception:
                parsed = {"raw": content}
            return status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"detail": err_body}
        return e.code, parsed
    except Exception as ex:
        return 500, {"error": str(ex)}


def test_system_preflight():
    print("\n--- 1. Testing System Preflight & Health Probes ---")
    
    # 1.1 Health Probe
    status, res = make_request("/api/system/health")
    print(f"GET /api/system/health -> {status}")
    assert status == 200, f"Expected 200, got {status}: {res}"
    print("  ✓ Health Status:", res.get("status"), "| DB:", res.get("database"))

    # 1.2 Check Env
    status, res = make_request("/api/system/check-env")
    print(f"GET /api/system/check-env -> {status}")
    assert status == 200
    print("  ✓ Env Detected:", res.get("hasEnv"))

    # 1.3 System State
    status, res = make_request("/api/system/state")
    print(f"GET /api/system/state -> {status}")
    assert status == 200
    print("  ✓ System State active processes:", res.get("active_processes", 1))


def test_workspace_and_path_traversal():
    print("\n--- 2. Testing Workspace Hierarchy & Path Traversal Shields ---")

    # 2.1 Workspace Tree
    status, res = make_request("/api/workspace/tree")
    print(f"GET /api/workspace/tree -> {status}")
    assert status == 200 and res.get("ok")
    print(f"  ✓ Workspace Tree returned {len(res.get('tree', []))} root nodes")

    # 2.2 Legitimate File Read
    status, res = make_request("/api/workspace/file?path=pyproject.toml")
    print(f"GET /api/workspace/file?path=pyproject.toml -> {status}")
    assert status == 200 and res.get("ok")
    print(f"  ✓ Read {res.get('size')} bytes from pyproject.toml")

    # 2.3 Adversarial Path Traversal Attempt (Must be BLOCKED with 403)
    status, res = make_request("/api/workspace/file?path=../../.env")
    print(f"GET /api/workspace/file?path=../../.env -> {status} (Expected 403 Forbidden)")
    assert status == 403, f"Expected 403, got {status}: {res}"
    print("  ✓ Path traversal securely blocked:", res.get("detail"))


def test_auth_ceremony():
    print("\n--- 3. Testing Sovereign Authentication Flow ---")
    test_email = f"operator_{int(time.time())}@eris.core"
    test_password = "SecurePassword2026!"
    test_name = "Chief Architect"

    # 3.1 Signup
    status, res = make_request(
        "/api/auth/signup",
        method="POST",
        data={"email": test_email, "password": test_password, "name": test_name},
    )
    print(f"POST /api/auth/signup -> {status}")
    assert status == 200 and res.get("ok"), f"Signup failed: {res}"
    print("  ✓ User registered:", test_email)

    # 3.2 Request OTP
    status, res = make_request(
        "/api/auth/request-otp",
        method="POST",
        data={"email": test_email, "name": test_name},
    )
    print(f"POST /api/auth/request-otp -> {status}")
    assert status == 200 and res.get("ok")
    print("  ✓ OTP requested successfully")

    # Fetch OTP from SQLite directly to verify constant-time verify endpoint
    import sqlite3
    import hashlib
    conn = sqlite3.connect("memory/auth.db")
    cur = conn.cursor()
    otp_rows = cur.execute("SELECT code_hash FROM otps WHERE email = ? AND consumed = 0", (test_email,)).fetchall()
    conn.close()
    assert len(otp_rows) > 0, "No OTP row found in memory/auth.db"

    # Find the matching 6-digit plain OTP
    code_hash = otp_rows[0][0]
    plain_code = None
    for i in range(1000000):
        candidate = f"{i:06d}"
        if hashlib.sha256(candidate.encode("utf-8")).hexdigest() == code_hash:
            plain_code = candidate
            break
    assert plain_code is not None, "Failed to resolve plain OTP"
    print(f"  ✓ Resolved OTP code for test verification: {plain_code}")

    # 3.3 Verify OTP
    status, res = make_request(
        "/api/auth/verify-otp",
        method="POST",
        data={"email": test_email, "code": plain_code, "name": test_name},
    )
    print(f"POST /api/auth/verify-otp -> {status}")
    assert status == 200 and res.get("ok"), f"Verify OTP failed: {res}"
    print("  ✓ OTP verified & account activated successfully")

    # 3.4 Verify subsequent password Login
    status, res = make_request(
        "/api/auth/login",
        method="POST",
        data={"email": test_email, "password": test_password},
    )
    print(f"POST /api/auth/login -> {status}")
    assert status == 200 and res.get("ok"), f"Login failed: {res}"
    session = res.get("session", {})
    bearer_token = session.get("token")
    print(f"  ✓ Session issued. Bearer token: {bearer_token[:16]}...")

    # 3.4 Verify Session Status
    status, res = make_request(
        "/api/system/session-status",
        headers={"Authorization": f"Bearer {bearer_token}"},
    )
    print(f"GET /api/system/session-status -> {status}")
    assert status == 200
    print(f"  ✓ Authenticated as: {res.get('email')} (Verified: {res.get('isAuthenticated')})")
    return bearer_token


def test_connectors():
    print("\n--- 4. Testing Third-Party Connectors Engine ---")

    # 4.1 List Connectors
    status, res = make_request("/api/connectors")
    print(f"GET /api/connectors -> {status}")
    assert status == 200 and res.get("ok")
    connectors = res.get("connectors", [])
    print(f"  ✓ Seeded connectors count: {len(connectors)}")
    for c in connectors:
        print(f"    - {c['name']} [{c['category']}]: status={c['status']}")

    # 4.2 Toggle Connector
    target_id = connectors[0]["id"]
    status, res = make_request(f"/api/connectors/{target_id}/toggle", method="POST")
    print(f"POST /api/connectors/{target_id}/toggle -> {status}")
    assert status == 200 and res.get("ok")
    print(f"  ✓ Toggled {target_id}: is_enabled={res.get('is_enabled')}")

    # Toggle back to true
    make_request(f"/api/connectors/{target_id}/toggle", method="POST")

    # 4.3 Test Gateway Reachability
    status, res = make_request(f"/api/connectors/{target_id}/test", method="POST")
    print(f"POST /api/connectors/{target_id}/test -> {status}")
    assert status == 200 and res.get("ok")
    print(f"  ✓ Gateway test response: {res.get('message')} ({res.get('latency_ms')}ms)")


def test_tool_registry():
    print("\n--- 5. Testing Dynamic Tool Registry ---")
    status, res = make_request("/api/tools/list")
    print(f"GET /api/tools/list -> {status}")
    assert status == 200 and res.get("ok")
    tools = res.get("tools", [])
    print(f"  ✓ Registered sovereign tools: {len(tools)}")
    for t in tools[:4]:
        print(f"    - {t.get('name')}: {t.get('description', '')[:50]}...")


def test_chat_interaction():
    print("\n--- 6. Testing Real-Time Chat & Agent Actuation ---")
    chat_payload = {
        "message": "Hello ERIS! What is your current system status and active model?",
        "history": [],
    }
    status, res = make_request("/api/chat/message", method="POST", data=chat_payload)
    print(f"POST /api/chat/message -> {status}")
    assert status == 200 and res.get("ok"), f"Chat failed: {res}"
    print("  ✓ Eris Agent Response Received:")
    reply = res.get("reply", "")
    for line in reply.strip().split("\n")[:4]:
        print(f"    | {line}")


def test_workflow_creation_and_execution():
    print("\n--- 7. Testing Workflow Pipeline Creation, AST Branching & Execution ---")

    # 7.1 Define a Real Operational Workflow: Security Audit & System Guard Pipeline
    custom_wf_id = f"wf-security-sentinel-{int(time.time())}"
    workflow_payload = {
        "id": custom_wf_id,
        "title": "Automated Security Sentinel & Guard Pipeline",
        "description": "Scans workspace tools, verifies AST containment, and dispatches an audit report.",
        "status": "active",
        "nodes": [
            {
                "id": "node-trigger",
                "name": "Audit Trigger",
                "subtitle": "Triggered by manual execution or cron",
                "icon": "spark",
                "category": "trigger",
                "status": "pending",
                "config": {
                    "triggerEvent": "Manual Sentinel Trigger",
                    "outputs": [
                        {"key": "audit.target", "type": "text", "label": "audit.target"},
                        {"key": "audit.severity", "type": "text", "label": "audit.severity"},
                    ],
                },
            },
            {
                "id": "node-ai-classify",
                "name": "AI Threat Evaluator",
                "subtitle": "Inspect tools and evaluate risk level",
                "icon": "ai",
                "category": "ai",
                "status": "pending",
                "config": {
                    "model": "gemini-2.5-pro",
                    "promptTemplate": "Assess workspace environment. Target: {{audit.target}}. Severity: {{audit.severity}}.",
                    "outputs": [
                        {"key": "classification.risk_level", "type": "text", "label": "risk_level"},
                        {"key": "classification.category", "type": "text", "label": "category"},
                        {"key": "classification.confidence", "type": "number", "label": "confidence"},
                    ],
                },
            },
            {
                "id": "node-condition-safe",
                "name": "Is Risk Critical?",
                "subtitle": "Evaluate AST condition safely",
                "icon": "condition",
                "category": "condition",
                "status": "pending",
                "config": {
                    "conditionExpression": "classification.risk_level == 'Critical'",
                    "branchTrue": "Critical Quarantine",
                    "branchFalse": "Normal Sentinel Report",
                },
            },
            {
                "id": "node-report-action",
                "name": "Dispatch Sentinel Report",
                "subtitle": "Record audit logs and notify operator",
                "icon": "slack",
                "category": "action",
                "status": "pending",
                "branchLabel": "Normal Sentinel Report",
                "config": {
                    "channel": "#sentinel-security-audit",
                    "actionDetails": "Security Sentinel Audit Passed. All AST guards active. Zero breaches.",
                    "outputs": [
                        {"key": "report.id", "type": "text", "label": "report.id"},
                        {"key": "report.status", "type": "text", "label": "report.status"},
                    ],
                },
            },
            {
                "id": "node-end",
                "name": "Audit Complete",
                "subtitle": "Log pipeline audit in SQLite memory",
                "icon": "end",
                "category": "end",
                "status": "pending",
                "config": {
                    "actionDetails": "Store run record in SQLite and notify user.",
                },
            },
        ],
    }

    # 7.2 Save Workflow via POST /api/workflows
    status, res = make_request("/api/workflows", method="POST", data=workflow_payload)
    print(f"POST /api/workflows -> {status}")
    assert status == 200 and res.get("ok"), f"Save workflow failed: {res}"
    saved_id = res.get("id")
    print(f"  ✓ Workflow successfully created: {saved_id}")

    # 7.3 Retrieve Saved Workflow via GET /api/workflows/{id}
    status, res = make_request(f"/api/workflows/{saved_id}")
    print(f"GET /api/workflows/{saved_id} -> {status}")
    assert status == 200 and res.get("ok")
    wf_data = res.get("workflow", {})
    assert len(wf_data.get("nodes", [])) == 5
    print(f"  ✓ Verified saved workflow has 5 pipeline nodes")

    # 7.4 Execute the Workflow via POST /api/workflows/{id}/run
    print(f"Executing workflow '{saved_id}' through WorkflowEngine...")
    run_payload = {
        "triggerPayload": {
            "audit.target": "Workspace Tool Registry",
            "audit.severity": "Routine Scan",
        }
    }
    start_t = time.time()
    status, res = make_request(f"/api/workflows/{saved_id}/run", method="POST", data=run_payload)
    elapsed = time.time() - start_t
    print(f"POST /api/workflows/{saved_id}/run -> {status} (Took {elapsed:.2f}s)")
    assert status == 200 and res.get("ok"), f"Workflow execution failed: {res}"
    
    print(f"  ✓ Execution Status: {res.get('status')} in {res.get('duration_ms')}ms")
    print(f"  ✓ Completed Steps: {res.get('steps_completed')} / {res.get('total_steps')}")
    print(f"  ✓ Pipeline Outputs: {res.get('outputs')}")
    print("  ✓ Execution Audit Trail Logs:")
    for log_entry in res.get("logs", []):
        print(f"    {log_entry}")

    # 7.5 Verify Execution Run Recorded in Database via GET /api/workflows/{id}/runs
    status, res = make_request(f"/api/workflows/{saved_id}/runs")
    print(f"GET /api/workflows/{saved_id}/runs -> {status}")
    assert status == 200 and res.get("ok")
    runs = res.get("runs", [])
    assert len(runs) >= 1
    print(f"  ✓ Audit records found: {len(runs)} persistent run(s) saved in DB")

    return True


def run_all_tests():
    print("=================================================================")
    print("🚀 ERIS COMPREHENSIVE END-TO-END MOCK & WORKFLOW TEST SUITE")
    print("   Testing live services on: http://127.0.0.1:5174")
    print("=================================================================")
    test_system_preflight()
    test_workspace_and_path_traversal()
    test_auth_ceremony()
    test_connectors()
    test_tool_registry()
    test_chat_interaction()
    test_workflow_creation_and_execution()
    print("\n=================================================================")
    print("✨ ALL END-TO-END TESTS & WORKFLOW CREATION SUCCEEDED!")
    print("=================================================================")


if __name__ == "__main__":
    run_all_tests()
