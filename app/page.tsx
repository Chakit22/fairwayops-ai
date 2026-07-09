import Link from "next/link";
import { getDashboardData } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortId(id: string) {
  return id.slice(0, 8);
}

function Empty({ label }: { label: string }) {
  return <div className="empty">No {label} yet.</div>;
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const stats = [
    ["Calls", data.calls.length],
    ["Bookings", data.booking_requests.length],
    ["Waitlist", data.waitlist_entries.length],
  ];

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">FairwayOps AI</p>
          <h1>Golf Club Receptionist Dashboard</h1>
          <p className="lede">
            Neon Postgres-backed demo showing calls, booking requests, waitlist entries,
            tee-time inventory, and tool-call logs.
          </p>
          <Link className="call-link" href="/call">
            Talk to the agent →
          </Link>
        </div>
        <div className="db-path">
          <span>Database</span>
          <code>{data.db_path}</code>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Calls Occurred</h2>
            <span>{data.calls.length}</span>
          </div>
          {data.calls.length === 0 ? (
            <Empty label="calls" />
          ) : (
            <div className="list">
              {data.calls.map((call: any) => (
                <article className="row-card" key={call.id}>
                  <div className="row-top">
                    <strong>{call.caller_name ?? "Unknown caller"}</strong>
                    <span>{call.intent}</span>
                  </div>
                  <p>{call.summary}</p>
                  <small>{call.created_at}</small>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Bookings Made</h2>
            <span>{data.booking_requests.length}</span>
          </div>
          <div className="list">
            {data.booking_requests.map((booking: any) => (
              <article className="row-card" key={booking.id}>
                <div className="row-top">
                  <strong>{booking.caller_name}</strong>
                  <span>{booking.status}</span>
                </div>
                <p>
                  {booking.date} at {booking.selected_slot} · {booking.number_of_players} players ·{" "}
                  {booking.holes} holes
                </p>
                <small>{booking.contact}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Waitlist Entries</h2>
            <span>{data.waitlist_entries.length}</span>
          </div>
          {data.waitlist_entries.length === 0 ? (
            <Empty label="waitlist entries" />
          ) : (
            <div className="list">
              {data.waitlist_entries.map((entry: any) => (
                <article className="row-card" key={entry.id}>
                  <div className="row-top">
                    <strong>{entry.caller_name}</strong>
                    <span>{entry.status}</span>
                  </div>
                  <p>
                    {entry.date} · {entry.time_window} · {entry.number_of_players} players
                  </p>
                  <small>{entry.notes || entry.contact}</small>
                </article>
              ))}
            </div>
          )}
        </div>

      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Simple Database View: Tee-Time Inventory</h2>
          <span>{data.tee_times.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Start</th>
                <th>Capacity</th>
                <th>Holes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tee_times.map((slot: any) => (
                <tr key={slot.id}>
                  <td>{shortId(slot.id)}</td>
                  <td>{slot.date}</td>
                  <td>{slot.start_time}</td>
                  <td>{slot.capacity}</td>
                  <td>{slot.holes}</td>
                  <td>{slot.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
