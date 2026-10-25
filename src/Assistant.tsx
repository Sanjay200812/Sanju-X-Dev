import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUp } from "lucide-react";
import { useSite } from "./App";
export default function Assistant() {
  const s = useSite();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [input, setInput] = useState(""),
    [mode, setMode] = useState("FAQ guide"),
    [messages, setMessages] = useState([
      {
        role: "assistant",
        text: "Hi, I’m spideyy. I can help you explore our work, understand our services or shape a project brief.",
      },
    ]);
  const panel = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
      if (e.key === "Tab") {
        const els =
          panel.current?.querySelectorAll<HTMLElement>("button,a,input");
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);
  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMode(d.mode);
      setMessages((m) => [...m, { role: "assistant", text: d.answer }]);
    } catch {
      setMode("FAQ guide");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn’t reach the assistant service. You can explore all five case studies in Our Work or send a project brief through Contact.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={launcher}
        className="chat-launch"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <img className="spider" src="/media/spideyy.svg" alt="" />
        <span>Ask spideyy</span>
      </button>
      {open && (
        <div
          ref={panel}
          className="chat"
          role="dialog"
          aria-modal="true"
          aria-label="spideyy website assistant"
        >
          <div className="chat-head">
            <img className="spider" src="/media/spideyy.svg" alt="" />
            <div>
              <b>spideyy</b>
              <small>{mode} · SANJU X DEV</small>
            </div>
            <button
              aria-label="Close assistant"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="chat-body">
            <div aria-live="polite">
              {messages.map((m, i) => (
                <p key={i} className={m.role === "user" ? "user" : ""}>
                  {m.text}
                </p>
              ))}
              {busy && <p>Thinking…</p>}
            </div>
            <div className="chat-suggestions">
              {s.faqs.map((f) => (
                <button disabled={busy} key={f.q} onClick={() => ask(f.q)}>
                  {f.q}
                </button>
              ))}
            </div>
            <p style={{ marginTop: 15 }}>
              Please avoid confidential information. AI mode, when enabled,
              sends your question to the model provider.
            </p>
            <div className="chat-suggestions">
              <Link to="/work" onClick={() => setOpen(false)}>
                Explore all five projects
              </Link>
              <Link to="/contact" onClick={() => setOpen(false)}>
                Start a project brief
              </Link>
              <a href={"mailto:" + s.email}>Email the business</a>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              ref={field}
              aria-label="Message spideyy"
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to know?"
            />
            <button aria-label="Send message" disabled={busy || !input.trim()}>
              <ArrowUp size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
