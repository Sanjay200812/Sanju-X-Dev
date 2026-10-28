import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { useSite, Arrow } from "./App";
import { SANJU_WHATSAPP_NUMBER } from "./content";

interface Milestone {
  name: string;
  completed: boolean;
}

interface ProjectData {
  trackingCode: string;
  title: string;
  service: string;
  status: string;
  statusLabel: string;
  progressPct: number;
  milestones: Milestone[];
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  daysRemaining: string | null;
  publicUpdate: string;
  publicUpdateTime: string | null;
  liveUrl: string | null;
  createdAt: string;
}

export default function Track() {
  const s = useSite();
  const [params] = useSearchParams();
  const initialCode = (params.get("code") || "").trim().toUpperCase();

  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [copied, setCopied] = useState(false);

  // If token is in sessionStorage, auto-fetch status
  useEffect(() => {
    const savedToken = sessionStorage.getItem("sxd_track_token_" + trackingCode);
    if (savedToken && trackingCode) {
      fetchStatus(trackingCode, savedToken);
    }
  }, [trackingCode]);

  async function fetchStatus(code: string, token: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", trackingCode: code, token }),
      });
      const data = await res.json();
      if (!res.ok) {
        sessionStorage.removeItem("sxd_track_token_" + code);
        throw Error(data.error || "Unable to load project status.");
      }
      setProject(data.project);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = trackingCode.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanCode || !cleanEmail) {
      setError("Please provide both your Tracking ID and registered email.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", trackingCode: cleanCode, email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw Error(data.error || "Verification failed. Please check your credentials.");
      }

      sessionStorage.setItem("sxd_track_token_" + cleanCode, data.token);
      await fetchStatus(cleanCode, data.token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (project?.trackingCode) {
      navigator.clipboard.writeText(project.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const formatISTDate = (isoStr: string | null) => {
    if (!isoStr) return "To be scheduled";
    try {
      return new Date(isoStr).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <section className="page wrap">
      <span className="eyebrow">Client Portal · Project Tracking</span>
      <h1>
        Track your project’s<br />
        <em>journey to launch.</em>
      </h1>

      <div className="contact-grid">
        <aside className="contact-aside">
          <h2>
            Transparent
            <br />
            milestones.
          </h2>
          <p>
            Every phase of design and engineering is tracked here. You can monitor progress,
            verified timelines, and scheduled delivery dates in real time.
          </p>

          <div style={{ marginTop: 24 }}>
            <p style={{ margin: "8px 0", fontSize: 13, color: "var(--muted)" }}>Direct enquiries:</p>
            <a href={"mailto:" + s.email}>{s.email}</a>
          </div>

          <p style={{ marginTop: 30 }}>Have a new project idea?</p>
          <Link className="text-link" to="/contact">
            Start a project brief <Arrow />
          </Link>
        </aside>

        <div className="form-panel">
          {!project ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Lock size={18} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Verify Your Project Access</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>
                Enter the permanent Tracking ID from your confirmation email along with the email address
                you used to submit the enquiry.
              </p>

              <form onSubmit={handleVerify}>
                <label>
                  Tracking ID
                  <input
                    type="text"
                    required
                    placeholder="e.g. SXD-001"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    style={{
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                    }}
                  />
                </label>

                <label>
                  Registered Email Address
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {error && (
                  <p role="alert" className="status" style={{ borderLeftColor: "var(--accent)", color: "var(--text)" }}>
                    {error}
                  </p>
                )}

                <div className="form-actions" style={{ marginTop: 25 }}>
                  <button type="submit" className="button" disabled={busy}>
                    {busy ? "Verifying…" : "View Project Status"}
                    <Arrow />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 24,
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Privacy Protected · Only accessible with registered email verification</span>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {/* Project Top Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--line)",
                  marginBottom: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
                    {project.service}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 24, color: "var(--text)" }}>{project.title}</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "var(--soft)",
                      border: "1px dashed var(--accent)",
                      borderRadius: 4,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--accent)",
                    }}
                  >
                    {project.trackingCode}
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label="Copy Tracking Code"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--line)",
                      padding: "6px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                  >
                    {copied ? <Check size={14} style={{ color: "#25d366" }} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* On Hold Alert Banner */}
              {project.status === "on_hold" && (
                <div
                  style={{
                    background: "#fff8e6",
                    border: "1px solid #e6b800",
                    borderLeft: "5px solid #d99b00",
                    padding: "14px 18px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <AlertCircle size={20} style={{ color: "#b38000", flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: "block", fontSize: 13, color: "#805b00" }}>Project is Currently On Hold</strong>
                    <span style={{ fontSize: 12.5, color: "#996d00" }}>
                      Active work is temporarily paused while awaiting client decisions or assets. Reach out anytime on WhatsApp to resume.
                    </span>
                  </div>
                </div>
              )}

              {/* Status and Progress Overview */}
              <div
                style={{
                  background: "var(--soft)",
                  padding: 20,
                  borderRadius: 6,
                  borderLeft: "4px solid var(--accent)",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor:
                          project.status === "completed" || project.status === "delivered"
                            ? "#25d366"
                            : project.status === "on_hold"
                            ? "#d99b00"
                            : "var(--accent)",
                      }}
                    />
                    <strong style={{ fontSize: 16 }}>{project.statusLabel}</strong>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
                    {project.progressPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "var(--panel)",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${project.progressPct}%`,
                      background: "var(--accent)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="form-grid" style={{ gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Calendar size={16} style={{ color: "var(--muted)" }} />
                    <div>
                      <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>Expected Completion</span>
                      <strong>
                        {project.targetDate
                          ? formatISTDate(project.targetDate)
                          : "Expected completion date not confirmed yet."}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Clock size={16} style={{ color: "var(--muted)" }} />
                    <div>
                      <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>Timeline Status</span>
                      <strong style={{ color: "var(--accent)" }}>{project.daysRemaining || "In Review"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Update Box */}
              {project.publicUpdate && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>
                    Latest Project Broadcast
                  </div>
                  <div
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      padding: 16,
                      borderRadius: 4,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--text)",
                    }}
                  >
                    {project.publicUpdate}
                    {project.publicUpdateTime && (
                      <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                        Updated on {formatISTDate(project.publicUpdateTime)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Milestones Checklist */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                    Milestone Progress
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {project.milestones.filter((m) => m.completed).length} of {project.milestones.length} Completed
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {project.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: m.completed ? "var(--soft)" : "transparent",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                      }}
                    >
                      <CheckCircle2
                        size={18}
                        style={{
                          color: m.completed ? "var(--accent)" : "var(--line)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: m.completed ? 600 : 400,
                          color: m.completed ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live URL Link (if completed or preview ready) */}
              {project.liveUrl && (
                <div
                  style={{
                    padding: 16,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    textAlign: "center",
                    marginBottom: 24,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Live Application Link</div>
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--accent)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      textDecoration: "underline",
                    }}
                  >
                    {project.liveUrl} <ExternalLink size={16} />
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <a
                  href={`https://wa.me/${SANJU_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello SANJU X DEV, I have a question regarding my project ${project.trackingCode} (${project.title}).`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                >
                  <MessageCircle size={16} />
                  Discuss on WhatsApp
                </a>

                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    sessionStorage.removeItem("sxd_track_token_" + project.trackingCode);
                    setProject(null);
                  }}
                >
                  Check Another Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
