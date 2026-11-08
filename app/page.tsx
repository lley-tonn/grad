"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import QRCode from "qrcode";
import {
  ArrowDown, ArrowRight, CalendarDays, Check, Code2,
  Copy, ExternalLink, MapPin, Menu, Terminal, X
} from "lucide-react";
import { graduation, journey } from "@/lib/config";

type RSVPStatus = "attending" | "maybe" | "not_attending";
const responseLabels: Record<RSVPStatus, string> = { attending: "Attending", maybe: "Undecided", not_attending: "Unable to attend" };

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const distance = now === null ? 0 : Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance % 86400000) / 3600000),
    minutes: Math.floor((distance % 3600000) / 60000),
    seconds: Math.floor((distance % 60000) / 1000),
    complete: now !== null && distance === 0
  };
}

export default function Home() {
  const countdown = useCountdown(graduation.eventDateISO);
  const reduceMotion = useReducedMotion() ?? false;
  const [guest, setGuest] = useState("");
  const [guestId, setGuestId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>("attending");
  const [rsvpConfirmed, setRsvpConfirmed] = useState(false);
  const [returningGuests, setReturningGuests] = useState<string[]>([]);
  const [returningStatus, setReturningStatus] = useState<RSVPStatus | null>(null);
  const rsvpDialogRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "LLEYTON.OS [Version 2026.11]",
    "Copyright (c) Lleyton Adrian. All rights reserved.",
    "",
    "Welcome, guest. Type 'help' to see available commands."
  ]);
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGuest(params.get("guest") || "");
    setGuestId(params.get("id") || "");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("guest");
    cleanUrl.searchParams.delete("id");
    setQrData(window.location.origin + cleanUrl.pathname);
    try {
      const savedResponse = JSON.parse(localStorage.getItem("lleyton-graduation-response") || "null");
      const allowed = ["attending", "maybe", "not_attending"];
      if (savedResponse && Array.isArray(savedResponse.guests) && savedResponse.guests.every((name: unknown) => typeof name === "string") && allowed.includes(savedResponse.status)) {
        setReturningGuests(savedResponse.guests);
        setReturningStatus(savedResponse.status);
      } else {
        const savedGuests = JSON.parse(localStorage.getItem("lleyton-graduation-confirmed") || "[]");
        if (Array.isArray(savedGuests) && savedGuests.every(name => typeof name === "string") && savedGuests.length > 0) {
          setReturningGuests(savedGuests);
          setReturningStatus("attending");
        }
      }
    } catch { /* Local storage can be unavailable in private browsing. */ }
  }, []);

  useEffect(() => {
    if (!rsvpOpen) return;
    const dialog = rsvpDialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => dialog?.querySelector<HTMLElement>("input, textarea, button")?.focus());
    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") setRsvpOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])')).filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }
    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeys);
      previouslyFocused?.focus();
    };
  }, [rsvpOpen]);

  const greeting = guest.trim() ? `A personal invitation for ${guest.trim()}` : "You're invited";
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (guest) url.searchParams.set("guest", guest);
    if (guestId) url.searchParams.set("id", guestId);
    return url.toString();
  }, [guest, guestId]);

  async function submitRSVP() {
    if (!rsvpName.trim()) {
      setFeedback("Please enter the name on your invitation.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      const response = await fetch("/api/rsvp/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rsvpName, message: rsvpMessage, status: rsvpStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check the guest list.");
      setReturningGuests(result.guests);
      setReturningStatus(rsvpStatus);
      try {
        localStorage.setItem("lleyton-graduation-response", JSON.stringify({ guests: result.guests, status: rsvpStatus }));
        if (rsvpStatus === "attending") localStorage.setItem("lleyton-graduation-confirmed", JSON.stringify(result.guests));
        else localStorage.removeItem("lleyton-graduation-confirmed");
      } catch { /* The response is still saved on the server. */ }
      setRsvpConfirmed(true);
      window.requestAnimationFrame(() => document.getElementById("rsvp-done")?.focus());
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function openRSVP() {
    setRsvpName(guest || returningGuests.join(", "));
    setRsvpMessage("");
    setRsvpStatus(returningStatus || "attending");
    setRsvpConfirmed(returningStatus !== null);
    setFeedback("");
    setRsvpOpen(true);
  }

  useEffect(() => {
    if (!terminalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setTerminalOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [terminalOpen]);

  function runCommand(event: React.FormEvent) {
    event.preventDefault();
    const value = command.trim().toLowerCase();
    const replies: Record<string, string[]> = {
      help: ["Available commands:", "  about       — About this milestone", "  details     — Graduation details", "  journey     — View the journey", "  rsvp        — Open your RSVP", "  celebrate   — Execute celebration protocol", "  clear       — Clear terminal"],
      about: [`${graduation.name}`, graduation.degree, graduation.university, "Status: Graduation milestone unlocked."],
      details: [`Date: ${graduation.dateLabel}`, `Venue: ${graduation.venue}`, `Time: ${graduation.time}`],
      journey: ["Curiosity → Learning → Building → Graduation → What's next."],
      rsvp: ["Close the terminal and use the RSVP button on the invitation."],
      celebrate: ["Compiling good memories...", "Running celebrate.sh...", "SUCCESS: You are part of the next chapter. See you there!"],
      clear: []
    };
    const response = replies[value] ?? [`Command not found: ${value}`, "Type 'help' for available commands."];
    setTerminalLines(value === "clear" ? [] : lines => [...lines, `guest@lleyton:~$ ${command}`, ...response, ""]);
    setCommand("");
  }

  async function copyInvitation() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setFeedback("Invitation link copied.");
    setTimeout(() => setFeedback(""), 2500);
  }

  async function downloadQR() {
    const value = shareUrl || qrData;
    if (!value) return;
    const data = await QRCode.toDataURL(value, { width: 720, margin: 2, color: { dark: "#171717", light: "#FFFFFF" } });
    const link = document.createElement("a");
    link.href = data;
    link.download = `lleyton-graduation-${(guest || "invite").toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  const nav = [
    ["The story", "#story"],
    ["The details", "#details"],
    ["RSVP", "#rsvp"]
  ];
  const eventStart = new Date(graduation.eventDateISO);
  const eventEnd = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);
  const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const calendarText = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lleyton Adrian//Graduation Celebration//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:lleyton-graduation-${utcStamp(eventStart)}@lleytonadrian`, `DTSTAMP:${utcStamp(new Date())}`, `DTSTART:${utcStamp(eventStart)}`, `DTEND:${utcStamp(eventEnd)}`,
    "SUMMARY:Lleyton Adrian's Graduation Celebration", `LOCATION:${graduation.venue.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;")}`,
    "DESCRIPTION:Celebrate Lleyton Adrian's Bachelor of Science in Computer Science graduation.", "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const calendarHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarText)}`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(graduation.venue)}`;

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top">lley-<span>tonn.</span></a>
        <nav className="desktop-nav">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <button className="nav-cta" onClick={openRSVP}>RSVP <ArrowRight size={15} /></button>
        <button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      {menuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}

      <section className="hero" id="top">
        <div className="hero-glow" />
        <div className="hero-content">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .8 }} className="eyebrow"><span className="eyebrow-dot" /> A MILESTONE WORTH SHARING</motion.div>
          <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : .2 }} className="guest-greeting">{greeting}</motion.p>
          <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .25, duration: reduceMotion ? 0 : .9 }}>
            The next<br /><span>chapter.</span>
          </motion.h1>
          <motion.p className="hero-subtitle" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : .55 }}>
            One journey. One milestone.<br />A new beginning.
          </motion.p>
          <motion.div className="hero-actions" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .7 }}>
            <button className="button button-primary" onClick={openRSVP}>You&apos;re invited <ArrowRight size={16} /></button>
            <a className="text-link" href="#story">Discover the story <ArrowDown size={15} /></a>
          </motion.div>
          <div className="hero-meta"><span>12 NOVEMBER 2026</span><i /> <span>FAIRWAY HOTEL, KAFU ROAD, KAMPALA-UGANDA</span></div>
        </div>
        <div className="hero-bottom"><span>SCROLL TO EXPLORE</span><div className="scroll-line" /><span>01 / 04</span></div>
      </section>

      <section className="intro section-pad">
        <div className="section-kicker">A NOTE FROM THE GRADUATE <span>— 001</span></div>
        <p className="intro-copy">Some milestones are too meaningful to celebrate alone. After years of learning, building, figuring things out and growing, <em>this is one of those moments.</em></p>
        <p className="intro-small">I&apos;d love for you to be part of it.</p>
      </section>

      <section className="story section-pad" id="story">
        <div className="section-heading">
          <div><div className="section-kicker">THE JOURNEY <span>— 002</span></div><h2>Built one step<br />at a time.</h2></div>
          <p>Every chapter had its lessons. Every challenge added something. This milestone carries all of it.</p>
        </div>
        <div className="timeline">
          {journey.map((item, index) => (
            <motion.article className="timeline-item" key={item.year} initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ delay: reduceMotion ? 0 : index * .08, duration: reduceMotion ? 0 : .3 }}>
              <div className="timeline-index">0{index + 1}</div>
              <div className="timeline-content"><span>{item.year}</span><h3>{item.title}</h3><p>{item.text}</p></div>
              <div className="timeline-mark">{index === 2 ? <Code2 /> : <span />}</div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="degree-panel">
        <div className="degree-orb" />
        <div className="degree-content">
          <div className="section-kicker">THE MILESTONE <span>— 003</span></div>
          <div className="degree-label">A BACHELOR OF SCIENCE IN</div>
          <h2>Computer<br /><span>Science.</span></h2>
          <p>{graduation.name}<br />{graduation.university}</p>
          <div className="degree-rule" />
          <span className="degree-date">CLASS OF 2026</span>
        </div>
        <div className="degree-portrait-wrap"><Image src={graduation.portrait} alt="Agenorwoth Lleyton Adrian in his graduation gown" className="degree-portrait" width={800} height={800} sizes="(max-width: 760px) 72vw, 34vw" priority /></div>
        <div className="degree-side-note">A NEW CHAPTER IN PROGRESS</div>
      </section>

      <section className="gratitude section-pad">
        <div className="section-kicker">WITH GRATITUDE <span>— 004</span></div>
        <h2>None of this<br /><em>happened alone.</em></h2>
        <p>{graduation.gratitude}</p>
        <strong>With gratitude, Agenorwoth Lleyton Adrian</strong>
      </section>

      <section className="details section-pad" id="details">
        <div className="section-kicker">SAVE THE DATE <span>— 004</span></div>
        <div className="details-heading"><h2>Let&apos;s make<br />a memory.</h2><p>I&apos;d be honoured to have you there as I celebrate this milestone.</p></div>
        <div className="details-grid">
          <div className="detail-card"><CalendarDays /><span>THE DATE & TIME</span><strong>Thursday, 12 November 2026</strong><small>Guest arrival {graduation.arrivalTime} · Dinner {graduation.time}</small></div>
          <div className="detail-card"><MapPin /><span>THE VENUE</span><strong>Fairway Hotel</strong><small>Kafu Road, Kampala, Uganda</small></div>
          <div className="detail-card"><Code2 /><span>THE QUALIFICATION</span><strong>BSc Computer Science</strong><small>{graduation.university}</small></div>
          <div className="detail-card"><Check /><span>DRESS CODE & RSVP</span><strong>{graduation.dressCode}</strong><small>Kindly respond by {graduation.rsvpDeadline}</small></div>
        </div>
        <div className="event-actions" aria-label="Event tools">
          <a className="event-action" href={calendarHref} download="lleyton-adrian-graduation.ics"><CalendarDays size={17} aria-hidden="true" /><span><strong>Add to calendar</strong><small>Save the date and time</small></span><ArrowRight size={15} aria-hidden="true" /></a>
          <a className="event-action" href={directionsHref} target="_blank" rel="noreferrer"><MapPin size={17} aria-hidden="true" /><span><strong>Get directions</strong><small>Fairway Hotel, Kampala</small></span><ExternalLink size={15} aria-hidden="true" /></a>
        </div>
        <div className="countdown-wrap">
          <div><span className="section-kicker">COUNTING DOWN TO THE NEXT CHAPTER</span><h3>{countdown.complete ? "The day is here." : "The moment is getting closer."}</h3></div>
          <div className="countdown">
            {([["days", countdown.days], ["hours", countdown.hours], ["minutes", countdown.minutes], ["seconds", countdown.seconds]] as const).map(([label, value]) => <div className="count-unit" key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}
          </div>
        </div>
        <p className="detail-note">Please confirm using the name shown on your invitation. We look forward to celebrating with you.</p>
      </section>

      <section className="rsvp-section" id="rsvp">
        <div className="rsvp-inner">
          <div className="section-kicker">YOUR PRESENCE MATTERS <span>— 005</span></div>
          <h2>Save you<br /><em>a place?</em></h2>
          <p>I&apos;d love to celebrate this moment with you. Enter the name on your invitation to confirm your attendance.</p>
          {returningStatus && <p className="returning-confirmation" role="status"><Check size={16} aria-hidden="true" /> {returningStatus === "attending" ? `You're confirmed, ${returningGuests.join(", ")}.` : `Your response is recorded as ${responseLabels[returningStatus].toLowerCase()}.`}</p>}
          <button className="button button-primary" onClick={openRSVP}>{returningStatus ? "View your response" : "Confirm your attendance"} <ArrowRight size={16} /></button>
          <div className="rsvp-footnote">A little celebration. A lifetime of memories.</div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-top"><a className="wordmark" href="#top">lley-<span>tonn.</span></a><p>Designed with intention.<br />Built for a new beginning.</p><div className="contact-options"><span>QUESTIONS? CONTACT</span>{graduation.whatsappContacts.map(contact => <a key={contact.number} href={`https://wa.me/${contact.number}`} target="_blank" rel="noreferrer">WhatsApp · {contact.label}</a>)}</div><button className="terminal-trigger" onClick={() => setTerminalOpen(true)}><Terminal size={15} /> Open terminal</button></div>
        <div className="footer-bottom"><span>© 2026 LLEYTON ADRIAN</span><span>MADE OF CURIOSITY & CODE</span><a href="#top">BACK TO TOP ↑</a></div>
      </footer>

      {rsvpOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setRsvpOpen(false); }}>
        <div className="modal" ref={rsvpDialogRef} role="dialog" aria-modal="true" aria-labelledby="rsvp-title" aria-describedby="rsvp-desc">
          <button className="modal-close" onClick={() => setRsvpOpen(false)} aria-label="Close attendance confirmation"><X /></button>
          <div className="section-kicker">THE NEXT CHAPTER <span>— RSVP</span></div>
          <h2 id="rsvp-title">{rsvpConfirmed ? (returningStatus === "attending" ? "You're confirmed" : "Thank you for replying") : "Confirm your attendance"}</h2>
          <p className="modal-desc" id="rsvp-desc">{rsvpConfirmed ? returningStatus === "attending" ? `You're on the guest list${returningGuests.length ? `, ${returningGuests.join(", ")}` : ""}. We look forward to celebrating with you.` : `Your response is recorded as ${responseLabels[returningStatus || "maybe"].toLowerCase()}. Thank you for letting us know.` : "Enter the name shown on your invitation. You can enter one name or several names separated by commas or new lines."}</p>
          {!rsvpConfirmed && <form onSubmit={event => { event.preventDefault(); void submitRSVP(); }}>
            <label className="field-label" htmlFor="rsvp-name">NAME ON YOUR INVITATION</label>
            <input id="rsvp-name" className="field" value={rsvpName} onChange={e => setRsvpName(e.target.value)} placeholder="Enter your name" autoComplete="name" required />
            <span className="field-label" id="attendance-choice-label">YOUR RESPONSE</span>
            <div className="choice-row" role="group" aria-labelledby="attendance-choice-label">
              <button type="button" className={rsvpStatus === "attending" ? "choice active" : "choice"} aria-pressed={rsvpStatus === "attending"} onClick={() => setRsvpStatus("attending")}><Check size={15} aria-hidden="true" /> I&apos;ll be there</button>
              <button type="button" className={rsvpStatus === "maybe" ? "choice active" : "choice"} aria-pressed={rsvpStatus === "maybe"} onClick={() => setRsvpStatus("maybe")}>Not sure yet</button>
              <button type="button" className={rsvpStatus === "not_attending" ? "choice active" : "choice"} aria-pressed={rsvpStatus === "not_attending"} onClick={() => setRsvpStatus("not_attending")}>Can&apos;t make it</button>
            </div>
            <label className="field-label" htmlFor="rsvp-message">A SHORT MESSAGE <span>OPTIONAL</span></label>
            <textarea id="rsvp-message" className="field textarea" value={rsvpMessage} onChange={e => setRsvpMessage(e.target.value)} maxLength={500} placeholder="Share a note for Lleyton..." rows={3} />
            <button className="button button-primary modal-submit" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send response"} <ArrowRight size={16} /></button>
          </form>}
          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
          {rsvpConfirmed && <>
            <button id="rsvp-done" className="button button-primary modal-submit" onClick={() => setRsvpOpen(false)}>Done <Check size={16} /></button>
            <button className="response-edit-link" onClick={() => { setRsvpConfirmed(false); window.requestAnimationFrame(() => document.getElementById("rsvp-name")?.focus()); }}>Change my response</button>
          </>}
          {!rsvpConfirmed && <p className="privacy-note">Your name is checked against the invited guest list and your response is saved securely.</p>}
        </div>
      </div>}

      {terminalOpen && <div className="modal-backdrop terminal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTerminalOpen(false); }}>
        <div className="terminal-window" role="dialog" aria-modal="true" aria-labelledby="terminal-title">
          <div className="terminal-bar"><div><i /><i /><i /></div><span id="terminal-title">lleyton — guest terminal</span><button onClick={() => setTerminalOpen(false)} aria-label="Close guest terminal"><X size={17} /></button></div>
          <div className="terminal-body">
            {terminalLines.map((line, i) => <div className="terminal-line" key={i}>{line || "\u00a0"}</div>)}
            <form onSubmit={runCommand} className="terminal-input"><span>guest@lleyton:~$</span><input autoFocus value={command} onChange={e => setCommand(e.target.value)} aria-label="Terminal command" /></form>
          </div>
        </div>
      </div>}

      <div className="utility-dock">
        <button onClick={copyInvitation} title="Copy invitation link" aria-label="Copy invitation link"><Copy size={16} /></button>
        <button onClick={downloadQR} title="Download QR code" aria-label="Download invitation QR code"><Code2 size={16} /></button>
      </div>
      {feedback && !rsvpOpen && <div className="toast" role="status" aria-live="polite">{feedback}</div>}
    </main>
  );
}
