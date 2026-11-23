import time
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from app.config import settings

# In-memory sliding window rate limiter: user_id -> list of unix timestamps
_user_request_history: Dict[str, List[float]] = defaultdict(list)

def check_tutor_rate_limit(user_id: str) -> None:
    """Enforces per-user rate limiting on tutor requests within a 1-hour rolling window."""
    limit = settings.TUTOR_RATE_LIMIT_PER_HOUR
    window_seconds = 3600.0  # 1 hour
    now = time.time()

    # Filter out timestamps outside the current 1-hour window
    valid_timestamps = [t for t in _user_request_history[user_id] if t > now - window_seconds]
    _user_request_history[user_id] = valid_timestamps

    if len(valid_timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: You have reached the maximum of {limit} requests per hour for PaadhAI Tutor."
        )

    _user_request_history[user_id].append(now)

def reset_rate_limit(user_id: Optional[str] = None) -> None:
    """Reset rate limit history for testing."""
    if user_id:
        _user_request_history.pop(user_id, None)
    else:
        _user_request_history.clear()
