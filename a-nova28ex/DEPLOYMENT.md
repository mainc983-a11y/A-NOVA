# MyAI Platform - Deployment Instructions & Technical Stack

Welcome to the **MyAI** Chatbot application guide. This document outlines how to deploy and run the premium ChatGPT-style MyAI platform in local development as well as standard production environments.

## Technical Architecture

The MyAI platform uses a modular high-performance full-stack design:
- **Frontend**: React (with Vite for extremely fast bundle sizes, responsive layout, and HMR fallback) styled with Tailwind CSS v4 and fluid typography.
- **Backend**: Express.js server acts as an elegant API Gateway, handling user sessions, profile management, and proxying calls directly to the enterprise-grade Gemini API (avoiding exposure of keys on the client).
- **Database (Preview)**: Local JSON filesystem database (`data/db.json`) provides seamless data persistence, registration speed, and session state inside development containers without external overhead.
- **Database (Production)**: Supported PostgreSQL schema defined in `schema.sql`, allowing mapping schemas perfectly onto modern platforms like Koyeb, Render, or GCP Cloud SQL.

---

## Production Deployment Steps

### 1. Database Provisioning (PostgreSQL)
1. Launch a PostgreSQL instance on AWS RDS, Supabase, Neon, or GCP Cloud SQL.
2. Execute the commands defined in `schema.sql` to build the required tables, triggers, and indices.
3. Keep the PostgreSQL Connection string handy (e.g., `postgresql://postgres:password@host/myai`).

### 2. Backend (Express Node.js or FastAPI / Python alternative)
Our production Express.js package runs out of the box using Node.js:
1. Copy the Express backend into your deploy container or VM.
2. Ensure you specify the required environment variables:
   ```env
   PORT=3000
   GEMINI_API_KEY="Your_Actual_Gemini_API_Key"
   JWT_SECRET="Your_Secure_Session_Secret"
   DATABASE_URL="postgresql://user:pass@host:5432/myai"
   ```
3. Run `npm run build && npm run start` to serve both backend APIs and React frontend assets simultaneously from Port `3000`.

---

## Local Development Execution
- Run `npm install` to gather Node modules.
- Ensure `GEMINI_API_KEY` is present in your environment or Secrets tab.
- Run `npm run dev` to launch the full-stack development server.
- The platform automatically spins up the Node server on Port `3000`. Open `http://localhost:3000` to interact with MyAI!
