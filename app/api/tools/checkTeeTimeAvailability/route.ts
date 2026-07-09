import { NextResponse } from "next/server";
import { checkAvailability, logToolCall } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import {
  toRetellErrorResponse,
  toRetellToolResponse,
  unwrapRetellPayload,
} from "@/lib/retellPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAvailabilityPayload(body: any) {
  const payload = unwrapRetellPayload(body) as any;
  const timeWindow =
    payload?.time_window ??
    payload?.timeWindow ??
    payload?.preferred_time_window ??
    payload?.preferredTimeWindow ??
    (payload?.start_time && payload?.end_time
      ? `${payload.start_time}-${payload.end_time}`
      : undefined) ??
    (payload?.time_window?.start && payload?.time_window?.end
      ? `${payload.time_window.start}-${payload.time_window.end}`
      : undefined);

  return {
    ...payload,
    date: payload?.date,
    time_window: timeWindow,
    number_of_players: payload?.number_of_players ?? payload?.players,
    holes: payload?.holes,
  };
}

export async function POST(request: Request) {
  const toolName = "checkTeeTimeAvailability";
  let body: any = {};
  try {
    body = await request.json();
    console.log(`[tool:${toolName}] incoming payload`, JSON.stringify(body, null, 2));
    logEvent(`${toolName}:incoming`, body);
    console.log(`[tool:${toolName}] incoming payload keys`, Object.keys(body ?? {}));
    const normalizedBody = normalizeAvailabilityPayload(body);
    console.log(
      `[tool:${toolName}] normalized payload`,
      JSON.stringify(normalizedBody, null, 2),
    );
    logEvent(`${toolName}:normalized`, normalizedBody);
    const result = await checkAvailability(normalizedBody);
    console.log(`[tool:${toolName}] result`, JSON.stringify(result, null, 2));
    logEvent(`${toolName}:result`, result);
    const response = toRetellToolResponse(
      result,
      "Tee-time availability checked.",
    );
    logEvent(`${toolName}:response`, response);
    await logToolCall("checkTeeTimeAvailability", body, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[tool:${toolName}] failed`, error);
    logEvent(`${toolName}:error`, {
      body,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response = toRetellErrorResponse(
      "Unable to check tee-time availability.",
      error,
    );
    await logToolCall("checkTeeTimeAvailability", body, response);
    return NextResponse.json(response);
  }
}
