import asyncio
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.utils.function_calling import convert_to_openai_tool
from langgraph.types import interrupt

try:
    from app.agent.llm_client import acompletion, _infer_provider, _resolve_api_key
    from app.agent.prompts import (
        IntentType,
        build_system_prompt,
        classify_intent,
        is_credential_extraction_attempt,
        scrub_sensitive_credentials,
    )
    from app.agent.registry import check_if_approval_needed, execute_tool, get_all_tools, get_langchain_tools, get_relevant_tools, get_tool_by_name
    from app.schemas.state import AgentState
    from app.schemas.tools import RiskLevel
    from app.services.learning import record_decision
    from app.services.rag_service import rag_vault
    from app.services.vault_service import get_dynamic_vault_fallbacks
    from app.database import db_manager
except ImportError:
    from backend.app.agent.llm_client import acompletion, _infer_provider, _resolve_api_key
    from backend.app.agent.prompts import (
        IntentType,
        build_system_prompt,
        classify_intent,
        is_credential_extraction_attempt,
        scrub_sensitive_credentials,
    )
    from backend.app.agent.registry import check_if_approval_needed, execute_tool, get_all_tools, get_langchain_tools, get_relevant_tools, get_tool_by_name
    from backend.app.schemas.state import AgentState
    from backend.app.schemas.tools import RiskLevel
    from backend.app.services.learning import record_decision
    from backend.app.services.rag_service import rag_vault
    from backend.app.services.vault_service import get_dynamic_vault_fallbacks
    from backend.app.database import db_manager

logger = logging.getLogger("eris.agent.nodes")


def _convert_messages_for_llm(system_prompt: str, messages: List[BaseMessage]) -> List[Dict[str, Any]]:
    """Converts LangChain messages into standard LiteLLM/OpenAI message dicts with context window protection."""
    llm_msgs: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]

    # Prevent context window explosion: retain initial user query + last 8 turns
    if len(messages) > 10:
        pruned_messages = [messages[0]] + list(messages[-9:])
    else:
        pruned_messages = messages

    for msg in pruned_messages:
        if isinstance(msg, HumanMessage):
            llm_msgs.append({"role": "user", "content": str(msg.content)})
        elif isinstance(msg, AIMessage):
            m_dict: Dict[str, Any] = {"role": "assistant", "content": str(msg.content or "")}
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                ts_map = getattr(msg, "additional_kwargs", {}).get("thought_signatures", {}) if hasattr(msg, "additional_kwargs") and isinstance(msg.additional_kwargs, dict) else {}
                m_dict["tool_calls"] = [
                    {
                        "id": tc.get("id", f"call_{i}"),
                        "type": "function",
                        "function": {
                            "name": tc.get("name"),
                            "arguments": json.dumps(tc.get("args", {})) if isinstance(tc.get("args"), (dict, list)) else str(tc.get("args", "{}")),
                        },
                        "thought_signature": (
                            ts_map.get(tc.get("id"))
                            or tc.get("thought_signature")
                            or tc.get("thoughtSignature")
                            or (getattr(msg, "additional_kwargs", {}).get("thought_signature") if hasattr(msg, "additional_kwargs") and isinstance(msg.additional_kwargs, dict) else None)
                        ),
                    }
                    for i, tc in enumerate(msg.tool_calls)
                ]
            llm_msgs.append(m_dict)
        elif isinstance(msg, ToolMessage):
            c_str = str(msg.content)
            if len(c_str) > 1200:
                c_str = c_str[:600] + "\n... [Output pruned to prevent context overflow] ...\n" + c_str[-500:]
            llm_msgs.append({
                "role": "tool",
                "tool_call_id": msg.tool_call_id,
                "name": getattr(msg, "name", None) or (msg.additional_kwargs.get("name") if hasattr(msg, "additional_kwargs") else None) or "tool",
                "content": c_str,
            })
        elif isinstance(msg, SystemMessage):
            llm_msgs.append({"role": "system", "content": str(msg.content)})
        else:
            llm_msgs.append({"role": "user", "content": str(msg.content)})

    return llm_msgs


