"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

type CallState = "idle" | "connecting" | "live" | "ended" | "error";

type TranscriptTurn = {
  role: string;
  content: string;
};

const stateLabels: Record<CallState, string> = {
  idle: "Tap the orb to talk to the receptionist",
  connecting: "Connecting…",
  live: "Live — speak naturally, tap the orb to hang up",
  ended: "Call ended — tap the orb to call again",
  error: "Something went wrong — tap the orb to retry",
};

export default function CallPage() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [agentTalking, setAgentTalking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;

    client.on("call_started", () => {
      setCallState("live");
      setErrorMessage(null);
    });
    client.on("call_ended", () => {
      setCallState("ended");
      setAgentTalking(false);
    });
    client.on("agent_start_talking", () => setAgentTalking(true));
    client.on("agent_stop_talking", () => setAgentTalking(false));
    client.on("update", (update: { transcript?: TranscriptTurn[] }) => {
      if (Array.isArray(update.transcript)) {
        setTranscript(update.transcript.slice(-6));
      }
    });
    client.on("error", () => {
      setCallState("error");
      setAgentTalking(false);
      setErrorMessage("Unable to continue the voice call. Please try again.");
      client.stopCall();
    });

    return () => {
      client.stopCall();
    };
  }, []);

  async function startCall() {
    setCallState("connecting");
    setErrorMessage(null);
    setTranscript([]);

    try {
      const res = await fetch("/api/create-web-call", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      await clientRef.current?.startCall({ accessToken: data.access_token });
    } catch {
      setCallState("error");
      setErrorMessage("Unable to start the voice call. Please try again.");
    }
  }

  function handleOrbClick() {
    if (callState === "connecting" || callState === "live") {
      clientRef.current?.stopCall();
      setCallState("ended");
      setAgentTalking(false);
      return;
    }
    void startCall();
  }

  return (
    <main className="page-shell call-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">FairwayOps AI</p>
          <h1>Talk to the Receptionist</h1>
          <p className="lede">
            Web call straight to the Fairway Golf Club receptionist. Ask about tee times,
            bookings, or the waitlist.
          </p>
        </div>
        <div className="db-path">
          <span>Dashboard</span>
          <Link href="/">← Back to dashboard</Link>
        </div>
      </section>

      <section className="orb-stage">
        <button
          type="button"
          className="orb"
          data-state={callState}
          data-talking={agentTalking}
          onClick={handleOrbClick}
          aria-label={callState === "live" ? "End call" : "Start call"}
        >
          <span className="orb-core" />
        </button>
        <p className="orb-status">{stateLabels[callState]}</p>
        {errorMessage ? <p className="orb-error">{errorMessage}</p> : null}
      </section>

      {transcript.length > 0 ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Live Transcript</h2>
            <span>{callState === "live" ? "In progress" : "Last call"}</span>
          </div>
          <div className="list">
            {transcript.map((turn, i) => (
              <article className="row-card" key={i}>
                <div className="row-top">
                  <strong>{turn.role === "agent" ? "Receptionist" : "You"}</strong>
                </div>
                <p>{turn.content}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
