import asyncpg
import ssl
import logging
from typing import Optional, Tuple
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.config import settings

logger = logging.getLogger("paadhai-database")

_pool: Optional[asyncpg.Pool] = None

def get_clean_dsn(dsn: str) -> Tuple[str, Optional[ssl.SSLContext]]:
    """Normalize DSN and extract SSL context for asyncpg compatibility with Neon."""
    if dsn.startswith("postgres://"):
        dsn = dsn.replace("postgres://", "postgresql://", 1)
    
    parsed = urlparse(dsn)
    qs = parse_qs(parsed.query)
    
    ssl_context = None
    if "sslmode" in qs or "neon.tech" in (parsed.hostname or ""):
        qs.pop("sslmode", None)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    
    clean_query = urlencode(qs, doseq=True)
    clean_parsed = parsed._replace(query=clean_query)
    return urlunparse(clean_parsed), ssl_context

async def get_db_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        if not settings.DATABASE_URL:
            raise ValueError("DATABASE_URL is not set.")
        clean_dsn, ssl_ctx = get_clean_dsn(settings.DATABASE_URL)
        _pool = await asyncpg.create_pool(
            dsn=clean_dsn,
            ssl=ssl_ctx,
            min_size=1,
            max_size=10
        )
    return _pool

async def close_db_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
