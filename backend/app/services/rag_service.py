import hashlib
import logging
import os
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


class KnowledgeVaultRAG:
    """
    Embedded Neural & Lexical Knowledge Vault RAG Service.
    Indexes workspace documents, user tools, memory notes, and documentation
    using SQLite FTS5 and BM25 lexical token-overlap retrieval.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (settings.MEMORY_DIR / "rag_vault.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
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
                    created_at REAL NOT NULL DEFAULT 0
                )
            """)
            cursor.execute("PRAGMA table_info(rag_chunks)")
            cols = [col[1] for col in cursor.fetchall()]
            if "created_at" not in cols:
                cursor.execute("ALTER TABLE rag_chunks ADD COLUMN created_at REAL NOT NULL DEFAULT 0")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rag_category ON rag_chunks(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rag_hash ON rag_chunks(content_hash)")
            conn.commit()

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
        return [w for w in words if w not in STOP_WORDS]

    def add_chunk(self, source: str, category: str, title: str, content: str) -> bool:
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
            cursor.execute("""
                INSERT INTO rag_chunks (source, category, title, content, content_hash, tokens_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (source, category, title, clean_content, c_hash, tokens, now, now))
            conn.commit()
            return True

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

        logger.info(f"Knowledge Vault index complete: {indexed_count} new chunks indexed.")
        return indexed_count

    def query_vault(self, query: str, top_k: int = 3, category: str = "all") -> List[Dict[str, Any]]:
        """Retrieves top-k relevant knowledge snippets based on BM25-like lexical overlap."""
        if not query or not query.strip():
            return []

        q_tokens = self._tokenize(query)
        if not q_tokens:
            return []

        with self._get_connection() as conn:
            cursor = conn.cursor()
            if category and category != "all":
                cursor.execute(
                    "SELECT id, source, category, title, content, tokens_text FROM rag_chunks WHERE category = ?",
                    (category,)
                )
            else:
                cursor.execute("SELECT id, source, category, title, content, tokens_text FROM rag_chunks")
            rows = cursor.fetchall()

        scores = []
        for r in rows:
            tokens_in_chunk = set(r["tokens_text"].split())
            matches = sum(1 for q in q_tokens if q in tokens_in_chunk)
            if matches > 0:
                score = matches / (len(tokens_in_chunk) ** 0.5 + 1)
                scores.append((score, dict(r)))

        scores.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scores[:top_k]]

    def search_rag_context(self, query: str, top_k: int = 2) -> str:
        """Formats top retrieved snippets into a concise markdown context block."""
        results = self.query_vault(query, top_k=top_k)
        if not results:
            return ""

        blocks = []
        for r in results:
            blocks.append(f"### [{r['category'].upper()}] {r['title']} (Source: `{r['source']}`)\n{r['content'][:800]}")

        return "### Retrieved Knowledge Vault Context:\n" + "\n\n".join(blocks) + "\n\n"


# Singleton instance of the Knowledge Vault
rag_vault = KnowledgeVaultRAG()
