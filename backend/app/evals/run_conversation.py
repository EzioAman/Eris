"""
Executable runner for live conversation session evaluation.
Imports run_live_conversation_session from backend.app.evals.
Strictly adheres to modular architecture with no internal function declarations.
"""

import asyncio
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.evals import run_live_conversation_session, ConversationSessionResult

PROMPTS = [
    "Hi, Do u know me?",
]


async def main():
    session_id = f"eval_dev_{int(asyncio.get_event_loop().time() * 1000)}"
    result: ConversationSessionResult = await run_live_conversation_session(
        prompts=PROMPTS,
        session_id=session_id,
        user_id="dev",
        model="gemini/gemini-3-flash-preview",
    )

    print("=== LIVE ERIS MULTI-TURN CONVERSATION RESULT ===")
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
