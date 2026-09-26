import json
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Type
from pydantic import BaseModel, Field, field_validator


class RiskLevel(str, Enum):
    """
    Clear classification of tool impact to govern human approval requirements.
    No magical AI terms; standard, readable security categorization.
    """
    SAFE = "safe"           # Read-only operations with no workspace mutations (e.g. read_file, list_dir)
    MODERATE = "moderate"   # Workspace modifications that can be undone (e.g. write_file, create_folder)
    HIGH = "high"           # Shell execution and external service mutations (e.g. run_command)
    CRITICAL = "critical"   # Irreversible or external communications (e.g. send_email, destructive actions)


class ReadFileInput(BaseModel):
    """Input arguments for reading a workspace file."""
    path: str = Field(description="Relative path of the file to read within the workspace.")


class WriteFileInput(BaseModel):
    """Input arguments for writing or overwriting a workspace file."""
    path: str = Field(description="Relative path of the target file to create or update.")
    content: str = Field(description="Full text or code content to write to the file.")


class RunCommandInput(BaseModel):
    """Input arguments for executing a local command."""
    command: str = Field(description="The shell command string to execute.")
    is_read_only: bool = Field(default=False, description="Flag indicating if the command is purely informational.")


class ListDirectoryInput(BaseModel):
    """Input arguments for inspecting directory contents."""
    path: str = Field(default=".", description="Relative directory path to list.")


class SearchWebInput(BaseModel):
    """Input arguments for querying the internet."""
    query: str = Field(description="Search query string.")


class ScrapeWebpageInput(BaseModel):
    """Input arguments for extracting webpage contents as markdown."""
    url: str = Field(description="Full HTTP or HTTPS URL to fetch and parse.")


class GrepSearchInput(BaseModel):
    """Input arguments for searching text patterns inside project files."""
    query: str = Field(description="Search text or pattern.")
    path: str = Field(default=".", description="Base directory to search in.")


class ViewFileInput(BaseModel):
    """Input arguments for reading a slice of a file."""
    path: str = Field(description="Relative path of the file.")
    start_line: Optional[int] = Field(default=None, description="Starting line number (1-based, inclusive).")
    end_line: Optional[int] = Field(default=None, description="Ending line number (1-based, inclusive).")


class SendEmailInput(BaseModel):
    """Input arguments for sending an email message."""
    to: str = Field(description="Recipient email address.")
    subject: str = Field(description="Email subject line.")
    body: str = Field(description="Plain text email body.")
    save_as_default: bool = Field(default=False, description="Persist recipient as default contact.")
    confirmed: bool = Field(default=False, description="Whether human approval has been granted.")


class PlayYoutubeInput(BaseModel):
    """Input arguments for searching and playing a video/song on YouTube."""
    query: str = Field(default="", description="Song title or search query.")
    song_name: Optional[str] = Field(default=None, description="Song title alias.")
    song: Optional[str] = Field(default=None, description="Song title alias.")
    title: Optional[str] = Field(default=None, description="Song title alias.")
    args: Optional[str] = Field(default=None, description="Raw argument string.")


class CreateFolderInput(BaseModel):
    """Input arguments for creating a directory on the user desktop."""
    name: str = Field(default="New Folder", description="Folder name to create on the desktop.")
    folder_name: Optional[str] = Field(default=None, description="Folder name alias.")
    args: Optional[str] = Field(default=None, description="Raw argument string.")


class SearchKnowledgeVaultInput(BaseModel):
    """Input arguments for querying the local Neural & Lexical Knowledge Vault RAG."""
    query: str = Field(description="Search query to retrieve project docs, tools, architecture, and memory.")
    category: Optional[str] = Field(default="all", description="Category filter: all, documentation, tool, memory.")


class GreetingInput(BaseModel):
    """Input arguments for running the onboarding greeting."""
    name: str = Field(default="Developer", description="Name of the person to greet.")


class ChangeModelInput(BaseModel):
    """Input arguments for updating the active LLM model."""
    model_name: str = Field(description="Target model identifier (e.g. gemini/gemini-3-flash-preview or openrouter/auto).")


class SpawnSwarmInput(BaseModel):
    """Input arguments for launching a multi-agent swarm."""
    agents: List[Dict[str, Any]] = Field(description="List of agent specifications with role, objective, and persona.")


class CreateToolInput(BaseModel):
    """Input arguments for synthesizing a new reusable Python tool in the workspace tools/ folder."""
    tool_name: str = Field(default="", description="Filename/identifier for the tool. Alphanumeric and underscores only.")
    name: Optional[str] = Field(default=None, description="Tool name alias.")
    filename: Optional[str] = Field(default=None, description="Filename alias.")
    description: str = Field(default="", description="Detailed explanation of what the tool accomplishes.")
    code: str = Field(default="", description="Complete Python code.")
    content: Optional[str] = Field(default=None, description="Code alias.")


class OpenBrowserInput(BaseModel):
    """Input arguments for opening a URL or query in the default web browser."""
    url: str = Field(default="https://www.google.com", description="Destination URL or search term to open in the browser.")
    url_or_query: Optional[str] = Field(default=None, description="Destination URL or search term alias.")
    query: Optional[str] = Field(default=None, description="Search query alias.")
    args: Optional[str] = Field(default=None, description="Raw argument string.")




class RenderUIInput(BaseModel):
    """Input arguments for dynamically declaring rich UI visuals to render."""
    component: Literal[
        "code-comparison",
        "terminal",
        "file-tree",
        "media-player",
        "safari-preview",
        "subagent-chain",
        "ios-preview",
        "android-preview",
    ] = Field(description="Which UI block to show the user.")
    props: Dict[str, Any] = Field(default_factory=dict, description="Props for that component.")

    @field_validator("props", mode="before")
    @classmethod
    def parse_props_if_string(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {"raw": v}
        return v or {}


class AskQuestionInput(BaseModel):
    """Input arguments for mid-conversation user preference elicitation questions."""
    prompt: str = Field(description="The structured question text to ask the user")
    mode: Literal["single", "multi"] = Field(default="single", description="Selection mode: single or multi")
    options: List[Dict[str, str]] = Field(default_factory=list, description="List of options, each containing id and label")
    allowCustom: Optional[bool] = Field(default=False, description="Whether to include a 'Type something else…' custom input")
    id: Optional[str] = Field(default=None, description="Optional stable question ID")


class ToolDefinition(BaseModel):
    """
    Complete definition of a registered tool.
    Eliminates hardcoded tool lists by encapsulating schema, risk level, and handler.
    """
    name: str
    description: str
    function: Any
    args_schema: Type[BaseModel]
    risk_level: RiskLevel
    requires_approval: bool = False
    source: str = "core"  # "core" or "dynamic"
    file_path: Optional[str] = None
