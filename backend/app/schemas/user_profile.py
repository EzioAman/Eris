from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class UserMemoryProfile(BaseModel):
    """
    Strict Pydantic schema for user profile and memory injection.
    Persisted to DB, memory/memory.json, and injected into Eris agent prompt.
    """
    display_name: str = Field(..., min_length=1, max_length=100, description="Full user display name")
    username: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$", description="Unique user handle")
    avatar_url: Optional[str] = Field(None, description="Avatar image or animated GIF URL/Base64")
    headline: Optional[str] = Field(None, max_length=150, description="Professional headline or engineering focus")
    bio: Optional[str] = Field(None, max_length=500, description="Short user bio or working context")
    email: Optional[EmailStr] = Field(default=None, description="User account email")
    website: Optional[str] = Field(None, max_length=200, description="Personal website or GitHub profile")
    timezone: str = Field(default="UTC", max_length=60, description="User local timezone")
    visibility: str = Field(default="private", description="Profile visibility level")
    accent: str = Field(default="indigo", description="UI theme accent color preference")
    tags: Optional[list[str]] = Field(default_factory=list, description="User or role tags for categorization and retrieval")
    notify_product: bool = Field(default=True, description="Product updates notification toggle")
    notify_mentions: bool = Field(default=True, description="Mentions notification toggle")
    notify_digest: bool = Field(default=False, description="Weekly digest notification toggle")

class UserProfileResponse(BaseModel):
    ok: bool
    message: str
    profile: Optional[UserMemoryProfile] = None
