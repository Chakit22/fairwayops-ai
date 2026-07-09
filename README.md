# FairwayOps AI

AI receptionist demo for a private golf club.

This app is intentionally small:

- Next.js dashboard at `/`
- Neon Postgres database
- Retell-compatible tool-call API routes
- Post-call webhook route
- Seeded tee times, bookings, waitlist entries, and calls

## Run

```bash
pnpm install
pnpm dev
```

The project targets Node `24.x`, which is supported by Vercel.

Open:

```text
http://localhost:3000
```

## Web Call (talk to the agent in the browser)

1. Copy `.env.example` to `.env.local` (already created) and fill in:
   - `RETELL_API_KEY` — Retell dashboard → Settings → API Keys
   - `RETELL_AGENT_ID` — open your agent in the Retell dashboard and copy its agent id
   - `DATABASE_URL` — Neon pooled Postgres connection string
2. Restart `pnpm dev`.
3. Open `http://localhost:3000/call` (or click "Talk to the agent →" on the dashboard).
4. Click the orb, allow microphone access, and speak to the agent. Click again to hang up.

How it works: the orb page calls `POST /api/create-web-call`, which hits Retell's
`POST https://api.retellai.com/v2/create-web-call` with your API key and agent id and
returns a short-lived `access_token`. The browser then joins the call via
`retell-client-js-sdk` (`retellWebClient.startCall({ accessToken })`). The token expires
if the call is not started within 30 seconds. Web-call events are logged to
`logs/tool-calls.jsonl` as `create_web_call` entries.

## Retell Tool URLs

After Vercel deployment, use the Vercel HTTPS base URL in Retell:

```text
https://YOUR-VERCEL-APP.vercel.app/api/tools/checkTeeTimeAvailability
https://YOUR-VERCEL-APP.vercel.app/api/tools/createBookingRequest
https://YOUR-VERCEL-APP.vercel.app/api/tools/addToWaitlist
https://YOUR-VERCEL-APP.vercel.app/api/retell/post-call
```

If running locally with ngrok:

```bash
ngrok http 3000
```

Use the ngrok HTTPS base URL in Retell:

```text
https://YOUR-NGROK-URL.ngrok-free.app/api/tools/checkTeeTimeAvailability
https://YOUR-NGROK-URL.ngrok-free.app/api/tools/createBookingRequest
https://YOUR-NGROK-URL.ngrok-free.app/api/tools/addToWaitlist
https://YOUR-NGROK-URL.ngrok-free.app/api/retell/post-call
```

## Tool Payloads

### checkTeeTimeAvailability

```json
{
  "date": "2026-07-11",
  "time_window": "07:30-08:30",
  "number_of_players": 4,
  "holes": 18
}
```

### createBookingRequest

```json
{
  "name": "John Smith",
  "contact": "+61412345678",
  "member_or_guest": "member",
  "date": "2026-07-11",
  "selected_slot": "09:20",
  "number_of_players": 4,
  "holes": 18,
  "notes": "Caller asked for a Saturday morning booking."
}
```

### addToWaitlist

```json
{
  "name": "Sarah Lee",
  "contact": "sarah@example.com",
  "date": "2026-07-11",
  "time_window": "07:00-09:00",
  "number_of_players": 2,
  "notes": "Prefers an early Saturday tee time."
}
```

## Demo Script

1. Open dashboard at `http://localhost:3000`.
2. Start Retell web call.
3. Say: "Can I book a tee time for Saturday morning for four players?"
4. Agent checks availability.
5. Choose `09:20`.
6. Agent creates booking request.
7. Refresh dashboard and show the booking plus tool-call log.

Seeded data already blocks `07:40` and `08:10` on Saturday, so availability checks demonstrate that existing bookings affect available tee times.

## Tool Logs

Every Retell tool request/result/error is written as JSONL:

```text
logs/tool-calls.jsonl
```

Watch it live:

```bash
tail -f logs/tool-calls.jsonl
```

## Free Deployment: Vercel + Neon

### Chunk 1: Create Neon database

1. Go to `https://neon.com`.
2. Create a free project.
3. Open the project dashboard.
4. Copy the pooled connection string.
5. Keep it ready as `DATABASE_URL`.

### Chunk 2: Create Vercel project

1. Go to `https://vercel.com/new`.
2. Import `Chakit22/fairwayops-ai`.
3. Framework should auto-detect as Next.js.
4. Keep build command as `pnpm build`.
5. Keep output settings default.

### Chunk 3: Add Vercel environment variables

Add these in Vercel Project Settings → Environment Variables:

```text
DATABASE_URL=your Neon pooled connection string
RETELL_API_KEY=your Retell API key
RETELL_AGENT_ID=your Retell agent id
```

Apply them to Production, Preview, and Development unless you want separate values.

### Chunk 4: Deploy

1. Click Deploy in Vercel.
2. Open the deployed dashboard URL.
3. First request creates the Postgres tables and seed data automatically.

### Chunk 5: Update Retell

Replace the local/ngrok tool URLs with the deployed Vercel URLs listed above.
