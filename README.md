# FairwayOps AI

AI receptionist demo for a private golf club.

This app is intentionally small:

- Next.js dashboard at `/`
- SQLite database at `data/fairwayops.sqlite`
- Retell-compatible tool-call API routes
- Post-call webhook route
- Seeded tee times, bookings, waitlist entries, and calls

## Run

```bash
pnpm install
pnpm dev
```

The project is pinned to Node `25.2.1` via `.nvmrc` and `.node-version`.
The package scripts explicitly run Next with `/opt/homebrew/bin/node` so the
native `better-sqlite3` binding uses the matching Node ABI.

Open:

```text
http://localhost:3000
```

## Web Call (talk to the agent in the browser)

1. Copy `.env.example` to `.env.local` (already created) and fill in:
   - `RETELL_API_KEY` — Retell dashboard → Settings → API Keys
   - `RETELL_AGENT_ID` — open your agent in the Retell dashboard and copy its agent id
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

## Production Note

SQLite is used for fast local demo persistence. For a deployed production app, move the same tables to Postgres/Supabase/Neon.