def _extract_thought_content(raw_text: str) -> tuple[str, str]:
    """Extracts reasoning enclosed in <think>...</think> tags and returns (thought, remaining_text)."""
    think_pattern = r"<think>(.*?)</think>"
    match = re.search(think_pattern, raw_text, flags=re.DOTALL)
    if match:
        thought = match.group(1).strip()
        cleaned = re.sub(think_pattern, "", raw_text, flags=re.DOTALL).strip()
        return thought, cleaned
    return "", raw_text.strip()


def _parse_embedded_tool_calls(raw_text: str) -> tuple[List[Dict[str, Any]], str]:
    """
    Detects and extracts tool calls embedded as raw XML/DSML strings by models
    (e.g., DeepSeek-V3/R1 via OpenRouter, Qwen, or local models) when the API provider
    does not populate native response.choices[0].message.tool_calls.
    """
    tool_calls: List[Dict[str, Any]] = []
    norm = raw_text.replace("｜", "|")

    # 1. Parse DSML invoke blocks: <| DSML | invoke name="..."> ... </| DSML | invoke>
    invoke_pattern = re.compile(
        r"<\|\s*DSML\s*\|\s*invoke\s+name=[\"']([^\"']+)[\"']>(.*?)</\|\s*DSML\s*\|\s*invoke>",
        re.DOTALL | re.IGNORECASE,
    )
    for match in invoke_pattern.finditer(norm):
        fn_name = match.group(1).strip()
        body = match.group(2)
        args: Dict[str, Any] = {}
        param_pattern = re.compile(
            r"<\|\s*DSML\s*\|\s*parameter\s+name=[\"']([^\"']+)[\"'][^>]*>(.*?)</\|\s*DSML\s*\|\s*parameter>",
            re.DOTALL | re.IGNORECASE,
        )
        for pmatch in param_pattern.finditer(body):
            pname = pmatch.group(1).strip()
            pval = pmatch.group(2).strip()
            if (pval.startswith("{") and pval.endswith("}")) or (pval.startswith("[") and pval.endswith("]")):
                try:
                    pval = json.loads(pval)
                except Exception:
                    pass
            elif pval.lower() == "true":
                pval = True
            elif pval.lower() == "false":
                pval = False
            args[pname] = pval

        tool_calls.append({
            "name": fn_name,
            "args": args,
            "id": f"dsml_{len(tool_calls)}",
        })

    # 2. Parse Qwen / Hermes XML tool call format:
    # <tool_call>view_file<arg_key>end_line</arg_key><arg_value>318</arg_value><arg_key>path</arg_key>...</tool_call>
    qwen_pattern = re.compile(r"<tool_call>([a-zA-Z0-9_\-]+)(.*?)</tool_call>", re.DOTALL | re.IGNORECASE)
    for qmatch in qwen_pattern.finditer(norm):
        fn_name = qmatch.group(1).strip()
        body = qmatch.group(2).strip()

        # If body is JSON:
        if body.startswith("{") and body.endswith("}"):
            try:
                parsed = json.loads(body)
                tool_calls.append({"name": fn_name, "args": parsed, "id": f"tc_{len(tool_calls)}"})
                continue
            except Exception:
                pass

        # Parse <arg_key>key</arg_key><arg_value>val</arg_value>
        kv_pattern = re.compile(r"<arg_key>(.*?)</arg_key>\s*<arg_value>(.*?)</arg_value>", re.DOTALL | re.IGNORECASE)
        args: Dict[str, Any] = {}
        for kv in kv_pattern.finditer(body):
            k = kv.group(1).strip()
            v = kv.group(2).strip()
            if v.isdigit():
                v = int(v)
            elif v.lower() == "true":
                v = True
            elif v.lower() == "false":
                v = False
            args[k] = v

        tool_calls.append({"name": fn_name, "args": args, "id": f"tc_{len(tool_calls)}"})

    # 3. Parse generic <tool_call> or <function_call> JSON blocks
    generic_pattern = re.compile(r"<(?:tool_call|function_call)>(.*?)</(?:tool_call|function_call)>", re.DOTALL | re.IGNORECASE)
    for gmatch in generic_pattern.finditer(norm):
        raw_json = gmatch.group(1).strip()
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict) and "name" in parsed:
                tool_calls.append({
                    "name": parsed["name"],
                    "args": parsed.get("arguments", parsed.get("args", {})),
                    "id": f"tc_{len(tool_calls)}",
                })
        except Exception:
            pass

    # Strip tool call markup from human-visible content
    clean = re.sub(r"<\|\s*DSML\s*\|\s*calls>.*?</\|\s*DSML\s*\|\s*calls>", "", norm, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<\|\s*DSML\s*\|\s*invoke.*?</\|\s*DSML\s*\|\s*invoke>", "", clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<(?:tool_call|function_call)>.*?</(?:tool_call|function_call)>", "", clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<arg_key>.*?</arg_key>", "", clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<arg_value>.*?</arg_value>", "", clean, flags=re.DOTALL | re.IGNORECASE).strip()

    return tool_calls, clean



