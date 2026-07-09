import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type AvailabilityInput = {
  date: string;
  time_window: string;
  number_of_players: number;
  holes?: number;
};

export type BookingInput = {
  name: string;
  contact: string;
  member_or_guest: "member" | "guest";
  date: string;
  selected_slot: string;
  number_of_players: number;
  holes?: number;
  notes?: string;
};

export type WaitlistInput = {
  name: string;
  contact: string;
  date: string;
  time_window: string;
  number_of_players: number;
  notes?: string;
};

type SqlClient = ReturnType<typeof neon>;
type DbRow = Record<string, any>;

let sqlClient: SqlClient | null = null;
let initPromise: Promise<void> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Create a Neon database and set DATABASE_URL in Vercel.");
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

function nowIso() {
  return new Date().toISOString();
}

function melbourneDate(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return formatter.format(base);
}

async function createSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS tee_times (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      holes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'available'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS booking_requests (
      id TEXT PRIMARY KEY,
      caller_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      member_or_guest TEXT NOT NULL,
      tee_time_id TEXT,
      date TEXT NOT NULL,
      selected_slot TEXT NOT NULL,
      number_of_players INTEGER NOT NULL,
      holes INTEGER NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY,
      caller_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      date TEXT NOT NULL,
      time_window TEXT NOT NULL,
      number_of_players INTEGER NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      retell_call_id TEXT,
      caller_name TEXT,
      intent TEXT,
      summary TEXT,
      transcript TEXT,
      sentiment TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      raw_payload TEXT,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      tool_name TEXT NOT NULL,
      request_payload TEXT NOT NULL,
      response_payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
}

async function syncBookedTeeTimeStatuses() {
  const sql = getSql();
  await sql`
    UPDATE tee_times
    SET status = 'booked'
    WHERE id IN (
      SELECT tee_time_id
      FROM booking_requests
      WHERE tee_time_id IS NOT NULL
        AND status IN ('pending', 'confirmed')
    )
  `;
}

async function seedData() {
  const sql = getSql();
  const [count] = (await sql`SELECT COUNT(*)::int AS count FROM tee_times`) as DbRow[];
  if (Number(count?.count ?? 0) > 0) return;

  const dailySlots = [
    ["07:40", "12:10", 4, 18, "available"],
    ["08:10", "10:10", 4, 9, "available"],
    ["08:50", "13:20", 2, 18, "available"],
    ["09:20", "11:20", 4, 9, "available"],
    ["10:10", "14:40", 2, 18, "available"],
    ["11:30", "13:30", 4, 9, "available"],
    ["13:10", "17:40", 4, 18, "available"],
    ["15:20", "17:20", 4, 9, "available"],
  ] as const;

  const dates = Array.from({ length: 7 }, (_, index) => melbourneDate(index + 1));

  for (const date of dates) {
    for (const [startTime, endTime, capacity, holes, status] of dailySlots) {
      await sql`
        INSERT INTO tee_times (id, date, start_time, end_time, capacity, holes, status)
        VALUES (${randomUUID()}, ${date}, ${startTime}, ${endTime}, ${capacity}, ${holes}, ${status})
      `;
    }
  }

  const [tomorrow810] = (await sql`
    SELECT id FROM tee_times WHERE date = ${dates[0]} AND start_time = '08:10' LIMIT 1
  `) as DbRow[];
  const [tomorrow740] = (await sql`
    SELECT id FROM tee_times WHERE date = ${dates[0]} AND start_time = '07:40' LIMIT 1
  `) as DbRow[];

  if (tomorrow810?.id) {
    await sql`
      INSERT INTO booking_requests (
        id, caller_name, contact, member_or_guest, tee_time_id, date, selected_slot,
        number_of_players, holes, notes, status, created_at
      )
      VALUES (
        ${randomUUID()}, 'Oliver Chen', 'oliver@example.com', 'member', ${tomorrow810.id},
        ${dates[0]}, '08:10', 4, 9,
        'Seed booking: blocks 8:10 tomorrow for live availability demo.',
        'pending', ${nowIso()}
      )
    `;
  }

  if (tomorrow740?.id) {
    await sql`
      INSERT INTO booking_requests (
        id, caller_name, contact, member_or_guest, tee_time_id, date, selected_slot,
        number_of_players, holes, notes, status, created_at
      )
      VALUES (
        ${randomUUID()}, 'Priya Shah', '+61411111111', 'member', ${tomorrow740.id},
        ${dates[0]}, '07:40', 4, 18,
        'Seed booking: early group tomorrow.',
        'confirmed', ${nowIso()}
      )
    `;
  }

  await sql`
    INSERT INTO waitlist_entries (
      id, caller_name, contact, date, time_window, number_of_players, notes, status, created_at
    )
    VALUES (
      ${randomUUID()}, 'Grace Williams', 'grace@example.com', ${dates[0]}, '07:00-09:00',
      2, 'Seed waitlist: wants an early tee time tomorrow.', 'open', ${nowIso()}
    )
  `;

  await sql`
    INSERT INTO calls (
      id, retell_call_id, caller_name, intent, summary, transcript, sentiment, status, raw_payload, created_at
    )
    VALUES (
      ${randomUUID()}, 'seed_call_001', 'Oliver Chen', 'tee_time_booking',
      'Seed call: Oliver requested tomorrow at 8:10 AM for four players.',
      'Caller asked for tomorrow morning. Agent created a booking request.',
      'neutral', 'completed', '{}', ${nowIso()}
    )
  `;
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await createSchema();
      await seedData();
      await syncBookedTeeTimeStatuses();
    })();
  }
  return initPromise;
}

