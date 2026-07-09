import { NextResponse } from "next/server";
import { createBooking, logToolCall } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import {
  toRetellErrorResponse,
  toRetellToolResponse,
  unwrapRetellPayload,
} from "@/lib/retellPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const toolName = "createBookingRequest";
  let body: any = {};
  try {
    body = await request.json();
    console.log(`[tool:${toolName}] incoming payload`, JSON.stringify(body, null, 2));
    logEvent(`${toolName}:incoming`, body);
    const normalizedBody = unwrapRetellPayload(body);
    console.log(
      `[tool:${toolName}] normalized payload`,
      JSON.stringify(normalizedBody, null, 2),
    );
    logEvent(`${toolName}:normalized`, normalizedBody);
    const result = await createBooking(normalizedBody);
    console.log(`[tool:${toolName}] result`, JSON.stringify(result, null, 2));
    logEvent(`${toolName}:result`, result);
    const response = toRetellToolResponse(result, "Booking request created.");
    logEvent(`${toolName}:response`, response);
    await logToolCall("createBookingRequest", body, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[tool:${toolName}] failed`, error);
    logEvent(`${toolName}:error`, {
      body,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response = toRetellErrorResponse(
      "Unable to create booking request.",
      error,
    );
    await logToolCall("createBookingRequest", body, response);
    return NextResponse.json(response);
  }
}