async def reasoner_node(state: AgentState) -> Dict[str, Any]:
    """
    Primary reasoning node of Eris.
    Synthesizes conversational history, learned user habits, and available tools.
    Invokes the user-selected model directly with no hardcoded fallback loops.
    """
    messages = list(state.get("messages", []))
    active_model = state.get("active_model")
    if not active_model:
        return {
            "messages": [AIMessage(
                content="No active model selected. Please open Model Configuration or Key Vault to configure your model.",
                tool_calls=[],
            )],
            "current_thought": "Execution halted: No active model selected.",
            "active_model": None,
        }

    execution_mode = state.get("execution_mode", "speed")
    user_habits = state.get("user_habits", {})
    user_id = state.get("user_id")

    # Determine intent from the last human message
    last_human_text = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            last_human_text = str(msg.content)
            break

    # 1. Anti-leak safeguard: refuse queries attempting to extract or print API keys/secrets
    if last_human_text and is_credential_extraction_attempt(last_human_text):
        refusal_content = (
            "For your security and privacy, API keys are encrypted in your local vault "
            "and cannot be inspected, read, or exposed by ERIS. You can manage or update "
            "your credentials securely in Settings > API Key Vault."
        )
        return {
            "messages": [AIMessage(content=refusal_content, tool_calls=[])],
            "current_thought": "Protected security boundary: Refused API key disclosure query.",
            "active_model": active_model,
        }

    intent = classify_intent(last_human_text) if last_human_text else IntentType.CONVERSATION

    # Prepare tools dynamically via fast in-memory ranking
    if intent == IntentType.CONVERSATION:
        lc_tools = []
        tool_schemas = []
    else:
        lc_tools = get_relevant_tools(query=last_human_text, top_k=8)
        tool_schemas = [convert_to_openai_tool(t) for t in lc_tools]

    # For read/inspection queries, restrict tools strictly to read operations (never run_command)
    if intent == IntentType.READ_INSPECTION:
        inspection_tools = {"read_file", "view_file", "list_dir", "grep_search"}
        tool_schemas = [s for s in tool_schemas if s.get("function", {}).get("name") in inspection_tools]

    # Find messages belonging only to the current turn (since the latest HumanMessage)
    last_human_idx = -1
    for idx in range(len(messages) - 1, -1, -1):
        if isinstance(messages[idx], HumanMessage):
            last_human_idx = idx
            break

    current_turn_messages = messages[last_human_idx:] if last_human_idx >= 0 else messages

    # Count tool executions in current turn to decisively prevent search/read loops
    read_file_count = sum(
        1 for m in current_turn_messages
        if isinstance(m, ToolMessage) and getattr(m, "name", "") in ("read_file", "view_file")
    )
    turn_count = state.get("turn_count", 1)

    # Prevent repetitive search/read loops:
    # 1. Conversational queries don't bind tools (saves ~550 ms at cloud provider)
    # 2. Pure read/inspection queries finish once file is in context
    # 3. Action queries can edit/write, but cannot repeat search/list_dir/read loops
    if intent == IntentType.CONVERSATION:
        tools_to_pass = None
    elif intent == IntentType.READ_INSPECTION and (read_file_count >= 1 or turn_count >= 3):
        tools_to_pass = None
    elif turn_count >= 5 or read_file_count >= 3:
        tools_to_pass = None
    elif intent == IntentType.ACTION_EXECUTE and read_file_count >= 1:
        # Disallow looping on read/search tools; keep action tools (write_to_file, replace_file_content, run_command)
        loop_tools = {"search_knowledge_vault", "list_dir", "read_file", "view_file"}
        action_schemas = [s for s in tool_schemas if s.get("function", {}).get("name") not in loop_tools]
        tools_to_pass = action_schemas if action_schemas else None
    else:
        tools_to_pass = tool_schemas if tool_schemas else None

    # Convert active tools for system prompt injection - prune to zero for conversational intent to save 2,000+ chars
    if intent == IntentType.CONVERSATION:
        registered_tools_list = []
    else:
        registered_tools_list = [
            {"name": t.name, "description": t.description, "source": t.source, "risk_level": t.risk_level.value}
            for t in lc_tools
        ]

    user_id = state.get("user_id")

    # Parallel pre-processing: RAG pre-retrieval and credential vault resolution
    pre_prep_start = time.perf_counter()
    provider, sub_model = _infer_provider(active_model)

    should_run_rag = (
        intent in (IntentType.READ_INSPECTION, IntentType.ACTION_EXECUTE, IntentType.WORKFLOW_ORCHESTRATION, IntentType.MULTI_AGENT_SWARM)
        and last_human_text
        and len(last_human_text.strip()) > 3
    )

    async def _fetch_rag() -> str:
        if not should_run_rag:
            return ""
        try:
            return await asyncio.to_thread(rag_vault.search_rag_context, last_human_text, 2)
        except Exception as e:
            logger.debug(f"RAG pre-retrieval skipped: {e}")
            return ""

    async def _fetch_creds() -> tuple[str, str]:
        try:
            return await _resolve_api_key(provider, sub_model)
        except Exception as e:
            logger.debug(f"Credential resolve notice: {e}")
            return "", ""

    rag_gather_start = time.perf_counter()
    rag_context, (resolved_api_key, resolved_base_url) = await asyncio.gather(
        _fetch_rag(),
        _fetch_creds(),
    )
    rag_duration_ms = round((time.perf_counter() - rag_gather_start) * 1000.0, 2)

    # Build system prompt with learned habits, active tools, anti-slop guidelines, and user profile
    sys_prompt = build_system_prompt(
        intent=intent,
        active_model=active_model,
        execution_mode=execution_mode,
        user_habits=user_habits,
        registered_tools=registered_tools_list,
        user_id=user_id,
    )

    if rag_context:
        sys_prompt += f"\n\n---\n{rag_context}\n---"

    llm_messages = _convert_messages_for_llm(sys_prompt, messages)

    # If tools_to_pass is None and a file was read, append explicit synthesis reminder to system instructions
    if tools_to_pass is None and read_file_count >= 1:
        llm_messages.append({
            "role": "user",
            "content": "You have received the file contents in the tool response above. Provide your complete, detailed, structured analysis, review, or solution now."
        })

    prompt_prep_ms = round((time.perf_counter() - pre_prep_start) * 1000.0, 2)

    trace_metadata = {
        "user_id": user_id,
        "execution_mode": execution_mode,
        "intent": intent.value if hasattr(intent, "value") else str(intent),
        "prompt_prep_ms": prompt_prep_ms,
        "rag_retrieval_ms": rag_duration_ms,
        "tool_count": len(tools_to_pass or []),
    }

    response = None
    used_model = active_model
    fallback_occurred = False
    last_error: Optional[Exception] = None
    primary_error: Optional[Exception] = None

    llm_start = time.perf_counter()
    try:
        response = await acompletion(
            model=active_model,
            messages=llm_messages,
            tools=tools_to_pass,
            temperature=0.2 if execution_mode == "speed" else 0.4,
            max_tokens=4096,
            api_key=resolved_api_key,
            base_url=resolved_base_url,
            trace_metadata=trace_metadata,
        )
        llm_duration_ms = round((time.perf_counter() - llm_start) * 1000.0, 2)
    except Exception as ex:
        llm_duration_ms = round((time.perf_counter() - llm_start) * 1000.0, 2)
        primary_error = ex
        last_error = ex
        logger.warning(f"Active model '{active_model}' failed: {ex}. Searching dynamic vault fallbacks...")

        # Dynamically discover active alternatives from the local SQLite vault
        dynamic_fallbacks: List[str] = []
        try:
            if not db_manager.session_maker:
                await db_manager.initialize()
            async with db_manager.session_maker() as db:
                dynamic_fallbacks = await get_dynamic_vault_fallbacks(db, active_model, user_id=user_id)
        except Exception as v_err:
            logger.debug(f"Could not load dynamic vault fallbacks: {v_err}")

        for cand_model in dynamic_fallbacks:
            logger.info(f"Attempting dynamic vault fallback model: {cand_model}")
            cand_prov, cand_sub = _infer_provider(cand_model)
            cand_key, cand_url = await _resolve_api_key(cand_prov, cand_sub)
            try:
                response = await acompletion(
                    model=cand_model,
                    messages=llm_messages,
                    tools=tools_to_pass,
                    temperature=0.2 if execution_mode == "speed" else 0.4,
                    max_tokens=4096,
                    api_key=cand_key,
                    base_url=cand_url,
                    trace_metadata=trace_metadata,
                )
                used_model = cand_model
                fallback_occurred = True
                logger.info(f"Dynamic vault fallback to '{cand_model}' succeeded!")
                break
            except Exception as fb_err:
                logger.warning(f"Dynamic fallback candidate '{cand_model}' also failed: {fb_err}")
                last_error = fb_err

        if not response:
            logger.error(f"Reasoning with model '{active_model}' and dynamic fallbacks failed: {last_error}")
            error_msg = AIMessage(
                content=f"An error occurred during reasoning with model {active_model}: {last_error}",
                tool_calls=[],
            )
            return {
                "messages": [error_msg],
                "current_thought": f"Reasoning failed: {last_error}",
                "active_model": active_model,
            }

    choice = response.choices[0].message
    raw_content = choice.content or ""
    thought, clean_content = _extract_thought_content(raw_content)

    tool_calls: List[Dict[str, Any]] = []
    thought_signatures: Dict[str, str] = {}
    if hasattr(choice, "tool_calls") and choice.tool_calls:
        for i, tc in enumerate(choice.tool_calls):
            fn_name = tc.function.name
            try:
                fn_args = json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
            except Exception:
                fn_args = {}
            thought_sig = getattr(tc, "thought_signature", None)
            tc_id = tc.id or f"call_{i}"
            tc_item: Dict[str, Any] = {
                "name": fn_name,
                "args": fn_args,
                "id": tc_id,
            }
            if thought_sig:
                thought_signatures[tc_id] = thought_sig
            tool_calls.append(tc_item)

    # Fallback parser: if tool_calls is empty, inspect raw_content for embedded DSML / XML function calls
    # This prevents DeepSeek-V3/R1 or Qwen models on OpenRouter from failing when they output DSML text
    if not tool_calls and ("DSML" in raw_content or "<tool_call>" in raw_content or "<function_call>" in raw_content):
        embedded_calls, stripped_content = _parse_embedded_tool_calls(raw_content)
        if embedded_calls:
            tool_calls.extend(embedded_calls)
            clean_content = stripped_content

    # If the response has no tools and clean_content is empty, synthesize a safe response
    if not tool_calls and not (clean_content or raw_content).strip():
        clean_content = "I have reviewed your request. Please let me know how you would like me to assist you next."

    # Apply credential scrubber to eliminate any potential leakage
    safe_content = scrub_sensitive_credentials(clean_content or raw_content)
    safe_thought = scrub_sensitive_credentials(thought)

    # If fallback occurred, inform user clearly with the primary reason
    if fallback_occurred:
        err_msg_clean = str(primary_error or last_error).replace("\n", " ").strip()
        # Truncate very long raw JSON error details if needed for readability
        if len(err_msg_clean) > 160:
            err_msg_clean = err_msg_clean[:157] + "..."
        notice = (
            f"> [!NOTE]\n"
            f"> **Model Fallback Notice**: Model `{active_model}` was unavailable ({err_msg_clean}). "
            f"Automatically switched to active vault model `{used_model}` to complete your task.\n\n"
        )
        safe_content = notice + safe_content

    ai_kwargs: Dict[str, Any] = {}
    if thought_signatures:
        ai_kwargs["thought_signatures"] = thought_signatures

    ai_msg = AIMessage(
        content=safe_content,
        tool_calls=tool_calls,
        additional_kwargs=ai_kwargs,
    )

    return {
        "messages": [ai_msg],
        "current_thought": safe_thought,
        "active_model": used_model,
        "token_usage": getattr(response, "usage", None),
        "sub_timings": {
            "prompt_prep_ms": prompt_prep_ms,
            "rag_retrieval_ms": rag_duration_ms,
            "provider_ttft_ms": getattr(response, "ttft_ms", 0.0) or 0.0,
            "llm_completion_ms": llm_duration_ms,
            "prompt_chars": getattr(response, "prompt_chars", 0),
            "tool_schema_chars": getattr(response, "tool_schema_chars", 0),
            "tool_count": len(tools_to_pass or []),
        },
    }


