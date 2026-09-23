import os
import sys
import json
import http.server
import socketserver
import urllib.parse
import re

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

from auth import AuthEngine
from tool_guardrails import ToolGuardrails
from rag_engine import RAGEngine

PORT = int(os.environ.get("ERIS_BACKEND_PORT", "5174"))
FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
SERVE_DIR = DIST_DIR if os.path.exists(DIST_DIR) else FRONTEND_DIR
auth = AuthEngine()
rag = RAGEngine()

class ErisServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)


    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. API: System State
        if parsed.path == "/api/system/state":
            mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
            active_model = "gemini/gemini-3.5-flash-lite"
            execution_mode = "speed"
            current_user = None
            user_display_name = None
            current_emotion = "idle"
            ui_preferences = {
                "density": "standard",
                "accent": "violet",
                "show_file_tree": True,
                "show_activity_logs": True
            }

            if os.path.exists(mem_file):
                try:
                    with open(mem_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        active_model = data.get("active_model", active_model)
                        execution_mode = data.get("execution_mode", execution_mode)
                        current_user = data.get("current_user", current_user)
                        user_display_name = data.get("user_display_name", current_user.split("@")[0] if current_user else "Explorer")
                        current_emotion = data.get("current_emotion", current_emotion)
                        ui_preferences = data.get("ui_preferences", ui_preferences)
                except Exception:
                    pass

            tools_dir = os.path.join(WORKSPACE_DIR, "tools")
            tools = []
            if os.path.exists(tools_dir):
                for f in os.listdir(tools_dir):
                    if f.endswith(".py") and not f.startswith((".", "_")):
                        p = os.path.join(tools_dir, f)
                        try:
                            with open(p, "r", encoding="utf-8", errors="ignore") as tf:
                                code = tf.read()
                            name_match = re.search(r'TOOL_NAME\s*=\s*["\']([^"\']+)["\']', code)
                            desc_match = re.search(r'TOOL_DESCRIPTION\s*=\s*["\']([^"\']+)["\']', code)
                            t_name = name_match.group(1) if name_match else f[:-3]
                            t_desc = desc_match.group(1) if desc_match else "Custom tool"
                            tools.append({"name": t_name, "file": f, "description": t_desc})
                        except Exception:
                            pass

            emotion_colors = {
                "idle": "#8B5CF6",
                "thinking": "#38BDF8",
                "working": "#F59E0B",
                "success": "#10B981",
                "error": "#F43F5E",
                "listening": "#06B6D4",
                "amused": "#EC4899",
                "curious": "#14B8A6"
            }

            self._send_json({
                "ok": True,
                "active_model": active_model,
                "execution_mode": execution_mode,
                "current_user": current_user,
                "user_display_name": user_display_name,
                "is_authenticated": bool(current_user),
                "current_emotion": current_emotion,
                "emotion_ring_color": emotion_colors.get(current_emotion, "#8B5CF6"),
                "ui_preferences": ui_preferences,
                "tools_count": len(tools),
                "tools": tools,
                "platform": sys.platform
            })
            return

        # 2. API: Registered Tools List
        elif parsed.path == "/api/tools/list":
            tools_dir = os.path.join(WORKSPACE_DIR, "tools")
            tools = []
            if os.path.exists(tools_dir):
                for f in os.listdir(tools_dir):
                    if f.endswith(".py") and not f.startswith((".", "_")):
                        p = os.path.join(tools_dir, f)
                        try:
                            with open(p, "r", encoding="utf-8", errors="ignore") as tf:
                                code = tf.read()
                            name_match = re.search(r'TOOL_NAME\s*=\s*["\']([^"\']+)["\']', code)
                            desc_match = re.search(r'TOOL_DESCRIPTION\s*=\s*["\']([^"\']+)["\']', code)
                            t_name = name_match.group(1) if name_match else f[:-3]
                            t_desc = desc_match.group(1) if desc_match else "Custom tool"
                            g_ok, issues, _ = ToolGuardrails.audit_tool_code(code)
                            tools.append({
                                "name": t_name,
                                "file": f,
                                "description": t_desc,
                                "guardrail_passed": g_ok,
                                "issues": issues,
                                "code": code
                            })
                        except Exception:
                            pass
            self._send_json({"ok": True, "tools": tools})
            return

        # 3. API: Workspace File Tree (Recursive Magic UI file-tree backend)
        elif parsed.path == "/api/workspace/tree":
            def build_tree_node(rel_path, abs_path):
                if not os.path.exists(abs_path):
                    return None
                name = os.path.basename(abs_path)
                if os.path.isdir(abs_path):
                    children = []
                    try:
                        items = sorted(
                            os.listdir(abs_path),
                            key=lambda x: (not os.path.isdir(os.path.join(abs_path, x)), x.lower())
                        )
                        for item in items:
                            if not (item.startswith(".") or item == "__pycache__"):
                                sub_abs = os.path.join(abs_path, item)
                                sub_rel = f"{rel_path}/{item}" if rel_path else item
                                sub_node = build_tree_node(sub_rel, sub_abs)
                                if sub_node:
                                    children.append(sub_node)
                    except Exception:
                        pass
                    return {
                        "name": name,
                        "is_dir": True,
                        "path": rel_path,
                        "children": children
                    }
                else:
                    try:
                        size_bytes = os.path.getsize(abs_path)
                    except Exception:
                        size_bytes = 0
                    return {
                        "name": name,
                        "is_dir": False,
                        "path": rel_path,
                        "size": size_bytes
                    }

            tree = []
            target_dirs = ["tools", "memory", "doc", "src"]
            for d in target_dirs:
                dp = os.path.join(WORKSPACE_DIR, d)
                if os.path.exists(dp):
                    node = build_tree_node(d, dp)
                    if node:
                        tree.append(node)
            self._send_json({"ok": True, "tree": tree})
            return

        # 4. API: Workspace File Content Preview (Magic UI File Tree Inspector)
        elif parsed.path == "/api/workspace/file":
            query_params = urllib.parse.parse_qs(parsed.query)
            file_path = query_params.get("path", [""])[0].lstrip("/\\")
            
            # Anti-path-traversal check: must stay strictly within workspace
            normalized = os.path.normpath(os.path.join(WORKSPACE_DIR, file_path))
            if not normalized.startswith(WORKSPACE_DIR) or ".." in file_path:
                self._send_json({"ok": False, "error": "Access denied: Path outside workspace."}, status_code=403)
                return

            if not os.path.exists(normalized) or os.path.isdir(normalized):
                self._send_json({"ok": False, "error": "File not found."}, status_code=404)
                return

            try:
                size_bytes = os.path.getsize(normalized)
                # Read text files safely (truncate preview at 64KB)
                with open(normalized, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(65536)
                lines = content.count("\n") + 1
                self._send_json({
                    "ok": True,
                    "path": file_path,
                    "size": size_bytes,
                    "lines": lines,
                    "content": content
                })
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, status_code=500)
            return

        # 5. API: System Subsystem Health Check
        elif parsed.path == "/api/system/health":
            auth_db_path = getattr(auth, "db_path", os.path.join(WORKSPACE_DIR, "memory", "auth.db"))
            auth_ok = os.path.exists(auth_db_path)

            rag_db_path = getattr(rag, "db_path", os.path.join(WORKSPACE_DIR, "memory", "rag_vault.db"))
            rag_ok = os.path.exists(rag_db_path) or os.path.exists(os.path.join(WORKSPACE_DIR, "memory"))

            sandbox_supported = ToolGuardrails.is_supported()

            tools_dir = os.path.join(WORKSPACE_DIR, "tools")
            tools_count = 0
            if os.path.exists(tools_dir):
                tools_count = len([f for f in os.listdir(tools_dir) if f.endswith(".py") and not f.startswith((".", "_"))])

            has_llm = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))

            self._send_json({
                "ok": True,
                "status": "nominal" if (auth_ok and sandbox_supported) else "degraded",
                "subsystems": {
                    "auth": {
                        "name": "Identity & Keystore",
                        "status": "online" if auth_ok else "initializing",
                        "database": "auth.db",
                        "target": "Local SQLite Vault"
                    },
                    "rag": {
                        "name": "Neural RAG Vault",
                        "status": "online" if rag_ok else "initializing",
                        "database": "rag_vault.db",
                        "target": "Vector Context Store"
                    },
                    "llm": {
                        "name": "Model Provider",
                        "status": "online" if has_llm else "standby",
                        "target": "Gemini / Ollama Local Core"
                    },
                    "sandbox": {
                        "name": "Win32 Sandbox",
                        "status": "online" if sandbox_supported else "degraded",
                        "target": "Process Isolation & AST Guardrails"
                    },
                    "tools": {
                        "name": "Tool Registry",
                        "status": "online",
                        "count": tools_count,
                        "target": f"{tools_count} Registered Guardrailed Tools"
                    }
                }
            })
            return

        req_path = parsed.path.lstrip("/\\")
        file_target = os.path.join(SERVE_DIR, req_path)
        if not os.path.exists(file_target) or os.path.isdir(file_target):
            self.path = "/index.html"

        super().do_GET()


    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        # 1. API: Request OTP
        if parsed.path == "/api/auth/request-otp":
            email = payload.get("email", "")
            ok, msg, _ = auth.request_otp(email, send_email=True)
            self._send_json({"ok": ok, "message": msg})
            return

        # 2. API: Verify OTP
        elif parsed.path == "/api/auth/verify-otp":
            email = payload.get("email", "")
            code = payload.get("code", "")
            name = payload.get("name", "").strip()
            ok, msg, session = auth.verify_otp(email, code)
            if ok and session:
                # Update memory.json
                mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
                if os.path.exists(mem_file):
                    try:
                        with open(mem_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        data["current_user"] = session["email"]
                        data["session_token"] = session["token"]
                        if name:
                            data["user_display_name"] = name
                        elif "user_display_name" not in data:
                            data["user_display_name"] = session["email"].split("@")[0]
                        with open(mem_file, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=4)
                    except Exception:
                        pass
            self._send_json({"ok": ok, "message": msg, "session": session})
            return

        # 3. API: Revoke Session
        elif parsed.path == "/api/auth/logout":
            token = payload.get("token", "")
            revoked = auth.revoke_session(token)
            mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
            if os.path.exists(mem_file):
                try:
                    with open(mem_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    data.pop("current_user", None)
                    data.pop("session_token", None)
                    with open(mem_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=4)
                except Exception:
                    pass
            self._send_json({"ok": revoked})
            return

        # 4. API: Execution Mode Switch (Speed vs Accuracy)
        elif parsed.path == "/api/system/mode":
            mode = payload.get("mode", "speed").lower()
            if mode in ("speed", "accuracy"):
                mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
                if os.path.exists(mem_file):
                    try:
                        with open(mem_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        data["execution_mode"] = mode
                        with open(mem_file, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=4)
                    except Exception:
                        pass
                self._send_json({"ok": True, "mode": mode})
            else:
                self._send_json({"ok": False, "message": "Invalid mode. Choose 'speed' or 'accuracy'."})
            return

        # 5. API: Switch Eris Emotion State
        elif parsed.path == "/api/system/emotion":
            emotion = payload.get("emotion", "idle").lower()
            valid_emotions = ["idle", "thinking", "working", "success", "error", "listening", "amused", "curious"]
            if emotion in valid_emotions:
                mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
                if os.path.exists(mem_file):
                    try:
                        with open(mem_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        data["current_emotion"] = emotion
                        with open(mem_file, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=4)
                    except Exception:
                        pass
                emotion_colors = {
                    "idle": "#8B5CF6",
                    "thinking": "#38BDF8",
                    "working": "#F59E0B",
                    "success": "#10B981",
                    "error": "#F43F5E",
                    "listening": "#06B6D4",
                    "amused": "#EC4899",
                    "curious": "#14B8A6"
                }
                self._send_json({
                    "ok": True,
                    "emotion": emotion,
                    "ring_color": emotion_colors.get(emotion, "#8B5CF6"),
                    "status_label": f"ERIS · {emotion.upper()}"
                })
            else:
                self._send_json({"ok": False, "message": f"Invalid emotion. Choose one of: {', '.join(valid_emotions)}"})
            return

        # 6. API: Save UI Preferences (Customizable Dashboard)
        elif parsed.path == "/api/system/preferences":
            prefs = payload.get("preferences", {})
            mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
            if os.path.exists(mem_file):
                try:
                    with open(mem_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    current_prefs = data.get("ui_preferences", {})
                    current_prefs.update(prefs)
                    data["ui_preferences"] = current_prefs
                    with open(mem_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=4)
                except Exception:
                    pass
            self._send_json({"ok": True, "preferences": prefs})
            return

        # 7. API: Tool Guardrail Audit & Creator
        elif parsed.path == "/api/tools/validate":
            code = payload.get("code", "")
            passed, issues, template = ToolGuardrails.audit_tool_code(code)
            self._send_json({
                "ok": True,
                "passed": passed,
                "issues": issues,
                "suggested_template": template
            })
            return

        # 8. API: Dispatch Agent Goal / Task (With Session Validation)
        elif parsed.path == "/api/agent/dispatch":
            # Check authentication via cryptographic session token
            token = payload.get("token") or self.headers.get("Authorization", "").replace("Bearer ", "").strip()
            session = auth.get_session(token)

            if not session:
                self._send_json({
                    "ok": False,
                    "error": "Authentication required. Please sign in before dispatching autonomous agent missions."
                }, status_code=401)
                return

            target_agent = payload.get("agent", "researcher")
            goal = payload.get("goal", "")
            # Return immediate acknowledgment with task dispatch status
            self._send_json({
                "ok": True,
                "agent": target_agent,
                "goal": goal,
                "user": session["email"],
                "status": "active",
                "message": f"Eris ❖ Dispatched task to [{target_agent.upper()}]. Processing with Agentic RAG..."
            })
            return

        # 9. API: Verify Active Session & User Workspace State
        elif parsed.path == "/api/auth/session":
            token = payload.get("token", "")
            session = auth.get_session(token) if token else None
            mem_file = os.path.join(WORKSPACE_DIR, "memory", "memory.json")
            configured = False
            user_display_name = ""
            if os.path.exists(mem_file):
                try:
                    with open(mem_file, "r", encoding="utf-8") as f:
                        m_data = json.load(f)
                    configured = bool(m_data.get("workspace_path") or m_data.get("execution_mode"))
                    user_display_name = m_data.get("user_display_name", "")
                except Exception:
                    pass

            if session:
                self._send_json({
                    "ok": True,
                    "authenticated": True,
                    "session": session,
                    "configured": configured,
                    "user_display_name": user_display_name or session.get("email", "").split("@")[0]
                })
            else:
                self._send_json({
                    "ok": False,
                    "authenticated": False,
                    "configured": configured,
                    "session": None
                })
            return

        self.send_error(404, "Endpoint not found")

    def _send_json(self, data: dict, status_code: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def main():
    print(f"❖ ERIS Cybernetic Interface Server starting on http://localhost:{PORT}")
    with ReusableTCPServer(("", PORT), ErisServerHandler) as httpd:
        print(f"✓ Serving UI from: {SERVE_DIR}")
        print(f"✓ Auth API active with Gmail SMTP pipeline")

        print(f"✓ System State, Guardrail & Agent Dispatch APIs Online")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    main()
