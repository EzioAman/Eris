TOOL_NAME = "change_model"
TOOL_DESCRIPTION = "Updates or retrieves the current model configuration in environment variables or config files. Args: model_name (optional)"

import os

def execute(args: str = "") -> str:
    """Returns result as a string. Handles input parsing and provides intelligent defaults."""
    if args == "__test_ping__":
        return "pong"
        
    env_path = ".env"
    model_name = args.strip()
    
    if not model_name:
        # Just return current model configuration if found in env
        current = os.getenv("ERIS_MODEL", "default")
        return f"Current model setting: {current}. Provide a model name (e.g. 'change_model|gpt-4o') to update."
        
    # Update or append ERIS_MODEL in .env
    env_lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            env_lines = f.readlines()
            
    updated = False
    new_lines = []
    for line in env_lines:
        if line.startswith("ERIS_MODEL="):
            new_lines.append(f"ERIS_MODEL={model_name}\n")
            updated = True
        else:
            new_lines.append(line)
            
    if not updated:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] = new_lines[-1] + "\n"
        new_lines.append(f"ERIS_MODEL={model_name}\n")
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    os.environ["ERIS_MODEL"] = model_name
    return f"Successfully updated model configuration to: {model_name}"