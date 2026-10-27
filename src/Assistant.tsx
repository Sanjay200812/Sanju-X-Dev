import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUp } from "lucide-react";
import { useSite } from "./App";
import { useChat } from "./chat-context";

const STARTER_QUESTIONS = [
  "What website is right for me?",
  "Can you build an online store?",
  "How do I start my project?",
];

export default function Assistant() {
  const s = useSite();
  const { messages, busy, mode, floatingOpen, setFloatingOpen, ask } = useChat();
  const [input, setInput] = useState("");
  const panel = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    field = useRef<HTMLInputElement>(null),
    messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!floatingOpen) return;
    field.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFloatingOpen(false);
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
  }, [floatingOpen, setFloatingOpen]);

  // Auto-scroll when messages update or busy state changes
  useEffect(() => {
    if (floatingOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy, floatingOpen]);

  const handleAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    setInput("");
    setFloatingOpen(true);
    void ask(trimmed);
  };

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className="chat-launch"
        aria-expanded={floatingOpen}
        aria-label="Open Spideyy project assistant"
        onClick={() => setFloatingOpen(!floatingOpen)}
      >
        <img className="spider-official" src="/assets/spideyy.jpg" alt="Spideyy" />
        <span>Ask Spideyy</span>
      </button>

      {floatingOpen && (
        <div
          ref={panel}
          className="chat"
          role="dialog"
          aria-modal="true"
          aria-label="Spideyy project assistant"
        >
          <div className="chat-head">
            <img className="spider-official" src="/assets/spideyy.jpg" alt="Spideyy" />
            <div>
              <b className="chat-head-title">Spideyy</b>
              <small className="chat-head-subtitle">
                {mode === "AI Online" ? "AI Online" : "Project Assistant"} · SANJU X DEV
              </small>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => {
                setFloatingOpen(false);
                launcher.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-body">
            <div aria-live="polite" className="chat-messages-scroll">
              {messages.map((m: any, i: number) => (
                <div
                  key={i}
                  className={"chat-msg-row " + (m.role === "user" ? "user-row" : "assistant-row")}
                >
                  <p className={m.role === "user" ? "user" : "assistant-bubble"}>{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="chat-suggestions" style={{ marginBottom: 12 }}>
                      {m.links.map((lnk: any, li: number) =>
                        lnk.url.startsWith("ask:") ? (
                          <button
                            key={li}
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAsk(lnk.url.slice(4));
                            }}
                          >
                            {lnk.label}
                          </button>
                        ) : lnk.url.startsWith("http") ? (
                          <a
                            key={li}
                            href={lnk.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {lnk.label}
                          </a>
                        ) : (
                          <Link
                            key={li}
                            to={lnk.url}
                            className={lnk.label.includes("Start") ? "action-primary" : ""}
                            onClick={() => setFloatingOpen(false)}
                          >
                            {lnk.label}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="chat-msg-row assistant-row">
                  <p className="assistant-bubble thinking">
                    <span className="live-dot" /> Spideyy is thinking…
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Starter Questions: Exactly 3 Requested */}
            <div className="chat-quick-section">
              <span className="chat-quick-label">Suggested Questions:</span>
              <div className="chat-suggestions">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAsk(q);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="chat-nav-footer">
              <Link to="/work" onClick={() => setFloatingOpen(false)}>
                Explore Our Work
              </Link>
              <Link to="/contact" onClick={() => setFloatingOpen(false)}>
                Start a Project
              </Link>
              <Link to="/track" onClick={() => setFloatingOpen(false)}>
                Track Status
              </Link>
              <a href={"mailto:" + s.email}>Email Sanju</a>
            </div>
          </div>

          <form
            className="chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
          >
            <input
              ref={field}
              aria-label="Message Spideyy"
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Spideyy anything about your website..."
            />
            <button
              type="submit"
              aria-label="Send message to Spideyy"
              disabled={busy || !input.trim()}
            >
              <ArrowUp size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
