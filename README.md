# Bombshelled Aesthetics

A comprehensive AI-augmented booking and lead management system for service businesses. This repository demonstrates how to integrate AI-powered lead qualification, automated scoring, and instant communication workflows into a modern web application.

## 🚀 Quick Start

Navigate to the project directory and follow the setup guide:

```bash
cd new_bombshelled-aesthetics-demo-reconciled/final-merged
npm install
npm run dev
```

Visit `http://localhost:3000` to see the application in action.

## 📋 What's Included

This is a **Next.js 14** full-stack application featuring:

- **Lead Capture** — Collect prospect information through web forms
- **AI Qualification** — Automated lead analysis using Claude AI
- **Deterministic Scoring** — Fair, transparent 0-100 lead prioritization
- **Appointment Booking** — Simple slot picker for scheduling
- **SMS Integration** — Simulated message log (ready for Twilio swap)
- **Dashboard** — Real-time lead management interface

## 📚 Documentation

For comprehensive documentation, API reference, and architecture details, see:

**[Full Documentation →](./new_bombshelled-aesthetics-demo-reconciled/final-merged/README.md)**

Key sections:
- Tech stack and dependencies
- Complete API reference
- Scoring methodology
- Design decisions and patterns
- Production considerations
- Testing examples

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js 14 API Routes
- **Database:** SQLite (better-sqlite3)
- **AI:** Anthropic Claude API
- **Build:** TypeScript, PostCSS

## 📁 Project Structure

```
new_bombshelled-aesthetics-demo-reconciled/final-merged/
├── app/                 # Next.js App Router
│   ├── api/            # Backend API endpoints
│   ├── dashboard/      # Admin dashboard
│   ├── book/           # Booking interface
│   └── page.tsx        # Landing page
├── components/         # React components
├── lib/                # Server-side utilities
├── types/              # TypeScript definitions
└── data/               # SQLite database
```

## 🔑 Key Features

### Instant Lead Response
The system responds to new leads in seconds with personalized messages, powered by AI analysis.

### Fair Scoring System
Leads are scored 0-100 based on:
- **Urgency** (40 points) — immediate vs. planning
- **Damage Type** (30 points) — severity assessment
- **Completeness** (20 bonus points) — data quality

### AI-Powered Analysis
Claude AI generates:
- Lead summaries
- Urgency assessments
- Personalized response messages
- Recommended next actions

## 🚨 Important: This is a Demo

This project demonstrates best practices but requires hardening for production:
- No authentication/authorization
- No rate limiting
- Simulated SMS (not real Twilio)
- No background job queue for AI processing
- No monitoring or alerting

See the [full documentation](./new_bombshelled-aesthetics-demo-reconciled/final-merged/README.md#limitations--future-work) for production considerations.

## 📖 Getting Started

1. **Prerequisites:** Node.js 18+
2. **Environment:** Create `.env.local` with your Anthropic API key (optional)
3. **Install:** `npm install`
4. **Run:** `npm run dev`
5. **Test:** Use the provided PowerShell/curl examples in the docs

## 📝 License

This is a demonstration project. Use it as a reference for your own work.

---

**Questions?** Check the [full documentation](./new_bombshelled-aesthetics-demo-reconciled/final-merged/README.md) for detailed API reference, design patterns, and testing examples.