export function getDbPath() {
  return process.env.DATABASE_URL ? "Neon Postgres" : "DATABASE_URL not configured";
}

export function parseWindow(timeWindow: string) {
  console.log("[db:parseWindow] raw time_window", JSON.stringify(timeWindow));
  const normalized = String(timeWindow)
    .trim()
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "");
  console.log("[db:parseWindow] normalized time_window", JSON.stringify(normalized));

  const [rawStart, rawEnd] = normalized.split("-").map((part) => part.trim());

  const normalizeTime = (value: string | undefined) => {
    if (!value) return "";
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return value;
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  };

  const start = normalizeTime(rawStart);
  const end = normalizeTime(rawEnd);
  console.log(
    "[db:parseWindow] parsed",
    JSON.stringify({ rawStart, rawEnd, start, end }),
  );

  if (
    !start ||
    !end ||
    !/^\d{2}:\d{2}$/.test(start) ||
    !/^\d{2}:\d{2}$/.test(end)
  ) {
    throw new Error(
      `time_window must be in HH:MM-HH:MM format, e.g. 07:30-08:30. Received: ${JSON.stringify(timeWindow)}`,
    );
  }
  return { start, end };
}

export async function checkAvailability(input: AvailabilityInput) {
  await ensureInitialized();
  const sql = getSql();
  console.log("[db:checkAvailability] input", JSON.stringify(input, null, 2));
  const { start, end } = parseWindow(input.time_window);
  const players = Number(input.number_of_players);
  const holes = Number(input.holes ?? 18);
  console.log(
    "[db:checkAvailability] normalized query",
    JSON.stringify({ date: input.date, start, end, players, holes }, null, 2),
  );

  const slots = (await sql`
    SELECT
      tt.*,
      br.id AS booking_id,
      br.caller_name AS booked_by,
      br.status AS booking_status
    FROM tee_times tt
    LEFT JOIN booking_requests br
      ON br.tee_time_id = tt.id
      AND br.status IN ('pending', 'confirmed')
    WHERE tt.date = ${input.date}
      AND tt.start_time >= ${start}
      AND tt.start_time <= ${end}
      AND tt.holes = ${holes}
      AND tt.status = 'available'
    ORDER BY tt.start_time ASC
  `) as DbRow[];
  console.log("[db:checkAvailability] candidate slots from DB", JSON.stringify(slots, null, 2));

  const availableSlots = slots
    .filter((slot: any) => !slot.booking_id)
    .filter((slot: any) => Number(slot.capacity) >= players)
    .map((slot: any) => ({
      tee_time_id: slot.id,
      date: slot.date,
      selected_slot: slot.start_time,
      start_time: slot.start_time,
      end_time: slot.end_time,
      players_supported: slot.capacity,
      holes: slot.holes,
    }));

  const blocked = slots
    .filter((slot: any) => slot.booking_id || Number(slot.capacity) < players)
    .map((slot: any) => ({
      time: slot.start_time,
      reason: slot.booking_id
        ? `Already has an active booking request for ${slot.booked_by}.`
        : `Only supports ${slot.capacity} players.`,
    }));

  const result = {
    available: availableSlots.length > 0,
    requested: {
      date: input.date,
      time_window: input.time_window,
      number_of_players: players,
      holes,
    },
    slots: availableSlots,
    blocked,
    message:
      availableSlots.length > 0
        ? `I found ${availableSlots.length} available tee time${availableSlots.length === 1 ? "" : "s"}.`
        : "No tee times are available in that requested window.",
  };
  console.log("[db:checkAvailability] final result", JSON.stringify(result, null, 2));
  return result;
}

