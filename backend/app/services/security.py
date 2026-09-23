import hashlib
import hmac
import secrets
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_bearer_token() -> str:
    """Generates a 256-bit entropy URL-safe bearer token."""
    return f"eris_sec_{secrets.token_urlsafe(32)}"

def hash_token(token: str) -> str:
    """Returns SHA-256 hex digest of the raw token."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

def generate_numeric_otp(length: int = 6) -> str:
    """Generates a cryptographically strong 6-digit numeric OTP."""
    # Use secrets.randbelow to ensure cryptographic uniformity
    return "".join(str(secrets.randbelow(10)) for _ in range(length))

def hash_otp(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()

def verify_otp_hash(plain_code: str, stored_hash: str) -> bool:
    computed = hash_otp(plain_code)
    return hmac.compare_digest(computed, stored_hash)
