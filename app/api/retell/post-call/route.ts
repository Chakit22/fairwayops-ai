import { NextResponse } from "next/server";
import { savePostCall } from "@/lib/db";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logEvent("post-call:incoming", body);
    const result = await savePostCall(body);
    logEvent("post-call:result", result);
    return NextResponse.json(result);
  } catch (error) {
    logEvent("post-call:error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Unable to save post-call payload."
      },
      { status: 400 }
    );
  }
}
