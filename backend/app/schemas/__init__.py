"""
Pydantic Schemas Module
Strictly imports and exposes typed models for tools, graph state, events, and user settings.
"""

try:
    from app.schemas.auth import (
        SignUpRequest,
        LoginRequest,
        RequestOtpRequest,
        VerifyOtpRequest,
        ForgotPasswordRequest,
        ResetPasswordRequest,
        LogoutRequest,
        SessionVerificationRequest,
        SessionData,
    )
    from app.schemas.user_profile import UserMemoryProfile, UserProfileResponse
    from app.schemas.tools import (
        RiskLevel,
        ReadFileInput,
        WriteFileInput,
        RunCommandInput,
        ListDirectoryInput,
        SearchWebInput,
        ScrapeWebpageInput,
        GrepSearchInput,
        ViewFileInput,
        SendEmailInput,
        PlayYoutubeInput,
        CreateFolderInput,
        GreetingInput,
        ChangeModelInput,
        SpawnSwarmInput,
        ToolDefinition,
    )
    from app.schemas.state import AgentState
    from app.schemas.events import (
        ModelSwitchEvent,
        TurnStartEvent,
        ThoughtEvent,
        ActionEvent,
        ObservationEvent,
        SubagentSpawnEvent,
        SearchEvent,
        ApprovalToolCall,
        OutputToolCall,
        DoneEvent,
    )
    from app.schemas.settings import PersonaSettings, UserSettings, get_default_personas
    from app.schemas.models import (
        ModelCatalogItem,
        format_token_count,
        format_context_display,
        compute_context_tier,
    )
except ImportError:
    from backend.app.schemas.auth import (
        SignUpRequest,
        LoginRequest,
        RequestOtpRequest,
        VerifyOtpRequest,
        ForgotPasswordRequest,
        ResetPasswordRequest,
        LogoutRequest,
        SessionVerificationRequest,
        SessionData,
    )
    from backend.app.schemas.user_profile import UserMemoryProfile, UserProfileResponse
    from backend.app.schemas.tools import (
        RiskLevel,
        ReadFileInput,
        WriteFileInput,
        RunCommandInput,
        ListDirectoryInput,
        SearchWebInput,
        ScrapeWebpageInput,
        GrepSearchInput,
        ViewFileInput,
        SendEmailInput,
        PlayYoutubeInput,
        CreateFolderInput,
        GreetingInput,
        ChangeModelInput,
        SpawnSwarmInput,
        ToolDefinition,
    )
    from backend.app.schemas.state import AgentState
    from backend.app.schemas.events import (
        ModelSwitchEvent,
        TurnStartEvent,
        ThoughtEvent,
        ActionEvent,
        ObservationEvent,
        SubagentSpawnEvent,
        SearchEvent,
        ApprovalToolCall,
        OutputToolCall,
        DoneEvent,
    )
    from backend.app.schemas.settings import PersonaSettings, UserSettings, get_default_personas
    from backend.app.schemas.models import (
        ModelCatalogItem,
        format_token_count,
        format_context_display,
        compute_context_tier,
    )

__all__ = [
    "SignUpRequest",
    "LoginRequest",
    "RequestOtpRequest",
    "VerifyOtpRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "LogoutRequest",
    "SessionVerificationRequest",
    "SessionData",
    "UserMemoryProfile",
    "UserProfileResponse",
    "RiskLevel",
    "ReadFileInput",
    "WriteFileInput",
    "RunCommandInput",
    "ListDirectoryInput",
    "SearchWebInput",
    "ScrapeWebpageInput",
    "GrepSearchInput",
    "ViewFileInput",
    "SendEmailInput",
    "PlayYoutubeInput",
    "CreateFolderInput",
    "GreetingInput",
    "ChangeModelInput",
    "SpawnSwarmInput",
    "ToolDefinition",
    "AgentState",
    "ModelSwitchEvent",
    "TurnStartEvent",
    "ThoughtEvent",
    "ActionEvent",
    "ObservationEvent",
    "SubagentSpawnEvent",
    "SearchEvent",
    "ApprovalToolCall",
    "OutputToolCall",
    "DoneEvent",
    "PersonaSettings",
    "UserSettings",
    "get_default_personas",
    "ModelCatalogItem",
    "format_token_count",
    "format_context_display",
    "compute_context_tier",
]
