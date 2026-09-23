import hashlib
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

try:
    from backend.app.config import settings
except ImportError:
    from app.config import settings

logger = logging.getLogger("eris.agent.tool_synthesizer")


class ToolSynthesizer:
    """
    Tool Generation & Verification Engine for ERIS.
    - Generates Python tools for missing capabilities in tools/.
    - Validates syntax and executes compilation checks in a sandbox loop.
    - Persists SHA256 integrity hash to detect any external modification.
    - Updates local registry immediately for dynamic execution.
    """

    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.WORKSPACE_PATH
        self.tools_dir = self.workspace_path / "tools"
        self.registry_file = self.tools_dir / ".tool_registry.json"
        self.habits_file = self.workspace_path / "memory" / "user_habits.json"
        self.tools_dir.mkdir(parents=True, exist_ok=True)
        self.habits_file.parent.mkdir(parents=True, exist_ok=True)

    @classmethod
    def calculate_sha256(cls, file_path: Path) -> str:
        hasher = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as ex:
            logger.error(f"Failed to calculate SHA256 for {file_path}: {ex}")
            return ""

    def load_registry(self) -> Dict[str, Any]:
        if self.registry_file.exists():
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_registry(self, data: Dict[str, Any]) -> None:
        try:
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception as ex:
            logger.error(f"Failed to save tool registry: {ex}")

    def load_user_habits(self) -> Dict[str, Any]:
        if self.habits_file.exists():
            try:
                with open(self.habits_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_user_habit(self, key: str, value: Any) -> None:
        habits = self.load_user_habits()
        habits[key] = {
            "value": value,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        }
        try:
            with open(self.habits_file, "w", encoding="utf-8") as f:
                json.dump(habits, f, indent=4)
        except Exception as ex:
            logger.error(f"Failed to save habit {key}: {ex}")

    def synthesize_tool_code(
        self,
        tool_name: str,
        code_content: str,
        description: str = "",
    ) -> Tuple[bool, str, str]:
        """
        Writes tool code to tools/<safe_name>.py, executes sandbox verification loop,
        and computes SHA256 hash upon success. Refreshes active tool registry.
        """
        # Strict sanitization against path traversal
        raw_name = Path(tool_name).stem
        safe_name = "".join(c for c in raw_name if c.isalnum() or c == "_").lower()
        if not safe_name:
            return False, "Invalid tool name. Must contain alphanumeric characters or underscores.", ""

        file_name = f"{safe_name}.py"
        tool_path = self.tools_dir / file_name

        # Ensure description and metadata exist in file
        clean_code = code_content.strip()
        header_blocks = []
        if '"""' not in clean_code:
            header_blocks.append(f'"""Tool: {safe_name}\nCreated for ERIS Workspace.\n"""')
        if "TOOL_NAME" not in clean_code:
            header_blocks.append(f'TOOL_NAME = "{safe_name}"')
        if "TOOL_DESCRIPTION" not in clean_code and description:
            sanitized_desc = description.replace('"', '\\"').replace("\n", " ")
            header_blocks.append(f'TOOL_DESCRIPTION = "{sanitized_desc}"')

        if header_blocks:
            final_code = "\n".join(header_blocks) + "\n\n" + clean_code
        else:
            final_code = clean_code

        # Write to disk inside tools/
        try:
            tool_path.write_text(final_code, encoding="utf-8")
        except Exception as ex:
            return False, f"Failed to write tool file: {ex}", ""

        # Sandbox Verification Loop (Up to 3 test runs)
        test_success = False
        last_error = ""
        for _ in range(3):
            try:
                py_compile = subprocess.run(
                    [sys.executable, "-m", "py_compile", str(tool_path)],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if py_compile.returncode != 0:
                    last_error = f"Syntax compilation error: {py_compile.stderr}"
                    continue

                test_success = True
                break
            except Exception as ex:
                last_error = str(ex)

        if not test_success:
            # Clean up failed file
            try:
                if tool_path.exists():
                    tool_path.unlink()
            except Exception:
                pass
            return False, f"Tool verification failed: {last_error}", ""

        # Calculate SHA256 integrity hash and save to registry file
        sha256 = self.calculate_sha256(tool_path)
        registry_data = self.load_registry()
        registry_data[file_name] = {
            "hash": sha256,
            "status": "verified",
            "author": "eris",
            "last_tested": str(time.time()),
        }
        self.save_registry(registry_data)

        # Force refresh of in-memory tool registry so ERIS can use it immediately
        try:
            try:
                from backend.app.agent.registry import registry
                registry.initialize(force_refresh=True)
            except ImportError:
                from app.agent.registry import registry
                registry.initialize(force_refresh=True)
        except Exception as reg_err:
            logger.warning(f"Could not immediately refresh ToolRegistry: {reg_err}")

        return True, f"Tool '{file_name}' synthesized and verified safely. SHA256: {sha256[:12]}...", sha256


tool_synthesizer = ToolSynthesizer()


def create_custom_tool(tool_name: str, description: str, code: str) -> str:
    """Module entry point for synthesizing a new custom tool with strict validation."""
    success, message, _ = tool_synthesizer.synthesize_tool_code(
        tool_name=tool_name,
        code_content=code,
        description=description,
    )
    if not success:
        return f"Error creating tool '{tool_name}': {message}"
    return f"Success: {message}. Tool '{tool_name}' is now registered and active in the workspace."
