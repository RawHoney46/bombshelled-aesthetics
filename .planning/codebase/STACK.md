# Technology Stack

**Analysis Date:** 2026-07-14

## Languages

**Primary:**
- TypeScript 6.0.3 - Application code, API routes, utilities, type-safe development
- JavaScript - Configuration files (next.config.js, postcss.config.js)

## Runtime

**Environment:**
- Node.js 18 or higher

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.35 - Full-stack React framework with App Router, API routes, server-side rendering
- React 18.3.1 - UI library for client-side components

**Styling:**
- Tailwind CSS 4.3.0 - Utility-first CSS framework for styling
- PostCSS 8.5.15 - CSS processing (autoprefixer, Tailwind support)
- @tailwindcss/postcss 4.3.0 - PostCSS plugin for Tailwind

**Development:**
- TypeScript 6.0.3 - Static type checking and compilation

## Key Dependencies

**Critical:**
- @anthropic-ai/sdk 0.102.0 - Anthropic Claude AI integration for lead qualification
- better-sqlite3 12.10.0 - Embedded SQLite database for local data persistence
- uuid 14.0.0 - Server-side UUID generation for record IDs

**Infrastructure:**
- @types/node 25.9.2 - TypeScript definitions for Node.js APIs
- @types/react 19.2.17 - TypeScript definitions for React
- @types/react-dom 19.2.3 - TypeScript definitions for React DOM
- @types/better-sqlite3 7.6.13 - TypeScript definitions for better-sqlite3
- @types/uuid 10.0.0 - TypeScript definitions for uuid

**Build & Development:**
- autoprefixer 10.5.0 - PostCSS plugin for vendor prefixes
- next - Built-in linting (next lint)

## Configuration

**Environment:**
- `.env.local` file (not in repository) - Contains ANTHROPIC_API_KEY
- Next.js environment variable handling - Automatic via process.env

**Build:**
- `tsconfig.json` - TypeScript compiler configuration targeting ES2017, strict mode disabled
- `next.config.js` - Next.js configuration (typescript.ignoreBuildErrors: false)
- `postcss.config.js` - PostCSS pipeline configuration for Tailwind CSS

## Features

**Fonts:**
- Playfair Display (Google Fonts) - Imported in `app/layout.tsx`, set as --font-playfair CSS variable

**Database:**
- SQLite (local file: `data/demo.db`) - In-process relational database
- Three tables: `leads`, `appointments`, `sms_log`
- Created automatically on first run via `lib/db/client.ts`

**Styling:**
- Global CSS: `app/globals.css`
- CSS Modules: Available but not heavily used
- Tailwind configuration: Integrated via postcss.config.js

## Platform Requirements

**Development:**
- Node.js 18.0.0 or higher
- npm (included with Node.js)
- ~500MB disk space for node_modules and SQLite database
- Optional: Anthropic API key (for Claude AI qualification feature)

**Production:**
- Node.js 18.0.0 or higher (for server runtime)
- Environment variable: `ANTHROPIC_API_KEY` (optional but required for full AI features)
- Writable filesystem: Required for SQLite database persistence (`data/demo.db`)
- Deployment targets: Vercel (native Next.js support), Docker containers, Node.js servers

## Build & Runtime Scripts

**Available commands** (from package.json):
- `npm run dev` - Start development server (next dev)
- `npm run build` - Production build (next build)
- `npm start` - Start production server (next start)
- `npm run lint` - Run Next.js linting (next lint)

---

*Stack analysis: 2026-07-14*
