# PharmaGuard — Genomic Toxicity Analyzer

AI-powered pharmacogenomic risk analysis platform built with **Vite + React + shadcn/ui** (frontend) and **FastAPI** (backend).

## Features

- Upload VCF genomic files for analysis
- Select from 6 supported drugs (Codeine, Warfarin, Clopidogrel, Simvastatin, Azathioprine, Fluorouracil)
- AI-generated clinical explanations grounded in CPIC guidelines
- Per-drug risk assessment with detailed pharmacogenomic profiles
- Beautiful dark-mode dashboard with interactive charts

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:8080
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vite, React, TypeScript, shadcn/ui, Tailwind CSS, Recharts |
| Backend  | FastAPI, Google Gemini (LLM), Supabase |
| Analysis | VCF parsing, CPIC guidelines, pharmacogenomics |