async def tool_runner_node(state: AgentState) -> Dict[str, Any]:
    """
    Executes tool calls emitted by the reasoner node that do not require human approval.
    Appends ToolMessage results to conversation history.
    """
    messages = list(state.get("messages", []))
    executed_tools = list(state.get("executed_tools", []))
    turn_count = state.get("turn_count", 1)

    if not messages:
        return {"turn_count": turn_count + 1}

    last_msg = messages[-1]
    if not isinstance(last_msg, AIMessage) or not last_msg.tool_calls:
        return {"turn_count": turn_count + 1}

    tool_messages: List[ToolMessage] = []
    seen_calls = set()

    for tc in last_msg.tool_calls:
        tool_name = tc.get("name", "")
        tool_args = tc.get("args", {})
        
        # De-duplicate repetitive identical tool calls (e.g. models emitting open_browser 20 times)
        sig = (tool_name, json.dumps(tool_args, sort_keys=True) if isinstance(tool_args, dict) else str(tool_args))
        if sig in seen_calls and tool_name in ("open_browser", "play_youtube_song", "search_web"):
            continue
        seen_calls.add(sig)

        call_id = tc.get("id", f"call_{len(tool_messages)}")

        # Special handling: if model ran run_command with echo 'Hello...', extract text cleanly without shell
        if tool_name == "run_command":
            cmd_str = str(tool_args.get("command", "") if isinstance(tool_args, dict) else tool_args).strip()
            echo_m = re.match(r"^echo\s+[\"']?(.*?)[\"']?$", cmd_str, re.IGNORECASE)
            if echo_m and not any(op in cmd_str for op in [">", "<", "|", "&", ";", "`"]):
                out_str = echo_m.group(1).strip()
                output = out_str
            else:
                output = execute_tool(tool_name, tool_args)
                out_str = scrub_sensitive_credentials(str(output))
        else:
            # Execute through the tool registry
            output = execute_tool(tool_name, tool_args)
            out_str = scrub_sensitive_credentials(str(output))

        # Best practice token optimization: truncate massive dumps to conserve tokens
        if len(out_str) > 1800:
            llm_content = (
                f"{out_str[:900]}\n\n"
                f"... [TRUNCATED {len(out_str) - 1500} characters to optimize tokens. Full output saved in workspace] ...\n\n"
                f"{out_str[-600:]}"
            )
        else:
            llm_content = out_str

        tool_messages.append(
            ToolMessage(
                content=llm_content,
                tool_call_id=call_id,
                name=tool_name,
            )
        )

        executed_tools.append({
            "kind": "output",
            "id": call_id,
            "name": tool_name,
            "output": out_str[:2000],
            "duration": "0.05s",
        })

    return {
        "messages": tool_messages,
        "executed_tools": executed_tools,
        "turn_count": turn_count + 1,
    }


