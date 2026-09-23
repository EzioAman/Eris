TOOL_NAME = "create_and_run_greeting"
TOOL_DESCRIPTION = "Creates a greeting script inside the target folder and executes it. Args: folder_path|message"

import os
import subprocess

def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"
    
    parts = args.split("|")
    folder_path = parts[0].strip() if len(parts) > 0 and parts[0].strip() else r"C:\Users\sinha\OneDrive\Desktop\Eris_was_here"
    message = parts[1].strip() if len(parts) > 1 and parts[1].strip() else "Hello Asmit and Anshu!"
    
    os.makedirs(folder_path, exist_ok=True)
    script_path = os.path.join(folder_path, "greet.py")
    
    script_content = f'''print("✨ {message} ✨")
print("Welcome to Eris's special corner! Hope you both are having an absolute blast coding and building amazing things together!")
'''
    
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
        
    try:
        result = subprocess.run(["python", script_path], capture_output=True, text=True, check=True)
        return f"Successfully created and executed script!\nOutput:\n{result.stdout.strip()}"
    except Exception as e:
        return f"Created script at {script_path}, but execution failed: {e}"