# Bugfix Requirements Document

## Introduction

The AI Tutor feature (`/tutor` page) is completely non-functional in production after deployment. Six root causes have been identified spanning invalid configuration defaults, in-process state that breaks under multi-worker deployments, a missing database extension, undocumented required environment variables, stale frontend environment scaffolding, and an SSE streaming pipeline that is blocked by the Vercel serverless runtime. Together these issues prevent users from sending chat messages, receiving streamed responses, and performing document retrieval. Each bug must be fixed independently; some (Bugs 3 and 4) are likely the primary cause of total failure while the others silently degrade behavior or introduce security defects.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Invalid default Gemini model name (`backend/app/config.py`)**

1.1 WHEN the `GEMINI_MODEL` environment variable is not set at deployment time THEN the system uses the hard-coded default `"gemini-3.8-flash"`, which is not a valid Gemini API model identifier, causing all Gemini API calls to return HTTP 400 or 404

1.2 WHEN the primary model call fails and the tutor service falls back through its model list THEN the system tries `"gemini-flash-lite-latest"` and `"gemini-flash-latest"`, which are also non-canonical Gemini model names, so the fallback loop exhausts without opening a stream

1.3 WHEN no model in the fallback list succeeds THEN the system emits a single `{"type": "error"}` SSE event and the tutor chat displays an error or remains blank for the user

---

**Bug 2 — In-memory rate limiter resets on worker restart (`backend/app/utils/rate_limiter.py`)**

2.1 WHEN the backend process restarts or a new worker process is spawned (cold start, dyno cycling, gunicorn multi-worker) THEN the system resets `_user_request_history` to an empty dict, discarding all rate-limit state accumulated before the restart

2.2 WHEN gunicorn runs with multiple workers THEN the system maintains a separate `_user_request_history` dict per worker process, allowing a user to send `limit × worker_count` requests per hour instead of the configured `TUTOR_RATE_LIMIT_PER_HOUR` limit

---

**Bug 3 — `pgvector` extension absent from production database (`backend/app/services/retrieval_service.py`, `backend/requirements.txt`)**

3.1 WHEN the Neon (or any PostgreSQL) database does not have the `pgvector` extension enabled THEN the system fails with a PostgreSQL error on the `<=>` cosine-distance operator used in `retrieval_service.py`, causing every `/tutor/chat` and `/tutor/ingest` request to return HTTP 500

3.2 WHEN `requirements.txt` is used to provision the production environment THEN the system provides no indication that pgvector must be enabled on the database server, leaving operators without guidance during setup

---

**Bug 4 — Missing required env vars in `backend/.env.example` (`backend/.env.example`)**

4.1 WHEN a developer or deployment pipeline uses `.env.example` as the authoritative reference for required environment variables THEN the system omits `DATABASE_URL` and `GEMINI_MODEL` from the example file, so those variables are not set in production

4.2 WHEN `DATABASE_URL` is not set in production THEN the system raises `ValueError("DATABASE_URL is not set.")` inside `get_db_pool()`, which crashes every endpoint that touches the database, including all tutor endpoints (`/tutor/chat`, `/tutor/ingest`, `/tutor/history`, `/tutor/documents`, `/tutor/progress`)

---

**Bug 5 — Frontend `.env.local.example` references removed Supabase variables (`frontend/.env.local.example`)**

5.1 WHEN a developer provisions the frontend using `.env.local.example` as a reference THEN the system lists `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the primary variables, which are no longer used, while omitting clear documentation that `NEXT_PUBLIC_API_URL` must be set to the production backend URL

5.2 WHEN `NEXT_PUBLIC_API_URL` is not set or is set to `http://localhost:8000` in a production deployment THEN the system's proxy (`app/api/backend/[...path]/route.ts`) falls back to `http://127.0.0.1:8000`, which is unreachable from Vercel, causing all tutor API calls to return HTTP 502

---

**Bug 6 — SSE streaming blocked or timed out by Vercel serverless runtime (`frontend/app/api/backend/[...path]/route.ts`)**

6.1 WHEN the `/tutor/chat` backend endpoint returns a `StreamingResponse` with `Content-Type: text/event-stream` and the Next.js proxy forwards it through a Vercel serverless function THEN the system does not configure the proxy response or the Vercel deployment to allow unbuffered streaming, so the entire SSE body is buffered until the connection closes or Vercel's 10-second function timeout is reached