export async function createBooking(input: BookingInput) {
  await ensureInitialized();
  const sql = getSql();
  console.log("[db:createBooking] input", JSON.stringify(input, null, 2));
  const holes = Number(input.holes ?? 18);
  const [slot] = (await sql`
    SELECT tt.*
    FROM tee_times tt
    LEFT JOIN booking_requests br
      ON br.tee_time_id = tt.id
      AND br.status IN ('pending', 'confirmed')
    WHERE tt.date = ${input.date}
      AND tt.start_time = ${input.selected_slot}
      AND tt.holes = ${holes}
      AND tt.status = 'available'
      AND br.id IS NULL
    LIMIT 1
  `) as DbRow[];
  console.log("[db:createBooking] matched slot", JSON.stringify(slot ?? null, null, 2));

  if (!slot) {
    const result = {
      success: false,
      error: "slot_unavailable",
      message: "That tee time is no longer available. Offer the waitlist or suggest another time.",
    };
    console.log("[db:createBooking] failure result", JSON.stringify(result, null, 2));
    return result;
  }

  if (Number(slot.capacity) < Number(input.number_of_players)) {
    const result = {
      success: false,
      error: "capacity_too_low",
      message: `That slot only supports ${slot.capacity} players.`,
    };
    console.log("[db:createBooking] failure result", JSON.stringify(result, null, 2));
    return result;
  }

  const [updatedSlot] = (await sql`
    UPDATE tee_times
    SET status = 'booked'
    WHERE id = ${slot.id}
      AND status = 'available'
    RETURNING id
  `) as DbRow[];

  if (!updatedSlot?.id) {
    const result = {
      success: false,
      error: "slot_unavailable",
      message: "That tee time was just taken. Offer the waitlist or suggest another time.",
    };
    console.log("[db:createBooking] race failure result", JSON.stringify(result, null, 2));
    return result;
  }

  const id = randomUUID();
  await sql`
    INSERT INTO booking_requests (
      id, caller_name, contact, member_or_guest, tee_time_id, date, selected_slot,
      number_of_players, holes, notes, status, created_at
    )
    VALUES (
      ${id}, ${input.name}, ${input.contact}, ${input.member_or_guest}, ${slot.id},
      ${input.date}, ${input.selected_slot}, ${Number(input.number_of_players)}, ${holes},
      ${input.notes ?? ""}, 'pending', ${nowIso()}
    )
  `;

  const result = {
    success: true,
    booking_request_id: id,
    status: "pending",
    tee_time_status: "booked",
    message: "Booking request created. The team will confirm it shortly.",
  };
  console.log("[db:createBooking] success result", JSON.stringify(result, null, 2));
  return result;
}

