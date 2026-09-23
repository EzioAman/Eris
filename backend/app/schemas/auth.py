from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field

# --- Auth Requests ---

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class RequestOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    name: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=6, max_length=128)

class LogoutRequest(BaseModel):
    token: Optional[str] = None

class SessionVerificationRequest(BaseModel):
    token: str

# --- Auth Responses ---

class SessionData(BaseModel):
    email: str
    token: str
    expires_at: Optional[int] = None
    user_display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class AuthResponse(BaseModel):
    ok: bool
    message: str
    session: Optional[SessionData] = None

class SessionStatusResponse(BaseModel):
    authenticated: bool
    configured: bool
    email: Optional[str] = None
    displayName: Optional[str] = None
    username: Optional[str] = None
    avatarUrl: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    token: Optional[str] = None

# --- System & Preflight Schemas ---

class SubsystemStatus(BaseModel):
    name: str
    status: str
    database: Optional[str] = None
    count: Optional[int] = None
    target: str

class SystemHealthReport(BaseModel):
    ok: bool
    status: str
    subsystems: Dict[str, SubsystemStatus]

class CheckEnvResponse(BaseModel):
    hasEnv: bool

class SystemStateResponse(BaseModel):
    ok: bool
    active_model: Optional[str] = None
    execution_mode: str
    current_user: Optional[str] = None
    user_display_name: Optional[str] = None
    is_authenticated: bool
    current_emotion: str
    emotion_ring_color: str
    ui_preferences: Dict[str, Any]
    tools_count: int
    tools: List[Dict[str, Any]]
    platform: str