6.2 WHEN the SSE stream exceeds Vercel's default serverless function execution limit THEN the system terminates the response mid-stream, delivering a truncated or empty response to the tutor UI

---

### Expected Behavior (Correct)

**Bug 1 — Correct Gemini model name**

2.1 WHEN the `GEMINI_MODEL` environment variable is not set THEN the system SHALL use `"gemini-2.0-flash"` (or another currently valid Gemini API model identifier) as the hard-coded default, so API calls succeed without requiring explicit environment configuration

2.2 WHEN the primary model call fails and the tutor service falls back through its model list THEN the system SHALL try only valid, currently supported Gemini model identifiers (e.g., `"gemini-2.0-flash"`, `"gemini-1.5-flash"`) in its fallback sequence

2.3 WHEN at least one model in the fallback list returns HTTP 200 THEN the system SHALL open the SSE stream and begin emitting `{"type": "delta"}` events to the client

---

**Bug 2 — Persistent or consistent rate limiting**

2.4 WHEN the backend process restarts or a new worker spawns THEN the system SHALL enforce the configured `TUTOR_RATE_LIMIT_PER_HOUR` limit accurately across the restart boundary, either by persisting rate-limit state to a shared store or by documenting the in-memory limitation explicitly so operators can configure a single-worker deployment

2.5 WHEN gunicorn or another WSGI/ASGI server runs with multiple worker processes THEN the system SHALL NOT allow a user to exceed `TUTOR_RATE_LIMIT_PER_HOUR` total requests per hour by exploiting per-worker isolation

---

**Bug 3 — pgvector extension and documentation**

2.6 WHEN the backend connects to a PostgreSQL database that has the `pgvector` extension enabled THEN the system SHALL execute `c.embedding <=> $1::vector` cosine-distance queries successfully, returning ranked chunks to the tutor

2.7 WHEN `requirements.txt` or its accompanying documentation is reviewed THEN the system SHALL include a comment or companion setup note stating that the `pgvector` extension must be enabled on the target PostgreSQL database (`CREATE EXTENSION IF NOT EXISTS vector;`)

---

**Bug 4 — Complete `.env.example` for backend**

2.8 WHEN a developer or deployment pipeline consults `backend/.env.example` THEN the system SHALL list every environment variable required for the backend to start and serve requests, including `DATABASE_URL` and `GEMINI_MODEL`, each with a descriptive comment

2.9 WHEN `DATABASE_URL` is properly set and the database is reachable THEN the system SHALL initialize the connection pool without raising `ValueError`, allowing all tutor endpoints to function

---

**Bug 5 — Correct frontend environment scaffolding**

2.10 WHEN a developer provisions the frontend using `frontend/.env.local.example` THEN the system SHALL list `NEXT_PUBLIC_API_URL` as the primary variable required for backend connectivity, with an example production value and a comment explaining its purpose

2.11 WHEN `NEXT_PUBLIC_API_URL` is set to the correct production backend URL THEN the system SHALL route all API proxy calls to that URL, and the tutor page SHALL receive valid responses rather than HTTP 502

---

**Bug 6 — Unbuffered SSE streaming through the proxy**

2.12 WHEN the backend returns `Content-Type: text/event-stream` THEN the system SHALL forward that content type and the `X-Accel-Buffering: no` header through the Next.js proxy response so the client receives SSE events incrementally

2.13 WHEN the tutor chat SSE stream is active THEN the system SHALL deliver each `{"type": "delta"}` event to the browser as it is emitted by the backend, without accumulating the full response before flushing

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid, authenticated user submits a chat message with `GEMINI_MODEL` set to a correct model name in the environment THEN the system SHALL CONTINUE TO stream a Gemini-generated response using that explicitly configured model, ignoring the new default

3.2 WHEN a user has not exceeded the hourly rate limit THEN the system SHALL CONTINUE TO process `/tutor/chat` requests without returning HTTP 429

3.3 WHEN a user exceeds the hourly rate limit within a single worker process THEN the system SHALL CONTINUE TO return HTTP 429 with the existing error message format

3.4 WHEN the database has `pgvector` enabled and `DATABASE_URL` is set THEN the system SHALL CONTINUE TO retrieve top-k chunks by cosine distance and return them as source metadata in the SSE stream

3.5 WHEN the `/tutor/ingest` endpoint receives a valid PDF THEN the system SHALL CONTINUE TO parse the PDF, generate embeddings, and store chunks with vector embeddings in the `chunks` table