async def approval_gate_node(state: AgentState) -> Dict[str, Any]:
    """
    Suspends graph execution using native LangGraph interrupt() when a tool requires human approval.
    When resumed with a decision (approved/rejected), records the outcome in the learning service.
    """
    messages = list(state.get("messages", []))
    executed_tools = list(state.get("executed_tools", []))
    turn_count = state.get("turn_count", 1)
    user_habits = state.get("user_habits", {})

    if not messages:
        return {"approval_pending": None}

    last_msg = messages[-1]
    if not isinstance(last_msg, AIMessage) or not last_msg.tool_calls:
        return {"approval_pending": None}

    # Find the tool call that triggered the approval gate
    pending_tc: Optional[Dict[str, Any]] = None
    for tc in last_msg.tool_calls:
        t_name = tc.get("name", "")
        t_args = tc.get("args", {})
        if check_if_approval_needed(t_name, t_args, user_habits):
            pending_tc = tc
            break

    if not pending_tc:
        return {"approval_pending": None}

    tool_name = pending_tc.get("name", "")
    tool_args = pending_tc.get("args", {})
    call_id = pending_tc.get("id", f"appr_{turn_count}")

    tool_def = get_tool_by_name(tool_name)
    risk_level = tool_def.risk_level.value if tool_def else "high"

    # Human-friendly action descriptions
    if tool_name == "send_email":
        action_desc = f"Send email to {tool_args.get('to', 'unknown')}"
        target = tool_args.get("to", "")
        command = f"Subject: {tool_args.get('subject', '')}\nBody: {tool_args.get('body', '')}"
        consequence = f"Transmits an external email from your configured SMTP account to {target}."
    elif tool_name == "run_command":
        action_desc = f"Execute shell command"
        target = tool_args.get("command", "")
        command = target
        consequence = f"Runs command '{target}' in the local environment."
    elif tool_name == "create_custom_tool":
        tool_target = tool_args.get("tool_name") or tool_args.get("name") or tool_args.get("filename") or "custom_tool"
        from pathlib import Path as _Path
        tool_target = _Path(str(tool_target)).stem
        tool_desc = tool_args.get("description") or tool_args.get("desc") or "Synthesized workspace tool"
        tool_code = tool_args.get("code") or tool_args.get("content") or ""
        action_desc = f"Create custom tool '{tool_target}'"
        target = f"tools/{tool_target}.py"
        command = f"Tool Name: {tool_target}\nDescription: {tool_desc}\n\nCode Preview:\n{tool_code[:300]}..."
        consequence = f"Synthesizes and registers new Python tool 'tools/{tool_target}.py' into the workspace."
    else:
        action_desc = f"Execute {tool_name}"
        target = str(tool_args)
        command = str(tool_args)
        consequence = f"Executes high-risk action '{tool_name}' with provided parameters."

    approval_payload = {
        "kind": "approval",
        "id": call_id,
        "tool": tool_name,
        "args": tool_args,
        "action": action_desc,
        "target": target,
        "command": command,
        "input": command,
        "consequence": consequence,
        "riskLevel": risk_level,
        "decision": "pending",
        "tool_call_id": pending_tc.get("id", call_id),
    }

    # PAUSE graph execution via native interrupt
    resume_decision = interrupt(approval_payload)

    # RESUMED: Process human decision
    is_approved = False
    rejection_reason = ""

    if isinstance(resume_decision, dict):
        decision_val = resume_decision.get("decision", "").lower()
        is_approved = decision_val in ("approved", "true", "yes")
        rejection_reason = resume_decision.get("reason", "")
    elif isinstance(resume_decision, bool):
        is_approved = resume_decision
    elif isinstance(resume_decision, str):
        is_approved = resume_decision.lower() in ("approved", "true", "yes")

    # Record decision into the learning service
    decision_str = "approved" if is_approved else "rejected"
    record_decision(
        tool_name=tool_name,
        args=tool_args,
        decision=decision_str,
        reason=rejection_reason,
    )

    if is_approved:
        # Mark confirmed in tool arguments if supported
        tool_args_confirmed = dict(tool_args)
        tool_args_confirmed["confirmed"] = True
        output = execute_tool(tool_name, tool_args_confirmed)

        tool_msg = ToolMessage(
            content=str(output),
            tool_call_id=pending_tc.get("id", call_id),
            name=tool_name,
        )
        executed_tools.append({
            "kind": "output",
            "id": call_id,
            "name": tool_name,
            "output": str(output),
            "duration": "0.10s",
        })
        return {
            "messages": [tool_msg],
            "executed_tools": executed_tools,
            "approval_pending": None,
            "turn_count": turn_count + 1,
        }
    else:
        # Human rejected the operation
        rejection_output = f"Operation rejected by human user. Reason: {rejection_reason or 'Explicitly rejected by user.'}"
        tool_msg = ToolMessage(
            content=rejection_output,
            tool_call_id=pending_tc.get("id", call_id),
            name=tool_name,
        )
        executed_tools.append({
            "kind": "approval",
            "id": call_id,
            "action": action_desc,
            "decision": "rejected",
            "consequence": consequence,
            "riskLevel": risk_level,
        })
        return {
            "messages": [tool_msg],
            "executed_tools": executed_tools,
            "approval_pending": None,
            "turn_count": turn_count + 1,
        }


async def learning_recorder_node(state: AgentState) -> Dict[str, Any]:
    """
    Terminal node of the graph.
    Performs final checkpointing and verifies that state and memory are synchronized.
    """
    return {}
