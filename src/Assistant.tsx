import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUp } from "lucide-react";
import { useSite } from "./App";
import { useChat } from "./chat-context";

export default function Assistant() {
  const s = useSite();
  const { messages, busy, mode, floatingOpen, setFloatingOpen, ask } = useChat();
  const [input, setInput] = useState("");
  const panel = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    field = useRef<HTMLInputElement>(null);

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

  const handleAsk = (q: string) => {
    setInput("");
    void ask(q);
  };

  return (
    <>
      <button
        ref={launcher}
        className="chat-launch"
        aria-expanded={floatingOpen}
        onClick={() => setFloatingOpen(!floatingOpen)}
      >
        <img className="spider" src="/media/spideyy.svg" alt="" />
        <span>Ask spideyy</span>
      </button>
      {floatingOpen && (
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
                setFloatingOpen(false);
                launcher.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="chat-body">
            <div aria-live="polite">
              {messages.map((m: any, i: number) => (
                <div key={i}>
                  <p className={m.role === "user" ? "user" : ""}>{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="chat-suggestions" style={{ marginBottom: 12 }}>
                      {m.links.map((lnk: any, li: number) =>
                        lnk.url.startsWith("ask:") ? (
                          <button
                            key={li}
                            type="button"
                            onClick={() => handleAsk(lnk.url.slice(4))}
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
              {busy && <p>Thinking…</p>}
            </div>
            <div className="chat-suggestions">
              {s.faqs.map((f) => (
                <button disabled={busy} key={f.q} onClick={() => handleAsk(f.q)}>
                  {f.q}
                </button>
              ))}
            </div>
            <p style={{ marginTop: 15 }}>
              Please avoid confidential information. AI mode, when enabled,
              sends your question to the model provider.
            </p>
            <div className="chat-suggestions">
              <Link to="/work" onClick={() => setFloatingOpen(false)}>
                Explore all five projects
              </Link>
              <Link to="/contact" onClick={() => setFloatingOpen(false)}>
                Start a project brief
              </Link>
              <Link to="/track" onClick={() => setFloatingOpen(false)}>
                Track project status
              </Link>
              <a href={"mailto:" + s.email}>Email the business</a>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
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