3.6 WHEN the `/tutor/history`, `/tutor/documents`, and `/tutor/progress` endpoints are called by an authenticated user THEN the system SHALL CONTINUE TO return the correct data from the database without errors

3.7 WHEN the frontend proxy receives a non-streaming JSON response from the backend (e.g., `/tutor/ingest`, `/tutor/history`) THEN the system SHALL CONTINUE TO forward that response to the client correctly and without modification

3.8 WHEN `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000` in a local development environment THEN the system SHALL CONTINUE TO route proxy calls to the local backend, preserving the existing local development workflow

---

## Bug Condition Summary

```pascal
// Bug 1 — Invalid Gemini model name
FUNCTION isBugCondition_1(X)
  INPUT: X of type DeploymentConfig
  OUTPUT: boolean
  RETURN X.GEMINI_MODEL IS NOT SET
       OR X.GEMINI_MODEL = "gemini-3.8-flash"
       OR X.GEMINI_MODEL IN {"gemini-flash-lite-latest", "gemini-flash-latest"}
END FUNCTION

// Property: Fix Checking — Bug 1
FOR ALL X WHERE isBugCondition_1(X) DO
  result ← callGeminiAPI'(X)
  ASSERT result.status_code = 200
       AND stream_opened(result) = true
END FOR

// Preservation
FOR ALL X WHERE NOT isBugCondition_1(X) DO
  ASSERT callGeminiAPI(X) = callGeminiAPI'(X)
END FOR


// Bug 2 — In-memory rate limiter isolation
FUNCTION isBugCondition_2(X)
  INPUT: X of type RuntimeEnvironment
  OUTPUT: boolean
  RETURN X.worker_count > 1
       OR X.process_restarted = true
END FUNCTION

// Property: Fix Checking — Bug 2
FOR ALL X WHERE isBugCondition_2(X) DO
  result ← checkRateLimit'(X.user_id, X.requests_this_hour)
  ASSERT result.allowed_count <= TUTOR_RATE_LIMIT_PER_HOUR
END FOR


// Bug 3 — pgvector extension missing
FUNCTION isBugCondition_3(X)
  INPUT: X of type DatabaseState
  OUTPUT: boolean
  RETURN X.pgvector_extension_enabled = false
END FUNCTION

// Property: Fix Checking — Bug 3
FOR ALL X WHERE isBugCondition_3(X) DO
  ASSERT setup_docs_mention_pgvector = true
END FOR

// For the runtime fix:
FOR ALL X WHERE NOT isBugCondition_3(X) DO
  result ← retrieve'(X.user_id, X.question, X.k)
  ASSERT result.error IS NULL
       AND LENGTH(result.chunks) >= 0
END FOR


// Bug 4 — Missing DATABASE_URL in env
FUNCTION isBugCondition_4(X)
  INPUT: X of type DeploymentConfig
  OUTPUT: boolean
  RETURN X.DATABASE_URL IS NOT SET OR X.DATABASE_URL = ""
END FUNCTION

// Property: Fix Checking — Bug 4
FOR ALL X WHERE isBugCondition_4(X) DO
  ASSERT env_example_contains("DATABASE_URL") = true
       AND env_example_contains("GEMINI_MODEL") = true
END FOR


// Bug 5 — NEXT_PUBLIC_API_URL not set or stale example
FUNCTION isBugCondition_5(X)
  INPUT: X of type FrontendDeploymentConfig
  OUTPUT: boolean
  RETURN X.NEXT_PUBLIC_API_URL IS NOT SET
       OR X.NEXT_PUBLIC_API_URL = "http://localhost:8000"
         AND X.environment = "production"
END FUNCTION

// Property: Fix Checking — Bug 5
FOR ALL X WHERE isBugCondition_5(X) DO
  result ← proxyRequest'(X)
  ASSERT result.status_code != 502
END FOR


// Bug 6 — SSE buffering in Vercel proxy
FUNCTION isBugCondition_6(X)
  INPUT: X of type ProxyResponse
  OUTPUT: boolean
  RETURN X.content_type = "text/event-stream"
       AND X.X_Accel_Buffering_forwarded = false
END FUNCTION

// Property: Fix Checking — Bug 6
FOR ALL X WHERE isBugCondition_6(X) DO
  result ← proxySSEResponse'(X)
  ASSERT result.headers["X-Accel-Buffering"] = "no"
       AND first_delta_received_ms < 10000
END FOR
```
