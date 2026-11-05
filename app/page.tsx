"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  ArrowDown, ArrowRight, CalendarDays, Check, ChevronRight, Code2,
  Copy, ExternalLink, MapPin, Menu, Terminal, X
} from "lucide-react";
import { graduation, journey } from "@/lib/config";

type RSVPStatus = "attending" | "not_attending" | "maybe";

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
  const [guest, setGuest] = useState("");
  const [guestId, setGuestId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [status, setStatus] = useState<RSVPStatus>("attending");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
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
  }, []);

  const greeting = guest.trim() ? `A personal invitation for ${guest.trim()}` : "You're invited";
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (guest) url.searchParams.set("guest", guest);
    if (guestId) url.searchParams.set("id", guestId);
    return url.toString();
  }, [guest, guestId]);

  async function submitRSVP() {
    if (!guest.trim() || !guestId.trim()) {
      setFeedback("This RSVP is reserved for guests with a personalised invitation link. Please contact the host if you need assistance.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guest || "Guest",
          guest_id: guestId || null,
          status,
          phone: phone || null,
          note: note || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit RSVP.");
      setFeedback("Your response has been received. Thank you.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top">LA<span>.</span></a>
        <nav className="desktop-nav">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <button className="nav-cta" onClick={() => setRsvpOpen(true)}>RSVP <ArrowRight size={15} /></button>
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      {menuOpen && <div className="mobile-nav">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</div>}

      <section className="hero" id="top">
        <div className="hero-glow" />
        <div className="hero-content">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }} className="eyebrow"><span className="eyebrow-dot" /> A MILESTONE WORTH SHARING</motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2 }} className="guest-greeting">{greeting}</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25, duration: .9 }}>
            The next<br /><span>chapter.</span>
          </motion.h1>
          <motion.p className="hero-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }}>
            One journey. One milestone.<br />A new beginning.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7 }}>
            <button className="button button-primary" onClick={() => setRsvpOpen(true)}>You're invited <ArrowRight size={16} /></button>
            <a className="text-link" href="#story">Discover the story <ArrowDown size={15} /></a>
          </motion.div>
          <div className="hero-meta"><span>12 NOVEMBER 2026</span><i /> <span>FAIRWAY HOTEL, KAFU ROAD, KAMPALA-UGANDA</span></div>
        </div>
        <div className="hero-bottom"><span>SCROLL TO EXPLORE</span><div className="scroll-line" /><span>01 / 04</span></div>
      </section>

      <section className="intro section-pad">
        <div className="section-kicker">A NOTE FROM THE GRADUATE <span>— 001</span></div>
        <p className="intro-copy">Some milestones are too meaningful to celebrate alone. After years of learning, building, figuring things out and growing, <em>this is one of those moments.</em></p>
        <p className="intro-small">I'd love for you to be part of it.</p>
      </section>

      <section className="story section-pad" id="story">
        <div className="section-heading">
          <div><div className="section-kicker">THE JOURNEY <span>— 002</span></div><h2>Built one step<br />at a time.</h2></div>
          <p>Every chapter had its lessons. Every challenge added something. This milestone carries all of it.</p>
        </div>
        <div className="timeline">
          {journey.map((item, index) => (
            <motion.article className="timeline-item" key={item.year} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ delay: index * .08 }}>
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
        <div className="degree-portrait-wrap"><img src={graduation.portrait} alt="Agenorwoth Lleyton Adrian in his graduation gown" className="degree-portrait" /></div>
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
        <div className="details-heading"><h2>Let's make<br />a memory.</h2><p>I'd be honoured to have you there as I celebrate this milestone.</p></div>
        <div className="details-grid">
          <div className="detail-card"><CalendarDays /><span>THE DATE & TIME</span><strong>Thursday, 12 November 2026</strong><small>Guest arrival {graduation.arrivalTime} · Dinner {graduation.time}</small></div>
          <div className="detail-card"><MapPin /><span>THE VENUE</span><strong>Fairway Hotel</strong><small>Kafu Road, Kampala, Uganda</small></div>
          <div className="detail-card"><Code2 /><span>THE QUALIFICATION</span><strong>BSc Computer Science</strong><small>{graduation.university}</small></div>
          <div className="detail-card"><Check /><span>DRESS CODE & RSVP</span><strong>{graduation.dressCode}</strong><small>Kindly respond by {graduation.rsvpDeadline}</small></div>
        </div>
        <div className="countdown-wrap">
          <div><span className="section-kicker">COUNTING DOWN TO THE NEXT CHAPTER</span><h3>{countdown.complete ? "The day is here." : "The moment is getting closer."}</h3></div>
          <div className="countdown">
            {([["days", countdown.days], ["hours", countdown.hours], ["minutes", countdown.minutes], ["seconds", countdown.seconds]] as const).map(([label, value]) => <div className="count-unit" key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}
          </div>
        </div>
        <p className="detail-note">Please note: invitations are strictly for the named guest. Each guest should RSVP using their own personalised invitation link.</p>
      </section>

      <section className="rsvp-section" id="rsvp">
        <div className="rsvp-inner">
          <div className="section-kicker">YOUR PRESENCE MATTERS <span>— 005</span></div>
          <h2>Save you<br /><em>a place?</em></h2>
          <p>I'd love to celebrate this moment with you. If you received a personalised invitation, please confirm your attendance below.</p>
          {guest && guestId ? <button className="button button-primary" onClick={() => setRsvpOpen(true)}>Confirm your attendance <ArrowRight size={16} /></button> : <p className="invite-only-note">Personalised guest invitation required to RSVP.</p>}
          <div className="rsvp-footnote">A little celebration. A lifetime of memories.</div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-top"><a className="wordmark" href="#top">lley-<span>tonn.</span></a><p>Designed with intention.<br />Built for a new beginning.</p><div className="contact-options"><span>QUESTIONS? CONTACT</span>{graduation.whatsappContacts.map(contact => <a key={contact.number} href={`https://wa.me/${contact.number}`} target="_blank" rel="noreferrer">WhatsApp · {contact.label}</a>)}</div><button className="terminal-trigger" onClick={() => setTerminalOpen(true)}><Terminal size={15} /> Open terminal</button></div>
        <div className="footer-bottom"><span>© 2026 LLEYTON ADRIAN</span><span>MADE OF CURIOSITY & CODE</span><a href="#top">BACK TO TOP ↑</a></div>
      </footer>

      {rsvpOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setRsvpOpen(false); }}>
        <div className="modal">
          <button className="modal-close" onClick={() => setRsvpOpen(false)} aria-label="Close"><X /></button>
          <div className="section-kicker">THE NEXT CHAPTER <span>— RSVP</span></div>
          <h2>{guest ? `Hello, ${guest}.` : "Personal invitation required"}</h2>
          <p className="modal-desc">{guest && guestId ? "This invitation is reserved for you. Please respond for yourself only; additional guests are not included." : "RSVP is available only through a personalised invitation link issued to a named guest."}</p>
          {!guest || !guestId ? <p className="form-feedback">Please open the unique link sent to you by the host.</p> : null}
          <label className="field-label">YOUR RESPONSE</label>
          <div className="choice-row">
            <button className={status === "attending" ? "choice active" : "choice"} onClick={() => setStatus("attending")}><Check size={15} /> I'll be there</button>
            <button className={status === "maybe" ? "choice active" : "choice"} onClick={() => setStatus("maybe")}>Not sure yet</button>
            <button className={status === "not_attending" ? "choice active" : "choice"} onClick={() => setStatus("not_attending")}>Can't make it</button>
          </div>
          <label className="field-label" htmlFor="phone">PHONE NUMBER <span>OPTIONAL</span></label>
          <input id="phone" className="field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256..." />
          <label className="field-label" htmlFor="note">A NOTE <span>OPTIONAL</span></label>
          <textarea id="note" className="field textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Leave a message..." rows={3} />
          <button className="button button-primary modal-submit" onClick={submitRSVP} disabled={submitting || !guest || !guestId}>{submitting ? "Sending..." : "Submit RSVP"} <ArrowRight size={16} /></button>
          {feedback && <p className="form-feedback">{feedback}</p>}
          <p className="privacy-note">Your response is only used for graduation planning.</p>
        </div>
      </div>}

      {terminalOpen && <div className="modal-backdrop terminal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTerminalOpen(false); }}>
        <div className="terminal-window">
          <div className="terminal-bar"><div><i /><i /><i /></div><span>lleyton — guest terminal</span><button onClick={() => setTerminalOpen(false)}><X size={17} /></button></div>
          <div className="terminal-body">
            {terminalLines.map((line, i) => <div className="terminal-line" key={i}>{line || "\u00a0"}</div>)}
            <form onSubmit={runCommand} className="terminal-input"><span>guest@lleyton:~$</span><input autoFocus value={command} onChange={e => setCommand(e.target.value)} aria-label="Terminal command" /></form>
          </div>
        </div>
      </div>}

      <div className="utility-dock">
        <button onClick={copyInvitation} title="Copy invitation link"><Copy size={16} /></button>
        <button onClick={downloadQR} title="Download QR code"><Code2 size={16} /></button>
      </div>
      {feedback && !rsvpOpen && <div className="toast">{feedback}</div>}
    </main>
  );
}
