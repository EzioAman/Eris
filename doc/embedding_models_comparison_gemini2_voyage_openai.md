# Embedding Models Comparative Analysis: Gemini 2 vs Alternatives

## 1. Google Gemini Embedding Generation Overview

Google offers two distinct modern embedding models in the Gemini family:

### 1. Gemini Embedding 001 (`models/gemini-embedding-001`)
- **Modality**: Text-only.
- **Context Window**: Up to 2,048 tokens.
- **Output Dimensions**: Up to 3,072 dimensions, with native Matryoshka Representation Learning (MRL) allowing truncation to 768 or 1,536 dimensions with negligible loss in accuracy.
- **Strengths**: Top-ranked on the MTEB multilingual leaderboard (>100 languages). Highly optimized for code, documentation, and conversational queries. Very cost-efficient.
- **Status**: Generally Available (GA).

### 2. Gemini Embedding 2 (`models/gemini-embedding-2`)
- **Modality**: **Natively Multimodal** (Text, Images, Audio, Video, PDF pages mapped into one unified vector space).
- **Context Window**: 8,192 tokens.
- **Output Dimensions**: Scalable up to 3,072 dimensions via MRL.
- **Strengths**: Interleaved cross-modal retrieval. Allows searching text descriptions against UI screenshots, diagrams, and voice clips.
- **Status**: Available in Preview.

---

## 2. Competitive Landscape Comparison

| Model | Provider | Modality | Output Dims | MTEB Retrieval | Pricing / Cost | Best Use Case in ERIS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gemini-embedding-001`** | Google | Text | 768 / 1536 / 3072 | Top Tier (~67.2) | Low ($0.08 / 1M tok) | Standard workspace text RAG, tool selection, user memory. |
| **`gemini-embedding-2`** | Google | Multimodal | 768 / 1536 / 3072 | Frontier Multimodal | Moderate | Multimodal search: UI screenshots, voice clips, PDF manuals. |
| **`voyage-3-large`** | Voyage AI | Text | 1024 / 2048 | Benchmark Leader | Moderate ($0.12 / 1M tok) | Highest raw retrieval accuracy; requires separate API key. |
| **`voyage-code-2`** | Voyage AI | Code / Text | 1536 | #1 on Code Retrieval | Moderate | Massive codebases and complex AST search. |
| **`text-embedding-3-large`** | OpenAI | Text | 256 / 1024 / 3072 | Battle-tested (~64.6) | Moderate ($0.13 / 1M tok) | General enterprise; requires OpenAI API key. |
| **`fastembed` (`BGE-small-en-v1.5`)** | Local / ONNX | Text | 384 / 768 | Solid local (~58.4) | **$0.00 (Zero API)** | **Offline desktop fallback** when disconnected from internet. |

---

## 3. Evaluation & Recommendation for ERIS

1. **Do you need `gemini-embedding-2`?**:
   - If ERIS is primarily searching markdown docs, tool descriptions, and user chat history, **`gemini-embedding-001` (truncated to 768-D or 1536-D via MRL)** is significantly faster and lower latency.
   - If you plan to introduce multimodal desktop capabilities (e.g., searching screenshot logs, audio clips from voice commands, or PDF attachments), **`gemini-embedding-2`** is the ideal choice.
2. **Key Vendor Optimization**:
   - You already have `GEMINI_API_KEY` wired into `.env.example` and `pyproject.toml`. Sticking with Gemini eliminates the need to sign up for, pay for, and manage a separate Voyage AI or OpenAI account.
3. **Crucial Local Fallback**:
   - Cloud embedding APIs introduce network dependency. If the user is on an airplane or the Gemini API hits a 429 rate limit, embedding generation will fail.
   - Recommendation: Use `fastembed` (running locally on CPU via ONNX) as an automatic, transparent fallback.
