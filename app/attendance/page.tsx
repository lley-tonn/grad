"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, LogOut, RefreshCw, Save } from "lucide-react";

type RSVPStatus = "pending" | "attending" | "not_attending" | "maybe";
type Guest = { id: string; name: string; status: RSVPStatus; message: string; confirmedAt: string | null };
const statusLabels: Record<RSVPStatus, string> = { pending: "Awaiting reply", attending: "Attending", not_attending: "Unable to attend", maybe: "Undecided" };
const formatConfirmedAt = (date: string | null) => date ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(date)) : "—";

export default function AttendancePage() {
  const [password, setPassword] = useState("");
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const dirtyGuestIds = useRef(new Set<string>());

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/attendance", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't load attendance.");
      setGuests(current => result.guests.map((serverGuest: Guest) => {
        const localGuest = current?.find(guest => guest.id === serverGuest.id);
        return dirtyGuestIds.current.has(serverGuest.id) && localGuest ? localGuest : serverGuest;
      }));
    } catch (cause) {
      setGuests(null);
      if (cause instanceof Error && !cause.message.toLowerCase().includes("sign in")) setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAttendance(); }, [loadAttendance]);
  useEffect(() => {
    if (!guests) return;
    const timer = setInterval(() => { void loadAttendance(); }, 10000);
    return () => clearInterval(timer);
  }, [guests, loadAttendance]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/attendance/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't sign in.");
      setPassword("");
      await loadAttendance();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't sign in.");
      setLoading(false);
    }
  }

  function editGuest(id: string, field: "name" | "status" | "message", value: string) {
    dirtyGuestIds.current.add(id);
    setGuests(current => current?.map(guest => guest.id === id ? { ...guest, [field]: value } : guest) ?? null);
  }

  async function saveGuest(guest: Guest) {
    setSavingId(guest.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guest.id, name: guest.name, status: guest.status, message: guest.message })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't save this guest.");
      dirtyGuestIds.current.delete(guest.id);
      setNotice(`Saved ${guest.name}.`);
      await loadAttendance();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save this guest.");
    } finally {
      setSavingId("");
    }
  }

  async function signOut() {
    await fetch("/api/attendance/auth", { method: "DELETE" });
    setGuests(null);
    setNotice("");
    setError("");
  }

  const confirmedCount = guests?.filter(guest => guest.status === "attending").length ?? 0;

  return (
    <main className="attendance-page">
      <div className="attendance-card">
        <div className="section-kicker">PRIVATE HOST PAGE <span>— ATTENDANCE</span></div>
        <h1>Guest <em>attendance</em></h1>
        {guests ? <>
          <div className="attendance-toolbar">
            <p><strong>{confirmedCount}</strong> of {guests.length} guests confirmed</p>
            <div>
              <button className="attendance-action" onClick={() => void loadAttendance()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Refresh</button>
              <button className="attendance-action" onClick={() => void signOut()}><LogOut size={15} aria-hidden="true" /> Sign out</button>
            </div>
          </div>
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <caption className="sr-only">Guest attendance responses and messages</caption>
              <thead><tr><th scope="col">Guest name</th><th scope="col">Response</th><th scope="col">Guest message</th><th scope="col">Confirmed</th><th scope="col">Confirmed on</th><th scope="col"><span className="sr-only">Save changes</span></th></tr></thead>
              <tbody>{guests.map(guest => <tr key={guest.id}>
                <td><label className="sr-only" htmlFor={`guest-name-${guest.id}`}>Guest name</label><input id={`guest-name-${guest.id}`} className="attendance-input attendance-name" value={guest.name} maxLength={120} disabled={savingId === guest.id} onChange={event => editGuest(guest.id, "name", event.target.value)} /></td>
                <td><label className="sr-only" htmlFor={`guest-status-${guest.id}`}>Response for {guest.name}</label><select id={`guest-status-${guest.id}`} className="attendance-input attendance-select" value={guest.status} disabled={savingId === guest.id} onChange={event => editGuest(guest.id, "status", event.target.value)}>{(Object.keys(statusLabels) as RSVPStatus[]).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td>
                <td><label className="sr-only" htmlFor={`guest-message-${guest.id}`}>Guest message for {guest.name}</label><input id={`guest-message-${guest.id}`} className="attendance-input attendance-message" value={guest.message} maxLength={500} placeholder="No message" disabled={savingId === guest.id} onChange={event => editGuest(guest.id, "message", event.target.value)} /></td>
                <td className="attendance-confirm-cell"><input className="attendance-checkbox" type="checkbox" checked={guest.status === "attending"} readOnly aria-label={`${guest.name}: ${guest.status === "attending" ? "attendance confirmed" : "attendance not confirmed"}`} /></td>
                <td className="attendance-date">{formatConfirmedAt(guest.confirmedAt)}</td>
                <td><button className="attendance-save" onClick={() => void saveGuest(guest)} disabled={savingId === guest.id || loading} aria-label={`Save changes for ${guest.name}`}>{savingId === guest.id ? "Saving…" : <><Save size={14} aria-hidden="true" /><span>Save</span></>}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {notice && <p className="attendance-notice" role="status">{notice}</p>}
          <p className="attendance-live-note">Updates from guests appear automatically while this page is open.</p>
        </> : <form className="attendance-login" onSubmit={signIn}>
          <p>Sign in to review responses, manage guest names and read messages.</p>
          <label className="field-label" htmlFor="attendance-password">HOST PASSWORD</label>
          <input id="attendance-password" className="field" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
          <button className="button button-primary modal-submit" type="submit" disabled={loading}><LockKeyhole size={16} aria-hidden="true" /> {loading ? "Signing in..." : "Open attendance list"}</button>
        </form>}
        {error && <p className="form-feedback attendance-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
