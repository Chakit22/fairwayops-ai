import fs from "node:fs";
import path from "node:path";

const logDir = path.join(process.cwd(), "logs");
const logPath = path.join(logDir, "tool-calls.jsonl");

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export function logEvent(event: string, payload: unknown) {
  fs.mkdirSync(logDir, { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    event,
    payload: safeJson(payload),
  };

  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function getLogPath() {
  return logPath;
}
