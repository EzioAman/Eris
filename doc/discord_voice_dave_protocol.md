# Discord DAVE Protocol & Discord.py Voice Requirement

## 1. Executive Summary
Discord has deployed **DAVE (Discord Audio & Video End-to-End Encryption)**, an end-to-end encryption protocol for voice calls, channels, and Go Live streams.
As of **March 1, 2026**, Discord enforces DAVE E2EE across all voice connections. Clients and bot applications attempting to connect to Discord voice channels without DAVE support are rejected by the gateway with:
```text
RuntimeError: davey library needed in order to use voice
```

---

## 2. Technical Architecture of DAVE

- **Standard**: WebRTC Encoded Transform API + Messaging Layer Security (MLS) for decentralized key exchange.
- **Payload Encryption**: End-to-end encryption of Opus audio frames before transmission over Discord voice gateways.
- **Python Integration**: `discord.py` (v2.7+) relies on the `davey` package (compiled Rust cryptographic extension with pre-built Windows wheels on PyPI) to perform MLS key agreements and frame transforms.

---

## 3. Dependency Specification

To enable Eris to join and stream voice in Discord channels, the following Python package stack is required:

| Component | Library | Purpose |
| :--- | :--- | :--- |
| **Gateway & Client** | `discord.py >= 2.7.0` | Discord API & WebSocket gateway (Installed) |
| **E2EE Encryption** | `davey >= 0.1.6` | Discord DAVE protocol voice encoder/decoder |
| **Voice Networking** | `PyNaCl >= 1.5.0` | Sodium cryptography for voice transport (Installed) |
| **Audio Codec** | `audioop-lts` | Python 3.13/3.14 audio helper (Installed) |

### Installation Command:
```powershell
uv pip install davey
```

---

## 4. Architectural Resolution for CLI Event Loop Blocking

### The Issue:
In [`eris_cli.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/eris_cli.py), the main REPL loop sat on:
```python
prompt = Prompt.ask(f"\n{user_label} [dim]({short_model})[/dim]")
```
Because `Prompt.ask()` invokes synchronous `input()`, it halted the Python asyncio event loop thread while waiting for keyboard strokes.
When a Discord WebSocket client was instantiated or active on the same thread, its heartbeat task was starved of execution slices, prompting:
```text
WARNING discord.gateway Shard ID None heartbeat blocked for more than 30 seconds.
Loop thread traceback (most recent call last):
  ...
  File "E:\All Projects and Editors\ERIS\Eris_cli.py", line 1204, in main
    prompt = Prompt.ask(...)
    result = input()
```

### The Fix:
1. **Asynchronous CLI Input**:
   [`eris_cli.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/eris_cli.py) line 1204 now uses `asyncio.to_thread`:
   ```python
   prompt = await asyncio.to_thread(Prompt.ask, f"\n{user_label} [dim]({short_model})[/dim]")
   ```
   This offloads console blocking to a worker thread, allowing the main asyncio event loop to tick continuously with zero latency.

2. **Dedicated Background Loop for Discord**:
   In [`tools/join_vc_server.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/tools/join_vc_server.py), the Discord client executes on a dedicated background thread with its own isolated `asyncio.new_event_loop()`, preventing any cross-thread event loop contention.
