# AgentBuddy

A personal workspace for conversations with Saarthi, calendar planning, notes, tasks and focus sessions.

## Run locally

Requires Node.js 20.9+ and Docker.

```sh
npm ci
cp .env.example .env
cp .env.example backend/.env
# Configure the database password and independent authentication/encryption secrets.
docker compose up -d db
npm run dev
```

Open http://localhost:3100. Set a Gemini API key for assistant replies and Google OAuth credentials for Calendar connection. The callback URL is `${PUBLIC_URL}/api/calendar/callback`.

## Production

```sh
npm run build
npm start
```

The API serves the exported frontend on port 4000. Set `APP_URL` and `PUBLIC_URL` to the HTTPS site origin. Use persistent PostgreSQL and document storage, independent secrets, and a reverse proxy. `docker compose --profile production up -d --build` provides an alternative using the included Caddy configuration.

Focus sessions continue until finished, including optional extra time. Their calendar records are local; Google changes require approval. Task details support descriptions and linked notes. Appearance includes White, Dark, Glass, Frost, Bloom and Sand.
