TOOL_NAME = "add_dev_rule"
TOOL_DESCRIPTION = "Appends a new rule to the developer directives file."

import os

def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"
    
    rule_text = args.strip() if args else "Always inform user immediately about file path and permission constraints before attempting write operations."
    file_path = "tools/agent_instructions_from_dev.md"
    
    os.makedirs("tools", exist_ok=True)
    
    mode = "a" if os.path.exists(file_path) else "w"
    with open(file_path, mode, encoding="utf-8") as f:
        if mode == "w":
            f.write("# Eris - Permanent Developer Directives\n\n")
        f.write(f"\n- **Proactive Constraint Transparency:** {rule_text}\n")
        
    return f"Successfully added new rule to {file_path}: {rule_text}"
