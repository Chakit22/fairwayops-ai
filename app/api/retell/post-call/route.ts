import { NextResponse } from "next/server";
import { savePostCall } from "@/lib/db";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[retell:post-call] incoming payload", JSON.stringify(body, null, 2));
    logEvent("post-call:incoming", body);
    const result = await savePostCall(body);
    console.log("[retell:post-call] result", JSON.stringify(result, null, 2));
    logEvent("post-call:result", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[retell:post-call] failed", error);
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
