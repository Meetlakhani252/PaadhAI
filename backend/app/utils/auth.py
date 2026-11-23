import jwt
from fastapi import Header, HTTPException, status
from typing import Optional
import logging

logger = logging.getLogger("paadhai-auth")

def get_authenticated_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> str:
    """Extract authenticated user ID from Authorization header (Clerk JWT) or X-User-Id header."""
    # 1. Direct X-User-Id header (for internal routing / testing)
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    # 2. Authorization: Bearer <clerk_jwt>
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
            user_id = claims.get("sub") or claims.get("user_id")
            if user_id:
                return str(user_id)
        except Exception as e:
            logger.warning(f"Failed to decode token claims: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token"
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid Bearer token or X-User-Id header."
    )
