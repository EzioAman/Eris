from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from backend.app.services.email_service import dispatch_contact_email

router = APIRouter(prefix="/api/contact", tags=["Contact Dispatch"])

class ContactRequest(BaseModel):
    firstName: str = Field(default="")
    lastName: str = Field(default="")
    email: EmailStr
    topic: str = Field(default="General Inquiry")
    message: str = Field(..., min_length=2)

@router.post("")
async def send_contact_message(payload: ContactRequest):
    try:
        sent = await dispatch_contact_email(
            first_name=payload.firstName,
            last_name=payload.lastName,
            sender_email=payload.email,
            topic=payload.topic,
            message=payload.message
        )
        return {
            "ok": True,
            "delivered": sent,
            "message": "Your message has been sent to Aman Sinha and a confirmation email was dispatched to your inbox."
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch contact message: {str(ex)}")
