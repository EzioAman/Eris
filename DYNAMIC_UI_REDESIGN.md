# Dynamic UI redesign for Eris

## The problem with the current approach

`ChatWorkspace.handleSendMessage` decides what to render (`code-comparison`,
`terminal`, `file-tree`, `media-player`, `safari-preview`, ...) by running a
cascade of regexes over the user's raw text and the tool-call names that came
back (`isExplicitMedia`, `isCodeComparison`, `isFileTreeRequest`, ...). This
is inference *after the fact* — the frontend is guessing what the agent
meant. Downsides:

- Adding a new UI type means adding a new regex and hoping it doesn't collide
  with an existing one (several already have explicit exclusion checks for
  this reason — `!isCodeTask`, `!isPendingApproval`, `!isEmailAction`).
- Only one `templateType` per message — no interleaving of two visuals, or a
  visual next to prose the way Claude does.
- Nothing renders until the whole response is done; there's no "building..."
  state for the visual itself, only for the text stream.

## The shift: agent-declared intent, not text-sniffed intent

Claude's artifacts/tool-cards work because the model's own output *is* the
declaration — a structured tool call, not a pattern in its prose. Porting
that to Eris means three pieces:

### 1. Give the agent a `render_ui` tool (LangGraph / LangChain side)

```python
# tools/render_ui.py
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import Literal, Any

class RenderUIInput(BaseModel):
    component: Literal[
        "code-comparison", "terminal", "file-tree",
        "media-player", "safari-preview", "subagent-chain",
        "ios-preview", "android-preview",
    ] = Field(..., description="Which UI block to show the user.")
    props: dict[str, Any] = Field(..., description="Props for that component.")

@tool("render_ui", args_schema=RenderUIInput)
def render_ui(component: str, props: dict) -> str:
    """Call this whenever showing a visual (a diff, a terminal session,
    a file tree, etc.) would help the user more than describing it in text.
    Do not guess this from keywords in the user's message — call it only
    when you are about to actually show that thing as part of your answer."""
    # This tool has no real side effect; the graph intercepts the call
    # (see step 2) and turns it into a `ui_intent` SSE event instead of
    # feeding a text result back to the model.
    return "rendered"
```

Bind it alongside your existing tools (`run_command`, `write_to_file`, etc.)
and mention it once in the system prompt: *"When your answer includes a
diff, a terminal transcript, a file tree, or similar, call `render_ui`
instead of writing it out as text."*

### 2. Stream it as a distinct SSE event, separately from `chunk`/`action`/`done`

```python
# in your graph's streaming loop, when a render_ui tool call is seen:
yield {
    "type": "ui_intent",
    "id": tool_call_id,
    "component": tool_call.args["component"],
    "props": tool_call.args["props"],
    "status": "ready",   # or "building" if you stream props incrementally
}
```

If a block's props are themselves expensive to compute (e.g. you're still
reading a file for the file-tree), emit `status: "building"` first with
partial/empty props, then a follow-up `ui_intent` with the same `id` and
`status: "ready"` once complete. The frontend skeleton (see below) keys off
`status`, so this gets you a real "building this for you..." state for free.

### 3. Frontend: registry + dispatcher, not a cascade

See `uiBlockRegistry.tsx`. The pieces you'd change in your existing files:

**`chatTypes.ts`** — replace the single-slot fields:
```diff
- templateType?: string;
- templateData?: any;
+ uiBlocks?: UIBlock[];
```

**`ChatWorkspace.tsx`** — delete the entire block from `// 1. Tool execution
inspect` down through `isSafariPreview`/`isIosPreview`/etc. (roughly 150
lines). In the SSE reader's event loop, add one case:
```ts
} else if (ev.type === 'ui_intent') {
  setActiveThinking((prev) => prev); // no-op, or track building blocks here
  accumulatedUIBlocks.push({
    id: ev.id, component: ev.component, props: ev.props, status: ev.status,
  });
}
```
and when building `assistantMsg`, set `uiBlocks: accumulatedUIBlocks` instead
of computing `templateType`/`templateData`.

**`ChatMessageBubble.tsx`** — swap:
```diff
- {msg.templateType && msg.templateData && (
-   <TemplateRenderer type={msg.templateType} data={msg.templateData} .../>
- )}
+ <UIBlockList blocks={msg.uiBlocks} isDarkMode={isDarkMode} />
```

## What this buys you beyond "less regex"

- **Multiple blocks per turn** — e.g. a code diff *and* a terminal run in the
  same answer, in whatever order the agent produced them.
- **Progressive rendering** — a block can appear as a skeleton the instant
  the agent decides to show it, before its content is ready, instead of
  waiting for the whole turn to finish streaming.
- **No accidental firing** — a message that merely *mentions* "terminal" or
  "compare" in passing can never trigger a UI block it didn't ask for, since
  nothing is inferred from the text anymore.
- **Extensibility** — new UI type = one registry entry + one `Literal` value
  in `RenderUIInput`, not a new regex plus exclusion conditions on every
  existing regex to keep them from colliding.

## Migration order (so nothing breaks mid-way)

1. Ship `uiBlockRegistry.tsx` and the `uiBlocks` field alongside the old
   `templateType`/`templateData` fields (don't delete yet) — render both.
2. Add the `render_ui` tool and `ui_intent` SSE event on the backend, but
   leave the old heuristics running as a fallback for any turn where the
   agent doesn't call `render_ui`.
3. Once you see `ui_intent` firing reliably for the cases you care about
   (watch it for a day of real usage), delete the regex cascade and the
   `templateType`/`templateData` fields.
