import fs from "node:fs";
import path from "node:path";

const logDir = path.join(process.cwd(), "logs");
const logPath = path.join(logDir, "tool-calls.jsonl");
const canWriteLocalLogs = process.env.VERCEL !== "1";

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export function logEvent(event: string, payload: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    payload: safeJson(payload),
  };

  if (!canWriteLocalLogs) {
    console.log("[fairwayops:event]", JSON.stringify(entry));
    return;
  }

  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn("[fairwayops:event-log-failed]", error);
    console.log("[fairwayops:event]", JSON.stringify(entry));
  }
}

export function getLogPath() {
  return logPath;
}
