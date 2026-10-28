import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUp, RotateCcw, ArrowRight, ExternalLink } from "lucide-react";
import { useChat, STARTER_QUESTIONS } from "./chat-context";

export default function Assistant() {
  const { messages, busy, status, floatingOpen, setFloatingOpen, ask, clearMessages } = useChat();
  const [input, setInput] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if this is a fresh conversation (only the initial greeting)
  const isFreshConversation = useMemo(() => {
    return messages.length <= 1;
  }, [messages.length]);

  // Focus input when chat opens & handle Escape key
  useEffect(() => {
    if (!floatingOpen) return;
    field.current?.focus();
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFloatingOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [floatingOpen, setFloatingOpen]);

  // Auto-scroll to latest message smoothly
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

  const getStatusBadge = () => {
    switch (status) {
      case "Available":
        return { label: "Available", className: "status-available" };
      case "Connecting":
        return { label: "Connecting", className: "status-connecting" };
      case "Limited Assistance":
        return { label: "Limited Assistance", className: "status-limited" };
      default:
        return { label: "Limited Assistance", className: "status-limited" };
    }
  };

  const badge = getStatusBadge();

  return (
    <>
      {/* FLOATING LAUNCHER */}
      <button
        ref={launcher}
        type="button"
        className="chat-launch"
        aria-expanded={floatingOpen}
        aria-label="Open Spideyy website consultant"
        onClick={() => setFloatingOpen(!floatingOpen)}
      >
        <img className="spider-official" src="/assets/spideyy.jpg" alt="Spideyy" />
        <span className="chat-launch-text">Ask Spideyy</span>
      </button>

      {/* CHAT WINDOW */}
      {floatingOpen && (
        <div
          ref={panel}
          className="chat"
          role="dialog"
          aria-modal="true"
          aria-label="Spideyy website consultant"
        >
          {/* 1. HEADER */}
          <div className="chat-head">
            <div className="chat-head-identity">
              <img className="spider-official" src="/assets/spideyy.jpg" alt="Spideyy" />
              <div className="chat-head-titles">
                <span className="chat-head-title">Spideyy</span>
                <span className={`chat-head-status ${badge.className}`}>
                  <span className="live-dot" /> {badge.label}
                </span>
              </div>
            </div>

            <div className="chat-head-actions">
              <button
                type="button"
                className="chat-head-action-btn"
                title="Start a new conversation"
                aria-label="Start a new conversation"
                onClick={clearMessages}
                disabled={busy}
              >
                <RotateCcw size={14} />
                <span className="chat-action-label">New Chat</span>
              </button>
              <button
                type="button"
                className="chat-head-action-btn close"
                aria-label="Close Spideyy"
                onClick={() => {
                  setFloatingOpen(false);
                  launcher.current?.focus();
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 2. CONVERSATION AREA */}
          <div className="chat-body" aria-live="polite">
            <div className="chat-messages-scroll">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`chat-msg-row ${m.role === "user" ? "user-row" : "assistant-row"}`}
                >
                  {m.role === "assistant" && (
                    <img className="spider-official chat-msg-avatar" src="/assets/spideyy.jpg" alt="Spideyy" />
                  )}
                  <div className="chat-bubble-wrap">
                    <div className={m.role === "user" ? "user-bubble" : "assistant-bubble"}>
                      {m.text.split("\n").map((line, lineIdx) => (
                        <p key={lineIdx} className="chat-bubble-p">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Contextual Action Buttons (At most 1-2, cleanly spaced) */}
                    {m.links && m.links.length > 0 && (
                      <div className="chat-contextual-actions">
                        {m.links.slice(0, 2).map((lnk, linkIdx) => {
                          const isPrimary = lnk.label.includes("Start");
                          const isExternal = lnk.url.startsWith("http");

                          if (isExternal) {
                            return (
                              <a
                                key={linkIdx}
                                href={lnk.url}
                                target="_blank"
                                rel="noreferrer"
                                className="chat-action-pill secondary"
                              >
                                {lnk.label} <ExternalLink size={13} />
                              </a>
                            );
                          }

                          return (
                            <Link
                              key={linkIdx}
                              to={lnk.url}
                              className={`chat-action-pill ${isPrimary ? "primary" : "secondary"}`}
                            >
                              {lnk.label} <ArrowRight size={14} />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {busy && (
                <div className="chat-msg-row assistant-row">
                  <img className="spider-official chat-msg-avatar" src="/assets/spideyy.jpg" alt="Spideyy" />
                  <div className="assistant-bubble thinking">
                    <span className="typing-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </span>
                    <span className="thinking-text">Spideyy is thinking…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 3. STARTER QUESTIONS (MAXIMUM THREE, COLLAPSED ONCE CONVERSATION BEGINS) */}
            {isFreshConversation && (
              <div className="chat-starter-section">
                <span className="chat-starter-heading">Suggested questions:</span>
                <div className="chat-starter-grid">
                  {STARTER_QUESTIONS.map((sq, sqIdx) => (
                    <button
                      key={sqIdx}
                      type="button"
                      className="chat-starter-btn"
                      disabled={busy}
                      onClick={() => handleAsk(sq)}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. INPUT AREA */}
          <form
            className="chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
          >
            <input
              ref={field}
              type="text"
              className="chat-input-field"
              aria-label="Ask Spideyy anything"
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Spideyy anything..."
              disabled={busy}
            />
            <button
              type="submit"
              className="chat-input-send-btn"
              aria-label="Send message to Spideyy"
              disabled={busy || !input.trim()}
            >
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
