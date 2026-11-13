# 📚 StudyStack

> **Know what to study, get unstuck, beat the paper.**  
> A subject-agnostic AI-powered learning platform designed for structured syllabus tracking, instant multi-turn doubt resolution, study material management, and exam paper pattern analysis.

---

## 🌟 Key Features

- **📖 Syllabus & Topic Tracking**: Hierarchical tracking of subjects, modules, and subtopics with completion status, difficulty ratings, and progress metrics.
- **🤖 AI Doubt Solver**: Real-time context-aware doubt resolution powered by Google Gemini, complete with follow-up Q&A and code/formula formatting.
- **📝 Exam Paper Analyzer**: Extract and analyze past exam question papers (PDF/images) with topic breakdown, frequency analysis, and weightage estimations.
- **📁 Study Material Hub**: Store, organize, and quickly access notes, reference links, and documents per subject and module.
- **🔒 Secure Authentication**: Multi-session authentication and user management powered by Clerk.
- **🌓 Modern Responsive UI**: Crafted with Next.js App Router, Tailwind CSS v4, Radix UI primitives, and Sonner toast notifications.

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components & Icons**: Radix UI, Lucide React
- **Auth**: [@clerk/nextjs](https://clerk.com/)
- **Exporting**: jsPDF

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **AI / LLM**: Google Gemini API via HTTPX
- **Document & PDF Processing**: `pdfplumber`, `PyPDF2`, `pytesseract`
- **ASGI Server**: Uvicorn

### Database
- **Database**: [PostgreSQL / Neon Serverless Postgres](https://neon.tech/)

---

## 📁 Repository Structure

```text
StudyStack/
├── frontend/                  # Next.js App Router frontend
│   ├── app/                   # Pages & routing ((auth), dashboard, subjects, doubts, etc.)
│   ├── components/            # Reusable UI & feature components
│   ├── hooks/                 # Custom client React hooks
│   ├── lib/                   # Utilities, DB client, profile providers
│   └── public/                # Static assets
├── backend/                   # FastAPI backend server
│   ├── app/
│   │   ├── db/                # Database connection & queries
│   │   ├── models/            # Pydantic schemas & data models
│   │   ├── routers/           # API route handlers (doubts, papers, etc.)
│   │   └── services/          # LLM & PDF parsing services
│   ├── main.py                # Server entry point
│   └── requirements.txt       # Python dependencies
├── docs/                      # PRD, API contracts, sample resources
└── neon_setup.sql             # Database schema setup script
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: `v20+` and `npm` (or `pnpm` / `yarn`)
- **Python**: `3.10+` and `pip`
- **Accounts**:
  - [Clerk](https://clerk.com/) for authentication
  - [Google AI Studio](https://aistudio.google.com/) for Gemini API Key
  - [Neon](https://neon.tech/) or any PostgreSQL instance

---

### 1. Database Setup

Run the SQL setup script on your PostgreSQL instance (e.g., via Neon SQL Editor):

```bash
# Execute neon_setup.sql inside your database management console
```

---

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Configure `backend/.env`:
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Start the backend API server:
```bash
uvicorn app.main:app --reload --port 8000
```
API documentation will be accessible at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Create local environment file
cp .env.local.example .env.local
```

Configure `frontend/.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend API & Database
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
GEMINI_API_KEY=your_gemini_api_key
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment Guidelines

### Frontend (Vercel)
1. Push your repository to GitHub.
2. Import the project into **Vercel** with the **Root Directory** set to `frontend`.
3. Add the environment variables in **Vercel Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app`
   - `DATABASE_URL=...`
4. Deploy.

### Backend (Railway / Render / Fly.io)
1. Set the root directory to `backend`.
2. Configure Start Command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Set the environment variables:
   - `GEMINI_API_KEY`
   - `DATABASE_URL`

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/doubts/solve` | Submit a study doubt and receive AI explanation |
| `POST` | `/papers/analyze` | Upload and analyze previous years' question papers |
| `GET` | `/health` | Server health check endpoint |

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
