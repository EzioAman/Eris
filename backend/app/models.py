import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def current_timestamp_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=True)
    username = Column(String(50), unique=True, nullable=True)
    avatar_url = Column(Text, nullable=True)
    preferences = Column(JSON, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    role = Column(String(20), default="owner", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Google / Microsoft OAuth & API mail dispatch tokens
    oauth_provider = Column(String(50), nullable=True)
    oauth_access_token = Column(Text, nullable=True)
    oauth_refresh_token = Column(Text, nullable=True)
    oauth_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship(lambda: SessionModel, back_populates="user", cascade="all, delete-orphan")
    workspace_config = relationship(lambda: WorkspaceConfig, back_populates="user", uselist=False, cascade="all, delete-orphan")

class SessionModel(Base):
    __tablename__ = "sessions"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship(lambda: User, back_populates="sessions")

class OTP(Base):
    __tablename__ = "otps"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), index=True, nullable=False)
    code_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(50), index=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    payload = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class WorkspaceConfig(Base):
    __tablename__ = "workspace_configs"
    __table_args__ = {"extend_existing": True}

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    active_model = Column(String(100), default="openrouter/openrouter/auto", nullable=False)
    execution_mode = Column(String(20), default="speed", nullable=False)
    ui_preferences = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship(lambda: User, back_populates="workspace_config")


class WorkflowModel(Base):
    __tablename__ = "workflows"
    __table_args__ = {"extend_existing": True}

    id = Column(String(64), primary_key=True, default=gen_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="active", nullable=False)
    nodes = Column(JSON, default=list, nullable=False)
    last_saved = Column(String(100), default=current_timestamp_str, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    runs = relationship(lambda: WorkflowRunModel, back_populates="workflow", cascade="all, delete-orphan")


class WorkflowRunModel(Base):
    __tablename__ = "workflow_runs"
    __table_args__ = {"extend_existing": True}

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workflow_id = Column(String(64), ForeignKey("workflows.id", ondelete="CASCADE"), index=True, nullable=False)
    trigger = Column(String(255), nullable=False)
    status = Column(String(20), default="running", nullable=False)
    duration_ms = Column(Integer, default=0, nullable=False)
    steps_completed = Column(Integer, default=0, nullable=False)
    total_steps = Column(Integer, default=0, nullable=False)
    logs = Column(JSON, default=list, nullable=False)
    outputs = Column(JSON, default=dict, nullable=False)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    workflow = relationship(lambda: WorkflowModel, back_populates="runs")


class ConnectorModel(Base):
    __tablename__ = "connectors"
    __table_args__ = {"extend_existing": True}

    id = Column(String(64), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    status = Column(String(20), default="disconnected", nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSON, default=dict, nullable=False)
    is_enabled = Column(Boolean, default=False, nullable=False)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ApiKeyVault(Base):
    __tablename__ = "api_key_vault"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    provider = Column(String(50), nullable=False)
    label = Column(String(100), nullable=False)
    key_ciphertext = Column(Text, nullable=False)
    key_masked = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=True)
    base_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


# =====================================================================
# Vector Search & Semantic Memory Models (pgvector + Gemini Embedding 2)
# =====================================================================

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = lambda dim: Text  # Fallback to Text if pgvector is absent

GEMINI_EMBEDDING_DIM = 3072


class EpisodicMemoryModel(Base):
    """
    Episodic and long-term user memory embeddings for semantic recall.
    Stores user preferences, project conventions, and feedback.
    """
    __tablename__ = "episodic_memories"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    category = Column(String(50), default="preference", index=True, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(GEMINI_EMBEDDING_DIM), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class KnowledgeVaultChunkModel(Base):
    """
    Semantic knowledge vault vector chunks for documentation and project guides.
    """
    __tablename__ = "knowledge_vault_chunks"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    source = Column(String(255), nullable=False)
    category = Column(String(50), default="documentation", index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    content_hash = Column(String(64), unique=True, index=True, nullable=False)
    embedding = Column(Vector(GEMINI_EMBEDDING_DIM), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ToolRegistryVectorModel(Base):
    """
    Tool selection RAG vectors for dynamic tool retrieval based on user intent.
    """
    __tablename__ = "tool_registry_vectors"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=gen_uuid)
    tool_name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    schema_json = Column(JSON, default=dict, nullable=False)
    embedding = Column(Vector(GEMINI_EMBEDDING_DIM), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)