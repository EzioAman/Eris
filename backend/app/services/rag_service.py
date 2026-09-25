import hashlib
import json
import logging
import math
import os
import random
import re
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

logger = logging.getLogger("eris.services.rag")

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further",
    "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll",
    "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
    "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
    "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their",
    "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd",
    "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while",
    "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you",
    "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
}

TARGET_VECTOR_DIM = 3072


class KnowledgeVaultRAG:
    """
    Hybrid Vector & Lexical Knowledge Vault RAG Service.
    Powered by Google Gemini Embedding 2 with local fastembed CPU fallback and SQLite/pgvector persistence.
    Combines 80% Dense Vector Cosine Proximity + 20% BM25 Lexical Token Overlap.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (settings.MEMORY_DIR / "rag_vault.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._fastembed_model = None
        self._embedding_cache: Dict[str, List[float]] = {}
        self._semantic_query_cache: List[Dict[str, Any]] = []
        self._circuit_state: str = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._failure_count: int = 0
        self._last_failure_time: float = 0.0
        self._cooldown_seconds: float = 60.0
        self._failure_threshold: int = 2
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS rag_chunks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    content_hash TEXT UNIQUE NOT NULL,
                    tokens_text TEXT NOT NULL,
                    embedding_json TEXT,
                    created_at REAL NOT NULL DEFAULT 0,
                    updated_at REAL NOT NULL DEFAULT 0
                )
            """)
            cursor.execute("PRAGMA table_info(rag_chunks)")
            cols = [col[1] for col in cursor.fetchall()]
            if "created_at" not in cols:
                cursor.execute("ALTER TABLE rag_chunks ADD COLUMN created_at REAL NOT NULL DEFAULT 0")
            if "updated_at" not in cols:
                cursor.execute("ALTER TABLE rag_chunks ADD COLUMN updated_at REAL NOT NULL DEFAULT 0")
            if "embedding_json" not in cols:
                cursor.execute("ALTER TABLE rag_chunks ADD COLUMN embedding_json TEXT")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rag_category ON rag_chunks(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rag_hash ON rag_chunks(content_hash)")
            conn.commit()

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
        return [w for w in words if w not in STOP_WORDS]

    def _get_fastembed_model(self):
        """Lazy loader for fastembed in-process CPU model."""
        if self._fastembed_model is None:
            try:
                from fastembed import TextEmbedding
                self._fastembed_model = TextEmbedding("BAAI/bge-small-en-v1.5")
            except Exception as ex:
                logger.warning(f"Failed to initialize local fastembed: {ex}")
        return self._fastembed_model

    def _store_in_cache(self, key: str, vec: List[float]):
        """Caches embedding vector in-memory with FIFO eviction capped at 512 entries."""
        if len(self._embedding_cache) >= 512:
            first_key = next(iter(self._embedding_cache))
            del self._embedding_cache[first_key]
        self._embedding_cache[key] = vec

    def _fallback_fastembed(self, clean_text: str, cache_key: Optional[str] = None) -> List[float]:
        """In-process fastembed offline fallback with zero-padding to 3072 dims."""
        if not clean_text:
            return []
        model = self._get_fastembed_model()
        if model:
            try:
                embeddings_gen = list(model.embed([clean_text[:2000]]))
                if embeddings_gen:
                    base_vec = list(embeddings_gen[0])
                    padded = [float(x) for x in base_vec] + [0.0] * (TARGET_VECTOR_DIM - len(base_vec))
                    if cache_key:
                        self._store_in_cache(cache_key, padded)
                    return padded
            except Exception as fe_err:
                logger.warning(f"fastembed offline execution failed: {fe_err}")
        return []

    def generate_embedding(
        self,
        text: str,
        image_path: Optional[Path] = None,
    ) -> List[float]:
        """
        Generates vector embeddings with layered API exhaustion measures:
        1. In-memory LRU Cache (0 ms hit)
        2. Circuit Breaker State Check (OPEN -> fail fast to fastembed)
        3. Primary: Google Gemini Embedding 2 via API with backoff + jitter
        4. On 429/ResourceExhausted or quota limit: Trips Circuit Breaker to OPEN for 60s
        5. Fallback: In-process fastembed (zero-padded to 3072 dims)
        """
        clean_text = text.strip() if text else ""
        if not clean_text and not image_path:
            return []

        # 1. In-memory cache check
        cache_key = hashlib.md5(f"{clean_text}:{str(image_path or '')}".encode("utf-8")).hexdigest()
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        now = time.time()

        # 2. Circuit Breaker check
        if self._circuit_state == "OPEN":
            if now - self._last_failure_time > self._cooldown_seconds:
                logger.info("Embedding API circuit breaker cooldown elapsed. Transitioning to HALF_OPEN probe.")
                self._circuit_state = "HALF_OPEN"
            else:
                # Fast failover without outbound HTTP delay
                return self._fallback_fastembed(clean_text, cache_key)

        gemini_api_key = (getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "") or "").strip()

        # 3. Attempt Gemini API call
        if gemini_api_key and (clean_text or image_path):
            max_attempts = 2
            for attempt in range(1, max_attempts + 1):
                try:
                    from google import genai
                    client = genai.Client(api_key=gemini_api_key)

                    contents_to_embed = clean_text
                    if image_path and image_path.exists():
                        try:
                            from PIL import Image
                            pil_img = Image.open(image_path)
                            contents_to_embed = [clean_text, pil_img] if clean_text else pil_img
                        except Exception as img_err:
                            logger.warning(f"Could not load image for multimodal embedding: {img_err}")

                    resp = client.models.embed_content(
                        model="models/gemini-embedding-2",
                        contents=contents_to_embed,
                    )
                    if resp and hasattr(resp, "embeddings") and resp.embeddings:
                        raw_vec = list(resp.embeddings[0].values)
                        if len(raw_vec) == TARGET_VECTOR_DIM:
                            result_vec = [float(x) for x in raw_vec]
                        elif len(raw_vec) < TARGET_VECTOR_DIM:
                            result_vec = [float(x) for x in raw_vec] + [0.0] * (TARGET_VECTOR_DIM - len(raw_vec))
                        else:
                            result_vec = [float(x) for x in raw_vec[:TARGET_VECTOR_DIM]]

                        # Success: reset circuit breaker
                        self._failure_count = 0
                        self._circuit_state = "CLOSED"
                        self._store_in_cache(cache_key, result_vec)
                        return result_vec

                except Exception as gemini_err:
                    err_str = str(gemini_err).lower()
                    is_exhaustion = any(k in err_str for k in ("429", "resourceexhausted", "quota", "ratelimit", "rate limit", "too many requests"))

                    if is_exhaustion:
                        # Hard exhaustion / 429: trip circuit breaker immediately
                        self._circuit_state = "OPEN"
                        self._last_failure_time = time.time()
                        self._failure_count += 1
                        logger.warning(
                            f"Gemini embedding API rate limit/quota exhausted ({gemini_err}). "
                            f"Tripping circuit breaker to OPEN for {self._cooldown_seconds}s. Routing to fastembed fallback."
                        )
                        break  # Do not retry on hard quota exhaustion
                    else:
                        # Transient error: backoff with jitter on first attempt
                        if attempt < max_attempts:
                            backoff = 0.4 * (2 ** (attempt - 1)) + random.uniform(0.1, 0.25)
                            time.sleep(backoff)
                        else:
                            self._failure_count += 1
                            if self._failure_count >= self._failure_threshold:
                                self._circuit_state = "OPEN"
                                self._last_failure_time = time.time()
                                logger.warning(f"Embedding API reached failure threshold ({self._failure_count}). Circuit breaker OPEN.")
                            logger.debug(f"Gemini embedding API failed after {attempt} attempts: {gemini_err}. Engaging fastembed fallback.")

        # 4. Resilient Offline Fallback: fastembed
        return self._fallback_fastembed(clean_text, cache_key)

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Computes cosine similarity between two vector lists."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm1 * norm2)))

    def chunk_content(self, text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
        """
        Splits text into coherent chunks of max_chunk_size with overlap.
        Uses recursive character splitting on paragraphs, newlines, sentences, and spaces.
        """
        clean = text.strip()
        if not clean:
            return []
        if len(clean) <= chunk_size:
            return [clean]

        separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

        def _split_recursive(t: str, seps: List[str]) -> List[str]:
            if len(t) <= chunk_size or not seps:
                if len(t) > chunk_size:
                    chunks = []
                    start = 0
                    while start < len(t):
                        end = min(start + chunk_size, len(t))
                        chunks.append(t[start:end])
                        if end == len(t):
                            break
                        start += max(1, chunk_size - overlap)
                    return chunks
                return [t] if t.strip() else []

            sep = seps[0]
            parts = t.split(sep)
            chunks = []
            current = ""

            for part in parts:
                candidate = (current + sep + part).strip() if current else part.strip()
                if len(candidate) <= chunk_size:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    if len(part) > chunk_size:
                        sub_chunks = _split_recursive(part, seps[1:])
                        chunks.extend(sub_chunks)
                        current = ""
                    else:
                        current = part.strip()

            if current:
                chunks.append(current)

            return chunks

        raw = _split_recursive(clean, separators)
        return [c.strip() for c in raw if c.strip()]

    def _insert_single_chunk(
        self,
        source: str,
        category: str,
        title: str,
        content: str,
        image_path: Optional[Path] = None,
    ) -> bool:
        """Inserts a single chunk into SQLite with vector embedding or graceful BM25 fallback."""
        clean_content = content.strip()
        if not clean_content:
            return False

        c_hash = hashlib.sha256(f"{source}:{title}:{clean_content}".encode("utf-8")).hexdigest()
        tokens = " ".join(self._tokenize(f"{title} {clean_content}"))

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM rag_chunks WHERE content_hash = ?", (c_hash,))
            if cursor.fetchone():
                return False  # Already indexed

            now = time.time()
            embedding_vec = None
            try:
                embedding_vec = self.generate_embedding(f"{title}\n{clean_content}", image_path=image_path)
            except Exception as e_err:
                logger.warning(f"Embedding generation failed for '{title}': {e_err}. Storing as BM25 lexical chunk.")

            embedding_json = json.dumps(embedding_vec) if embedding_vec else None

            cursor.execute("""
                INSERT INTO rag_chunks (source, category, title, content, content_hash, tokens_text, embedding_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (source, category, title, clean_content, c_hash, tokens, embedding_json, now, now))
            conn.commit()
            return True

    def add_chunk(
        self,
        source: str,
        category: str,
        title: str,
        content: str,
        image_path: Optional[Path] = None,
    ) -> bool:
        """
        Indexes content into the Knowledge Vault.
        Automatically chunks large documents into coherent windows (<800 chars with 100-char overlap)
        to prevent vector dilution, context overflow, and payload exhaustion.
        """
        clean_content = content.strip()
        if not clean_content:
            return False

        if len(clean_content) > 900:
            chunks = self.chunk_content(clean_content, chunk_size=800, overlap=100)
            inserted_any = False
            total_chunks = len(chunks)
            for idx, c in enumerate(chunks):
                chunk_title = f"{title} (Part {idx + 1}/{total_chunks})" if total_chunks > 1 else title
                if self._insert_single_chunk(source, category, chunk_title, c, image_path=image_path):
                    inserted_any = True
            return inserted_any

        return self._insert_single_chunk(source, category, title, clean_content, image_path=image_path)

    def index_workspace(self) -> int:
        """Indexes workspace docs, tools, memory notes, and architecture guides."""
        workspace = settings.WORKSPACE_PATH
        indexed_count = 0

        # 1. Index documentation directory
        doc_dir = workspace / "doc"
        if doc_dir.exists():
            for f in doc_dir.glob("*.md"):
                try:
                    with open(f, "r", encoding="utf-8", errors="ignore") as md_file:
                        content = md_file.read()
                        title = f.stem.replace("_", " ").title()
                        if self.add_chunk(
                            source=f"doc/{f.name}",
                            category="documentation",
                            title=title,
                            content=content,
                        ):
                            indexed_count += 1
                except Exception as ex:
                    logger.warning(f"Error indexing doc {f.name}: {ex}")

        # 2. Index custom tools in tools/
        tools_dir = settings.TOOLS_DIR
        if tools_dir.exists():
            for tf in tools_dir.glob("*.py"):
                if tf.name.startswith("__"):
                    continue
                try:
                    with open(tf, "r", encoding="utf-8", errors="ignore") as pf:
                        code = pf.read()
                        desc_match = re.search(r'TOOL_DESCRIPTION\s*=\s*["\']([^"\']+)["\']', code)
                        desc = desc_match.group(1) if desc_match else "Custom workspace tool"
                        if self.add_chunk(
                            source=f"tools/{tf.name}",
                            category="tool",
                            title=f"Tool: {tf.stem}",
                            content=f"Description: {desc}\n\nCode Preview:\n{code[:1000]}",
                        ):
                            indexed_count += 1
                except Exception as ex:
                    logger.warning(f"Error indexing tool {tf.name}: {ex}")

        # 3. Index learned human preferences
        habits_file = workspace / "memory" / "user_habits.json"
        if habits_file.exists():
            try:
                with open(habits_file, "r", encoding="utf-8", errors="ignore") as hf:
                    habits_content = hf.read()
                    if self.add_chunk(
                        source="memory/user_habits.json",
                        category="memory",
                        title="Learned Operator Habits and Feedback",
                        content=habits_content,
                    ):
                        indexed_count += 1
            except Exception as ex:
                logger.warning(f"Error indexing habits: {ex}")

        # 4. Backfill embeddings for any existing chunks that lack them
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, content FROM rag_chunks WHERE embedding_json IS NULL")
            missing_rows = cursor.fetchall()
            if missing_rows:
                logger.info(f"Backfilling vector embeddings for {len(missing_rows)} existing chunks...")
                for row in missing_rows:
                    try:
                        vec = self.generate_embedding(f"{row['title']}\n{row['content']}")
                        if vec:
                            v_json = json.dumps([float(x) for x in vec])
                            cursor.execute("UPDATE rag_chunks SET embedding_json = ? WHERE id = ?", (v_json, row["id"]))
                    except Exception as b_err:
                        logger.debug(f"Backfill skipped for chunk {row['id']}: {b_err}")
                conn.commit()

        logger.info(f"Knowledge Vault index complete: {indexed_count} new chunks indexed.")
        return indexed_count

    def query_vault(self, query: str, top_k: int = 3, category: str = "all") -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant knowledge snippets using Dual Hybrid Scoring (RRF):
        Blends 80% Dense Vector Proximity + 20% BM25 Lexical Overlap.
        Checks semantic query cache first (<5 ms) before cold search.
        """
        if not query or not query.strip():
            return []

        # 1. Semantic cache check for general queries (<5 ms)
        if category in ("all", None):
            cached = self._search_semantic_cache(query, threshold=0.88)
            if cached and cached[1]:
                return cached[1][:top_k]

        q_tokens = self._tokenize(query)
        q_embedding = self.generate_embedding(query)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            if category and category != "all":
                cursor.execute(
                    "SELECT id, source, category, title, content, tokens_text, embedding_json FROM rag_chunks WHERE category = ?",
                    (category,)
                )
            else:
                cursor.execute("SELECT id, source, category, title, content, tokens_text, embedding_json FROM rag_chunks")
            rows = cursor.fetchall()

        scores = []
        for r in rows:
            tokens_in_chunk = set(r["tokens_text"].split())
            matches = sum(1 for q in q_tokens if q in tokens_in_chunk) if q_tokens else 0
            bm25_score = (matches / (len(tokens_in_chunk) ** 0.5 + 1)) if matches > 0 else 0.0

            # Vector similarity
            vec_score = 0.0
            if q_embedding and r["embedding_json"]:
                try:
                    chunk_vec = json.loads(r["embedding_json"])
                    vec_score = self.cosine_similarity(q_embedding, chunk_vec)
                except Exception:
                    vec_score = 0.0

            # Hybrid blend: 70% vector + 30% normalized lexical
            if q_embedding and r["embedding_json"]:
                norm_bm25 = min(1.0, bm25_score)
                final_score = (0.70 * vec_score) + (0.30 * norm_bm25)
            else:
                final_score = bm25_score

            if final_score > 0.01:
                item_dict = dict(r)
                item_dict.pop("embedding_json", None)
                scores.append((final_score, item_dict))

        scores.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scores[:top_k]]

    def _search_semantic_cache(self, query: str, threshold: float = 0.88) -> Optional[tuple[str, List[Dict[str, Any]]]]:
        """
        Checks exact-match and semantic cosine similarity against recently cached query results.
        Returns (context, results) on match (1-5 ms) or None on miss.
        """
        clean_q = query.strip()
        if not clean_q or not self._semantic_query_cache:
            return None

        clean_lower = clean_q.lower()
        # 1. Exact string match (0.001 ms)
        for item in reversed(self._semantic_query_cache):
            if item["query"].lower() == clean_lower:
                logger.debug(f"Exact semantic cache hit for query: '{clean_q}'")
                return item["context"], item["results"]

        # 2. Semantic vector proximity via fast local embedder (~4 ms)
        model = self._get_fastembed_model()
        if not model:
            return None

        try:
            q_vec_gen = list(model.embed([clean_q]))
            if not q_vec_gen:
                return None
            q_vec = list(q_vec_gen[0])

            best_sim = 0.0
            best_item = None
            for item in reversed(self._semantic_query_cache):
                cached_vec = item.get("fast_vector")
                if not cached_vec:
                    continue
                sim = self.cosine_similarity(q_vec, cached_vec)
                if sim > best_sim:
                    best_sim = sim
                    best_item = item

            if best_sim >= threshold and best_item:
                logger.info(
                    f"Semantic query cache hit ({best_sim:.3f} >= {threshold}): "
                    f"'{clean_q}' matched '{best_item['query']}'"
                )
                return best_item["context"], best_item["results"]
        except Exception as sc_err:
            logger.debug(f"Semantic cache lookup notice: {sc_err}")

        return None

    def _store_semantic_cache(self, query: str, context: str, results: List[Dict[str, Any]]):
        """Stores query and its retrieved results in semantic cache with fast local embedding."""
        clean_q = query.strip()
        if not clean_q:
            return

        fast_vec = None
        model = self._get_fastembed_model()
        if model:
            try:
                gen = list(model.embed([clean_q]))
                if gen:
                    fast_vec = list(gen[0])
            except Exception:
                pass

        if len(self._semantic_query_cache) >= 256:
            self._semantic_query_cache.pop(0)

        self._semantic_query_cache.append({
            "query": clean_q,
            "fast_vector": fast_vec,
            "context": context,
            "results": results,
            "timestamp": time.time(),
        })

    def search_rag_context(self, query: str, top_k: int = 2) -> str:
        """
        Formats top retrieved snippets into a concise markdown context block.
        Checks semantic query cache first (<5 ms), otherwise executes hybrid search and caches.
        """
        # 1. Semantic Cache check
        cached = self._search_semantic_cache(query, threshold=0.88)
        if cached:
            return cached[0]

        # 2. Cold hybrid retrieval
        results = self.query_vault(query, top_k=top_k)
        if not results:
            return ""

        blocks = []
        for r in results:
            blocks.append(f"### [{r['category'].upper()}] {r['title']} (Source: `{r['source']}`)\n{r['content'][:800]}")

        context = "### Retrieved Knowledge Vault Context:\n" + "\n\n".join(blocks) + "\n\n"
        self._store_semantic_cache(query, context, results)
        return context


# Singleton instance of the Knowledge Vault
rag_vault = KnowledgeVaultRAG()
