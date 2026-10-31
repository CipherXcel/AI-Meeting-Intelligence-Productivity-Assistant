# AgentBuddy

An AI productivity workspace for conversations, calendar planning, notes, tasks, and focused work. **Saarthi**, the built-in assistant, helps you find information and plan your next steps using your saved workspace context.

**[Open AgentBuddy](https://cipherxcel.dev)** · [Source code](https://github.com/CipherXcel/AI-Meeting-Intelligence-Productivity-Assistant)

## Features

### Saarthi assistant
- Persistent conversations with searchable chat history and summaries of older messages.
- Gemini-powered replies streamed to the interface through server-sent events.
- MCP tools for calendar availability, saved-note retrieval, and meeting or task proposals.
- Browse saved notes, search their titles and content, and read relevant documents with source links.
- Review pending actions and proposal history within each conversation. Calendar changes and extracted tasks require your approval.

### Calendar and overview
- Connect Google Calendar through OAuth, inspect connection status, and disconnect from settings.
- Read your primary calendar, find available time, and approve meeting creation with Google Meet links.
- Switch between month and week views, select a day, and inspect its events, tasks, and focus activity.
- See upcoming meetings, pending work, approvals, and a compact focus report from the overview.

### Notes and tasks
- Upload text-based PDF, TXT, Markdown, SRT, and VTT documents for extraction and retrieval.
- Open task details to edit descriptions, due dates, completion status, and linked notes.
- Preview linked notes while working on a task.
- Track document storage usage with a 500 MB per-account quota.

### Focus sessions
- Choose a preset or custom duration, or enable open focus without a countdown.
- Keep a session active while navigating the workspace and return to finish it.
- Get a completion notice when the target is reached; continue working to record extra time.
- Review session timing and history, record focus activity in the workspace calendar, and optionally create a completed task.

Focus records are stored in AgentBuddy; starting a session does not automatically block time in Google Calendar.

### Profile, appearance, and security
- Configure personal details, timezone, meeting duration, working days, and working hours.
- Choose White, Dark, Glass, Frost, Bloom, or Sand, with animated glass effects and reduced-motion support.
- Use a floating navigation dock on desktop and a full-width bottom bar on mobile.
- Change your password using your current password. Other sessions are signed out while your current session is renewed.
- Account protection includes Argon2 password hashing, short-lived JWT access tokens, rotating refresh tokens, encrypted Google OAuth tokens, rate limiting, and per-user data access checks.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, CSS, Lucide icons |
| Backend | Node.js, Express, TypeScript, Zod |
| AI and tools | Google Gemini API, Model Context Protocol (MCP), server-sent events |
| Database | PostgreSQL |
| Integrations | Google Calendar API, Google OAuth, Google Meet links |
| Storage | Local filesystem; optional Amazon S3 |
| Deployment | AWS EC2, Nginx, HTTPS, systemd; Docker Compose and Caddy configuration included |

## Run locally

### Requirements

- Node.js 24 and npm.
- Docker with Docker Compose for the included PostgreSQL service.
- A Gemini API key for assistant replies.
- Google OAuth credentials for Google Calendar features.

### Install and configure

```sh
git clone https://github.com/CipherXcel/AI-Meeting-Intelligence-Productivity-Assistant.git
cd AI-Meeting-Intelligence-Productivity-Assistant
npm ci
```

Copy `.env.example` to both `.env` and `backend/.env`. On PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend/.env
```

Configure the following values before starting:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | Database password used by Docker Compose |
| `DATABASE_URL` | PostgreSQL connection string; the included local database uses port `5443` |
| `JWT_SECRET` | Independent random secret of at least 32 characters |
| `TOKEN_ENCRYPTION_KEY` | Independent 32-byte encryption key, encoded as 64 hexadecimal characters |
| `GEMINI_API_KEY` | API key for assistant replies |
| `GEMINI_MODEL` | Gemini model ID; the example uses `gemini-3.1-flash-lite` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web application credentials |
| `APP_URL` | Frontend origin: `http://localhost:3100` locally |
| `PUBLIC_URL` | Public backend origin: `http://localhost:4000` locally |
| `UPLOAD_DIR` | Persistent document directory when S3 is not configured |

Generate a random secret with this command. Run it separately for each secret:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the same database password in the root Compose configuration and backend connection string. Keep credentials in local environment files, outside version control.

### Start

```sh
docker compose up -d db
npm run dev
```

Open [http://localhost:3100](http://localhost:3100). The backend runs at [http://localhost:4000](http://localhost:4000) and initializes its database schema on startup.

The combined development command sets the frontend and backend origins automatically. If running the services separately, set the origins above and configure `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000`.

Create an account, connect Google Calendar from your profile or Saarthi sidebar, and upload a note to start using your workspace.

## Google Calendar setup

1. Enable the Google Calendar API in your Google Cloud project.
2. Configure the OAuth consent screen and create a **Web application** OAuth client.
3. Add the appropriate **Authorized redirect URIs**:

   ```text
   http://localhost:4000/api/calendar/callback
   https://cipherxcel.dev/api/calendar/callback
   ```

4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the backend environment.
5. Add your Google account as a test user if the OAuth app is in testing, then connect from AgentBuddy.

For your own deployment, replace the production domain with your domain. The redirect URI must exactly match `${PUBLIC_URL}/api/calendar/callback`, including the scheme, port, and path.

## Production

The live application is hosted at **[cipherxcel.dev](https://cipherxcel.dev)** on AWS EC2 behind Nginx with HTTPS and automatic service restart through systemd.

To build and run your own deployment:

```sh
npm run build
npm start
```

The backend serves the exported frontend and API on port `4000` by default, configurable with `PORT`. Use same-origin API requests in production: leave `NEXT_PUBLIC_API_URL` unset or empty when building.

Set `NODE_ENV=production`, `APP_URL`, and `PUBLIC_URL` to match your HTTPS deployment. Provide a persistent PostgreSQL database, independent authentication and encryption secrets, and persistent document storage. Preserve the encryption key across releases so existing Google connections remain readable.

For optional S3 storage, configure `AWS_S3_BUCKET`, `AWS_REGION`, and suitable runtime AWS permissions. Otherwise, uploaded documents use `UPLOAD_DIR`.

Alternatively, the included Docker Compose production profile runs the app, PostgreSQL, and Caddy:

```sh
docker compose --profile production up -d --build
```

Configure the root `.env` for production, including `DOMAIN`, HTTPS origins, database credentials, and secrets. The Compose configuration persists database, upload, and Caddy data in named volumes.

## Project structure

```text
backend/src/       API, authentication, agent tools, calendar, notes, and focus logic
frontend/src/      Workspace interface, components, themes, and client state
frontend/public/   Static assets
scripts/           Local development and frontend staging scripts
docker-compose.yml Database and optional production services
Dockerfile         Application image
Caddyfile          HTTPS reverse proxy for the Compose deployment
```

## Current scope

- Calendar availability checks use the connected user's primary Google calendar; they do not verify other attendees' availability.
- Notes search uses saved titles and extracted text. Scanned PDFs without selectable text require OCR before upload.
- Gemini and Google Calendar features require valid provider configuration; the rest of the workspace remains separately usable.
