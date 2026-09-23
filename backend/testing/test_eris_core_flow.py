import asyncio
import os
import sys

# Ensure root workspace is in sys.path
sys.path.insert(0, os.path.realpath(os.getcwd()))

from eris_cli import ErisCore

async def test_flow():
    eris = ErisCore()
    print("Eris initialized. Active model:", eris.active_model)
    tools = eris.load_dynamic_tools()
    print("Loaded dynamic tools:", list(tools.keys()))
    
    # Test system prompt generation
    prompt = eris.get_system_prompt(query="hello")
    print("System prompt generated, length:", len(prompt))
    
    # Test execute_tool directly
    res = await eris.execute_tool("CALL_TOOL", "create_desktop_folder TestCLI_Folder")
    print("Direct CALL_TOOL result:\n", res)
    
    # Clean up created folder if needed
    import shutil
    desktop = os.path.join(os.path.expanduser("~"), "Desktop", "TestCLI_Folder")
    if os.path.exists(desktop):
        shutil.rmtree(desktop, ignore_errors=True)
        print("Cleaned up test folder.")

if __name__ == "__main__":
    asyncio.run(test_flow())
