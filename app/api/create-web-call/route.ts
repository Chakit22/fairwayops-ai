import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey) {
    return Response.json(
      { error: "RETELL_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }
  if (!agentId) {
    return Response.json(
      { error: "RETELL_AGENT_ID is not set. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agent_id: agentId }),
  });

  if (!res.ok) {
    const detail = await res.text();
    logEvent("create_web_call_error", { status: res.status, detail });
    return Response.json(
      { error: `Retell create-web-call failed (${res.status}): ${detail}` },
      { status: 502 },
    );
  }

  const data = await res.json();
  logEvent("create_web_call", { call_id: data.call_id, agent_id: agentId });
  return Response.json({
    access_token: data.access_token,
    call_id: data.call_id,
  });
}
