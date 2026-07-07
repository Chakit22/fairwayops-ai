export function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function unwrapRetellPayload(body: any) {
  const candidates = [
    body?.args,
    body?.arguments,
    body?.parameters,
    body?.payload,
    body?.data,
    body?.input,
    body?.tool_input,
    body?.tool_call?.arguments,
    body?.toolCall?.arguments,
    body?.function?.arguments,
    body,
  ].map(parseMaybeJson);

  return (
    candidates.find(
      (candidate: any) =>
        candidate &&
        typeof candidate === "object" &&
        !("call" in candidate && "args" in candidate),
    ) ?? body
  );
}

export function toRetellToolResponse(
  result: any,
  fallbackMessage = "Tool completed.",
) {
  const success = typeof result?.success === "boolean" ? result.success : true;
  const message =
    typeof result?.message === "string" && result.message.trim().length > 0
      ? result.message
      : fallbackMessage;
  const error =
    typeof result?.error === "string" && result.error.trim().length > 0
      ? result.error
      : undefined;

  let data = result && typeof result === "object" ? { ...result } : result;
  if (data && typeof data === "object") {
    delete data.success;
    delete data.message;
    delete data.error;
    if (Object.keys(data).length === 0) data = null;
  }

  const response: Record<string, unknown> = {
    success,
    message,
    data,
  };

  if (error) response.error = error;
  if (error === "slot_unavailable") {
    response.next_action = "offer_waitlist_or_alternative_time";
  }
  if (data?.available === false) {
    response.next_action = "offer_alternative_time_or_waitlist";
  }

  return response;
}

export function toRetellErrorResponse(message: string, error: unknown) {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : String(error),
    data: null,
  };
}