export async function addWaitlist(input: WaitlistInput) {
  await ensureInitialized();
  const sql = getSql();
  console.log("[db:addWaitlist] input", JSON.stringify(input, null, 2));
  parseWindow(input.time_window);
  const id = randomUUID();
  await sql`
    INSERT INTO waitlist_entries (
      id, caller_name, contact, date, time_window, number_of_players, notes, status, created_at
    )
    VALUES (
      ${id}, ${input.name}, ${input.contact}, ${input.date}, ${input.time_window},
      ${Number(input.number_of_players)}, ${input.notes ?? ""}, 'open', ${nowIso()}
    )
  `;

  const result = {
    success: true,
    waitlist_id: id,
    status: "open",
    message: "Waitlist entry created. The team will contact the caller if a suitable slot opens.",
  };
  console.log("[db:addWaitlist] result", JSON.stringify(result, null, 2));
  return result;
}

export async function savePostCall(payload: any) {
  await ensureInitialized();
  const sql = getSql();
  console.log("[db:savePostCall] payload", JSON.stringify(payload, null, 2));
  const id = randomUUID();
  const retellCallId =
    payload.call_id ?? payload.call?.call_id ?? payload.retell_call_id ?? null;
  const analysis = payload.call_analysis ?? payload.analysis ?? {};
  const callerName =
    analysis.caller_name ?? payload.caller_name ?? payload.customer_name ?? null;

  await sql`
    INSERT INTO calls (
      id, retell_call_id, caller_name, intent, summary, transcript, sentiment,
      status, raw_payload, created_at
    )
    VALUES (
      ${id},
      ${retellCallId},
      ${callerName},
      ${analysis.intent ?? payload.intent ?? "post_call"},
      ${analysis.call_summary ?? analysis.summary ?? payload.summary ?? "Post-call webhook received."},
      ${payload.transcript ?? payload.transcript_object?.map?.((item: any) => item.content).join("\n") ?? ""},
      ${analysis.sentiment ?? payload.sentiment ?? null},
      ${payload.call_status ?? payload.status ?? "completed"},
      ${JSON.stringify(payload, null, 2)},
      ${nowIso()}
    )
  `;

  const result = {
    success: true,
    call_log_id: id,
    message: "Post-call analysis saved.",
  };
  console.log("[db:savePostCall] result", JSON.stringify(result, null, 2));
  return result;
}

export async function logToolCall(
  toolName: string,
  requestPayload: unknown,
  responsePayload: unknown,
) {
  try {
    await ensureInitialized();
    const sql = getSql();
    console.log(
      "[db:logToolCall]",
      JSON.stringify({ toolName, requestPayload, responsePayload }, null, 2),
    );
    await sql`
      INSERT INTO tool_calls (id, tool_name, request_payload, response_payload, created_at)
      VALUES (
        ${randomUUID()},
        ${toolName},
        ${JSON.stringify(requestPayload, null, 2)},
        ${JSON.stringify(responsePayload, null, 2)},
        ${nowIso()}
      )
    `;
  } catch (error) {
    console.error("[db:logToolCall] failed", error);
  }
}

export async function getDashboardData() {
  await ensureInitialized();
  const sql = getSql();
  const [teeTimes, bookingRequests, waitlistEntries, calls] = await Promise.all([
    sql`SELECT * FROM tee_times ORDER BY date, start_time` as Promise<DbRow[]>,
    sql`SELECT * FROM booking_requests ORDER BY created_at DESC` as Promise<DbRow[]>,
    sql`SELECT * FROM waitlist_entries ORDER BY created_at DESC` as Promise<DbRow[]>,
    sql`SELECT * FROM calls ORDER BY created_at DESC` as Promise<DbRow[]>,
  ]);

  return {
    db_path: getDbPath(),
    tee_times: teeTimes,
    booking_requests: bookingRequests,
    waitlist_entries: waitlistEntries,
    calls,
    tool_calls: [],
  };
}
