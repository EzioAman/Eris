TOOL_NAME = "create_desktop_folder"
TOOL_DESCRIPTION = "Creates a folder on the Windows desktop. Args: folder_name"

import os

def execute(args: str = "Eris_was_here") -> str:
    if args == "__test_ping__":
        return "pong"
    
    folder_name = args.strip() if args.strip() else "Eris_was_here"
    
    # Check potential desktop locations on Windows (OneDrive vs standard user profile)
    user_home = os.path.expanduser("~")
    possible_desktops = [
        os.path.join(user_home, "OneDrive", "Desktop"),
        os.path.join(user_home, "Desktop")
    ]
    
    desktop = next((d for d in possible_desktops if os.path.exists(d)), possible_desktops[-1])
    target_path = os.path.join(desktop, folder_name)
    
    try:
        os.makedirs(target_path, exist_ok=True)
        return f"Successfully created folder at: {target_path}"
    except Exception as e:
        return f"Error creating folder: {str(e)}"