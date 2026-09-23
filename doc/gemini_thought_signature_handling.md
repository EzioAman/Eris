# Google Gemini Thought Signature & Multi-Turn Tool Calling Specification

## Overview
In Google Gemini 2.5 and Gemini 3.x models (including `gemini-3.8-flash`, `gemini-3-pro`, `gemini-2.5-flash`, and experimental thinking variants), function calling incorporates a stateful reasoning artifact called `thoughtSignature` (or `thought_signature`).

## The Problem
When Gemini generates a function call, it may emit an encrypted reasoning context token (`thoughtSignature`) preserving its internal reasoning chain.
When the user/client executes the function and returns the result in subsequent turns, the Gemini API enforces strict contract rules:
1. Every previous `functionCall` part in the `model` role must retain its associated `thoughtSignature`.
2. If `thoughtSignature` is missing or stripped, the Gemini API rejects the request with HTTP 400 (`Missing required reasoning state` or `thought_signature must be passed`).
3. If an invalid or unrequested `thoughtSignature` is attached to models that do not support it, the Gemini API rejects the request with HTTP 400 (`unknown field "thoughtSignature"`).
4. If a client attempts to store `thought_signature` as a top-level property of a LangChain `ToolCall` dictionary inside `AIMessage(..., tool_calls=[...])`, LangChain's Pydantic validation throws `TypeError: tool_call() got an unexpected keyword argument 'thought_signature'`, crashing the reasoning node before the reply can be returned.
5. If OpenAI-compatible providers (like OpenRouter, Groq, or OpenAI) receive `thought_signature` inside their standard `tool_calls` dictionary, they reject the message with HTTP 400 invalid parameter errors.

## Solution Architecture

### 1. LangChain Compatibility (`backend/app/agent/nodes.py`)
- `AIMessage.tool_calls` strictly allows only `{'name': str, 'args': dict, 'id': str}`.
- Any model thought signature must be stored in `AIMessage.additional_kwargs["thought_signatures"][call_id]`.
- In `_convert_messages_for_llm`, when rebuilding messages for the next LLM call, the `thought_signature` is safely retrieved from `additional_kwargs["thought_signatures"]` and attached to the internal message dictionary.

### 2. Gemini Native REST Client (`backend/app/agent/llm_client.py`)
- Detect thinking / Gemini 3 models dynamically: matches `gemini-3`, `gemini-2.5`, `thinking`, `thought`, and `reasoning`.
- When constructing `fc_part`:
  - If a valid `thought_signature` was saved from the model turn, attach `fc_part["thoughtSignature"] = thought_sig`.
  - If no `thought_signature` was saved but the model is a Gemini 3 / thinking model, provide the official Google bypass sentinel: `fc_part["thoughtSignature"] = "skip_thought_signature_validator"`.
- Adaptive Error Handling:
  - If the API returns an error indicating `thoughtSignature` is unknown/unexpected, remove it and retry.
  - If the API returns an error indicating `thoughtSignature` is missing/required, inject `"skip_thought_signature_validator"` and retry.

### 3. OpenAI-Compatible Clean Boundary
- In `_call_openai_compatible`, sanitize tool calls sent to third-party providers so extraneous fields like `thought_signature` are stripped from outgoing requests, avoiding 400 schema validation errors.
- On response parsing, extract `thought_signature` if provided in `provider_specific_fields` or `extra_content` to maintain continuity when routing through proxies like OpenRouter.
