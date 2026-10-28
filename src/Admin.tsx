import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  Eye,
  EyeOff,
  Bell,
  Copy,
  Check,
  Download,
  Trash2,
  ChevronDown,
  Plus,
  ExternalLink,
  Send,
} from "lucide-react";
import { defaults } from "./content";

const auth =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      )
    : null;

export default function Admin() {
  const [stage, setStage] = useState<"code" | "login" | "setup" | "workspace">("code");
  const [showSecondaryLogin, setShowSecondaryLogin] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [site, setSite] = useState(defaults);
  const [data, setData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Lockout states (in seconds)
  const [codeLockout, setCodeLockout] = useState(0);
  const [passwordLockout, setPasswordLockout] = useState(0);

  // Enquiry filters & management
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Active Project & Outbox states
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectNotifyClient, setProjectNotifyClient] = useState(true);
  const [projectStatusReason, setProjectStatusReason] = useState("");
  const [newMilestoneInput, setNewMilestoneInput] = useState("");
  const [testEmailBusy, setTestEmailBusy] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState("");
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);
  const [smtpVerifyResult, setSmtpVerifyResult] = useState<any>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [testAiResult, setTestAiResult] = useState<any>(null);

  // Lockout countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCodeLockout((sec) => (sec > 0 ? sec - 1 : 0));
      setPasswordLockout((sec) => (sec > 0 ? sec - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial lockout status from server on mount
  useEffect(() => {
    async function checkLockouts() {
      try {
        const r = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lockout-status" }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.codeLockout?.locked) setCodeLockout(d.codeLockout.remainingSeconds);
          if (d.passwordLockout?.locked) setPasswordLockout(d.passwordLockout.remainingSeconds);
        }
      } catch {
        /* offline or non-blocking */
      }
    }
    void checkLockouts();
  }, []);

  // Close notifications popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  // Realtime subscription for enquiries
  useEffect(() => {
    if (stage !== "workspace" || !auth) return;
    try {
      const channel = auth
        .channel("owner-enquiries-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "studio_enquiries" },
          () => {
            void loadSilently();
          },
        )
        .subscribe();

      return () => {
        void auth.removeChannel(channel);
      };
    } catch {
      /* fallback to normal operations */
    }
  }, [stage]);

  async function api(body?: any) {
    if (!auth)
      throw Error(
        "Configure the dedicated Supabase project before signing in.",
      );
    const {
      data: { session },
    } = await auth.auth.getSession();

    const r = await fetch("/api/admin", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + (session?.access_token || ""),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d = await r.json();
    if (!r.ok) {
      if (d.remainingSeconds) {
        if (body?.action === "login-code") setCodeLockout(d.remainingSeconds);
        if (body?.action === "login-password") setPasswordLockout(d.remainingSeconds);
      }
      throw Error(d.error || "Request failed");
    }
    return d;
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadSilently() {
    try {
      const d = await api();
      setData(d);
      setSite(d.site);
    } catch {
      /* silent refresh */
    }
  }

  async function load() {
    const d = await api();
    setData(d);
    setSite(d.site);
    setStage("workspace");
  }

  async function logout() {
    await run(async () => {
      await api({ action: "logout" });
      await auth?.auth.signOut({ scope: "global" });
      setStage("code");
      setData(null);
      setPassword("");
      setSecretCode("");
    });
  }

  const field = (
    key: keyof typeof defaults,
    label: string,
    multiline = false,
  ) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          value={String(site[key])}
          onChange={(e) => setSite({ ...site, [key]: e.target.value })}
        />
      ) : (
        <input
          value={String(site[key])}
          onChange={(e) => setSite({ ...site, [key]: e.target.value })}
        />
      )}
    </label>
  );

  const publish = () =>
    run(async () => {
      await api({ action: "save", site });
      setStatus(
        "Published. Public pages will use this content on their next load.",
      );
    });

  const tabs = [
    "Overview",
    "Active Projects",
    "Enquiries",
    "Services & Enquiry Form",
    "Email Outbox",
    "Projects",
    "Page content",
    "Services",
    "Analytics",
    "Media",
    "spideyy",
    "SEO",
    "Security",
  ];

  // Enquiry filtering & sorting logic
  const filteredEnquiries = useMemo(() => {
    if (!data?.enquiries) return [];
    return data.enquiries
      .filter((r: any) => {
        if (statusFilter === "unread") return !r.read;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (serviceFilter !== "all" && r.data?.service !== serviceFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            r.data?.name?.toLowerCase().includes(q) ||
            r.data?.email?.toLowerCase().includes(q) ||
            r.data?.company?.toLowerCase().includes(q) ||
            r.data?.description?.toLowerCase().includes(q) ||
            r.notes?.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [data?.enquiries, statusFilter, serviceFilter, search, sortOrder]);

  const unreadCount = useMemo(() => {
    return data?.enquiries?.filter((e: any) => !e.read).length || 0;
  }, [data?.enquiries]);

  // Copy email to clipboard helper
  function copyEmail(emailToCopy: string, id: string) {
    void navigator.clipboard.writeText(emailToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section className="page wrap admin-shell">
      <span className="eyebrow">Private / SANJU X DEV</span>
      <h1>Spideyy — Private Access</h1>

      {stage !== "workspace" ? (
        <div className="admin-card admin-login">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 6px 0" }}>
              {stage === "setup"
                ? "Create your private secret code"
                : "Secure owner workspace"}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
              {stage === "setup"
                ? "Choose a strong high-entropy code or passphrase (minimum 8 characters) for direct owner access."
                : "Owner authentication and protected dashboard."}
            </p>
          </div>

          {!auth && (
            <p className="status">
              Owner access requires the dedicated Supabase configuration.
            </p>
          )}

          {stage === "setup" ? (
            /* SETUP PRIVATE SECRET CODE */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  if (newCode.length < 8) {
                    throw Error("Secret code must be at least 8 characters long.");
                  }
                  if (newCode !== confirmCode) {
                    throw Error("Secret codes do not match.");
                  }
                  await api({ action: "setup-code", code: newCode, confirmCode });
                  setNewCode("");
                  setConfirmCode("");
                  await load();
                });
              }}
            >
              <label>
                New secret code / passphrase (min 8 characters)
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. MySecurePassphrase2026!"
                />
              </label>
              <label>
                Confirm secret code
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                />
              </label>
              <button className="button" disabled={busy || !auth}>
                {busy ? "Saving…" : "Save secret code & unlock"}
              </button>
            </form>
          ) : (
            /* PRIMARY & SECONDARY LOGIN */
            <div>
              {/* PRIMARY LOGIN — SECRET CODE */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const res = await api({ action: "login-code", code: secretCode });
                    setSecretCode("");
                    if (res.sessionToken && auth) {
                      try {
                        await auth.auth.setSession({
                          access_token: res.sessionToken,
                          refresh_token: "",
                        });
                      } catch {
                        /* ignore */
                      }
                    }
                    await load();
                  });
                }}
              >
                <label>
                  Private secret code
                  <div style={{ position: "relative" }}>
                    <input
                      type={showSecret ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      disabled={codeLockout > 0 || busy}
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      placeholder="Enter owner secret code"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      aria-label={showSecret ? "Hide code" : "Show code"}
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        opacity: 0.7,
                      }}
                    >
                      {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {codeLockout > 0 && (
                  <p className="status" style={{ color: "var(--accent)", marginTop: 8 }}>
                    Secret code locked. Retry in {codeLockout}s
                  </p>
                )}

                <button
                  className="button"
                  style={{ width: "100%", marginTop: 12 }}
                  disabled={busy || !auth || codeLockout > 0}
                >
                  {busy ? "Verifying…" : "Unlock Dashboard"}
                </button>
              </form>

              {/* SECONDARY LOGIN DISCLOSURE */}
              <div className="credentials-disclosure-section">
                <button
                  type="button"
                  id="credentials-toggle"
                  className="credentials-disclosure-btn"
                  aria-expanded={showSecondaryLogin}
                  aria-controls="credentials-form-panel"
                  onClick={() => setShowSecondaryLogin(!showSecondaryLogin)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowSecondaryLogin(!showSecondaryLogin);
                    }
                  }}
                >
                  <span className="credentials-disclosure-label">Login with Credentials</span>
                  <ChevronDown
                    size={20}
                    className={"credentials-chevron " + (showSecondaryLogin ? "rotated" : "")}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id="credentials-form-panel"
                  className={"credentials-collapse " + (showSecondaryLogin ? "expanded" : "")}
                  role="region"
                  aria-labelledby="credentials-toggle"
                >
                  <form
                    className="credentials-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!email.trim() || !password.trim()) return;
                      void run(async () => {
                        const res = await api({
                          action: "login-password",
                          email: email.trim(),
                          password,
                        });
                        setPassword("");
                        if (res.session && auth) {
                          try {
                            await auth.auth.setSession(res.session);
                          } catch {
                            /* ignore */
                          }
                        }
                        if (!res.pinConfigured) {
                          setStage("setup");
                        } else {
                          await load();
                        }
                      });
                    }}
                  >
                    <label>
                      Owner email
                      <input
                        type="email"
                        required
                        disabled={passwordLockout > 0 || busy}
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@domain.com"
                      />
                    </label>
                    <label>
                      Password
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          disabled={passwordLockout > 0 || busy}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingRight: 40 }}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            opacity: 0.7,
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>

                    {passwordLockout > 0 && (
                      <p className="status" style={{ color: "var(--accent)", marginTop: 8 }}>
                        Credential access locked. Retry in {passwordLockout}s
                      </p>
                    )}

                    <button
                      type="submit"
                      className="button secondary"
                      style={{ width: "100%", marginTop: 14 }}
                      disabled={busy || !auth || passwordLockout > 0 || !email.trim() || !password.trim()}
                    >
                      {busy ? "Signing in…" : "Login"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* AUTHENTICATED WORKSPACE */
        <>
          <div className="admin-tabs" style={{ position: "relative" }}>
            {tabs.map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "Enquiries" && unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}

            {/* REAL-TIME NOTIFICATION BELL */}
            <div ref={notificationRef} style={{ position: "relative", display: "inline-block" }}>
              <button
                aria-label="Enquiry notifications"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: showNotifications ? "var(--paper)" : "transparent",
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                )}
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 8,
                    width: 320,
                    maxHeight: 380,
                    overflowY: "auto",
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    boxShadow: "0 8px 24px var(--shadow)",
                    padding: 12,
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      Enquiries ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() =>
                          void run(async () => {
                            await api({ action: "mark-all-read" });
                            await loadSilently();
                          })
                        }
                        style={{ fontSize: 11, color: "var(--accent)" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {data.enquiries.filter((e: any) => !e.read).length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0" }}>
                      No new unread customer enquiries.
                    </p>
                  ) : (
                    data.enquiries
                      .filter((e: any) => !e.read)
                      .slice(0, 5)
                      .map((e: any) => (
                        <div
                          key={e.id}
                          onClick={() => {
                            setTab("Enquiries");
                            setStatusFilter("unread");
                            setShowNotifications(false);
                            void api({ action: "enquiry-read", id: e.id, read: true });
                            void loadSilently();
                          }}
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid var(--line)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.data.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {e.data.service} · {new Date(e.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            <button onClick={() => void logout()}>Sign out everywhere</button>
          </div>

          {/* OVERVIEW TAB */}
          {tab === "Overview" && (
            <>
              <div className="admin-summary">
                <div>
                  <b>{site.projects.filter((p) => p.published).length}</b>
                  Published portfolio
                </div>
                <div>
                  <b>{(data.projects || []).length}</b>
                  Active client projects
                </div>
                <div>
                  <b>
                    {data.enquiries.filter((x: any) => x.status === "new").length}
                  </b>
                  New enquiries ({unreadCount} unread)
                </div>
                <div>
                  <b>{(data.emails || []).length}</b>
                  Emails in outbox
                </div>
              </div>
              <p className="status">
                Changes to site content are drafts until you click Publish changes.
                Client project tracking, enquiry updates, and transactional emails persist immediately to Supabase.
              </p>
            </>
          )}

          {/* ACTIVE PROJECTS TAB */}
          {tab === "Active Projects" && (
            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>Active Client Projects</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    Manage client timelines, milestone checklists, delivery links, and live progress updates.
                  </p>
                </div>

                <button
                  className="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
                  onClick={() => {
                    const defaultTracking = "SXD-" + String((data?.projects?.length || 0) + 1).padStart(3, "0");
                    setEditingProject({
                      tracking_code: defaultTracking,
                      title: "",
                      client_name: "",
                      client_email: "",
                      client_phone: "",
                      company: "",
                      service: "Business website",
                      status: "scope_confirmed",
                      agreed_scope: "",
                      estimated_price: "",
                      agreed_price: "",
                      start_date: new Date().toISOString().slice(0, 10),
                      target_date: "",
                      progress_pct: 10,
                      milestones: [
                        { name: "Enquiry Received & Scoping", completed: true },
                        { name: "Requirements Confirmation & Proposal", completed: true },
                        { name: "Core Architecture & Design Concept", completed: false },
                        { name: "Active Development & Feature Build", completed: false },
                        { name: "Quality Assurance & Responsive Testing", completed: false },
                        { name: "Production Deployment & Handover", completed: false },
                      ],
                      public_update: "Project scope has been confirmed. Work is beginning.",
                      internal_notes: "",
                      live_url: "",
                      delivery_notes: "",
                    });
                    setIsProjectModalOpen(true);
                  }}
                >
                  <Plus size={16} /> New Client Project
                </button>
              </div>

              {(!data?.projects || data.projects.length === 0) ? (
                <div style={{ padding: "30px 20px", textAlign: "center", background: "var(--soft)", borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
                    No active client projects yet. You can convert an enquiry from the Enquiries tab or click "New Client Project" above.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.projects.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: 18,
                        background: "var(--paper)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--accent)",
                                padding: "2px 8px",
                                background: "var(--soft)",
                                borderRadius: 4,
                                border: "1px dashed var(--accent)",
                              }}
                            >
                              {p.tracking_code}
                            </span>
                            <strong style={{ fontSize: 16 }}>{p.title}</strong>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>
                            Client: <strong>{p.client_name}</strong> ({p.client_email}) · {p.service}
                            {p.company ? ` · ${p.company}` : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                p.status === "completed"
                                  ? "#25d366"
                                  : p.status === "in_progress" || p.status === "in-progress"
                                    ? "#b78103"
                                    : "var(--accent)",
                              color: "#fff",
                            }}
                          >
                            {p.status.replace("_", " ")}
                          </span>

                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "6px 12px", fontSize: 12 }}
                            onClick={() => {
                              setEditingProject({ ...p });
                              setIsProjectModalOpen(true);
                            }}
                          >
                            Manage Project
                          </button>

                          <Link
                            to={`/track?code=${p.tracking_code}`}
                            target="_blank"
                            className="button secondary"
                            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            View on /track <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ margin: "14px 0 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: "var(--muted)" }}>Progress</span>
                          <strong>{p.progress_pct || 0}%</strong>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            background: "var(--panel)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${p.progress_pct || 0}%`,
                              background: "var(--accent)",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                      </div>

                      {/* Project Meta Chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                        {p.target_date && (
                          <span>Target: <strong style={{ color: "var(--text)" }}>{new Date(p.target_date).toLocaleDateString()}</strong></span>
                        )}
                        {p.agreed_price && (
                          <span>Pricing: <strong style={{ color: "var(--text)" }}>{p.agreed_price}</strong></span>
                        )}
                        {p.live_url && (
                          <a href={p.live_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                            Live Site ↗
                          </a>
                        )}
                      </div>

                      {/* Public update preview */}
                      {p.public_update && (
                        <div style={{ marginTop: 10, padding: 10, background: "var(--soft)", borderRadius: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: "var(--muted)", display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Current Public Broadcast (Visible on /track):
                          </span>
                          {p.public_update}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ENQUIRIES TAB (UPGRADED) */}
          {tab === "Enquiries" && (
            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>Customer enquiries</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    {filteredEnquiries.length} of {data.enquiries.length} enquiries displayed.
                  </p>
                </div>

                {/* CSV EXPORT */}
                <button
                  className="button secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}
                  onClick={() => {
                    const rows = [
                      [
                        "Date",
                        "Name",
                        "Email",
                        "Company",
                        "Service",
                        "Timeline",
                        "Budget",
                        "Status",
                        "Read",
                        "Email Alert",
                        "Notes",
                        "Description",
                        "Features",
                      ],
                      ...data.enquiries.map((r: any) => [
                        new Date(r.created_at).toISOString(),
                        r.data.name,
                        r.data.email,
                        r.data.company || "",
                        r.data.service,
                        r.data.timeline || "",
                        r.data.budget || "",
                        r.status,
                        r.read ? "Yes" : "No",
                        r.email_status || "n/a",
                        r.notes || "",
                        r.data.description || "",
                        r.data.features || "",
                      ]),
                    ];
                    const csv = rows
                      .map((r) =>
                        r
                          .map(
                            (v: string) =>
                              '"' +
                              (/^[=+@-]/.test(v) ? "'" : "") +
                              v.replaceAll('"', '""') +
                              '"',
                          )
                          .join(","),
                      )
                      .join("\r\n");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([csv], { type: "text/csv" }),
                    );
                    a.download = `sanju-x-dev-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>

              {/* FILTERS & SEARCH CONTROLS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                  background: "var(--panel)",
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Search</label>
                  <input
                    aria-label="Search enquiries"
                    placeholder="Search name, email, company…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ margin: 0 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Status filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ margin: 0 }}
                  >
                    <option value="all">All statuses ({data.enquiries.length})</option>
                    <option value="unread">Unread only ({unreadCount})</option>
                    <option value="new">
                      New ({data.enquiries.filter((x: any) => x.status === "new").length})
                    </option>
                    <option value="in-progress">
                      In-progress ({data.enquiries.filter((x: any) => x.status === "in-progress").length})
                    </option>
                    <option value="closed">
                      Closed ({data.enquiries.filter((x: any) => x.status === "closed").length})
                    </option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Service filter</label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    style={{ margin: 0 }}
                  >
                    <option value="all">All services</option>
                    {Array.from(new Set(data.enquiries.map((e: any) => e.data?.service))).map((srv: any) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Sort order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    style={{ margin: 0 }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              {/* ENQUIRIES LIST */}
              {filteredEnquiries.map((r: any) => (
                <details
                  key={r.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    marginBottom: 12,
                    background: "var(--paper)",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      background: r.read ? "transparent" : "var(--soft)",
                      fontWeight: r.read ? 400 : 600,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {!r.read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--accent)",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--accent)",
                          background: "var(--soft)",
                          border: "1px solid var(--accent)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {r.tracking_code || r.data?.tracking_code || "SXD-001"}
                      </span>
                      <span>
                        <strong>{r.data.name}</strong> · {r.data.service}
                        {r.data.company ? ` (${r.data.company})` : ""}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background:
                            r.status === "new"
                              ? "var(--accent)"
                              : r.status === "in-progress"
                                ? "#b78103"
                                : r.status === "accepted"
                                  ? "#1976d2"
                                  : r.status === "declined"
                                    ? "#d32f2f"
                                    : "var(--muted)",
                          color: "#fff",
                        }}
                      >
                        {r.status}
                      </span>
                      <small style={{ color: "var(--muted)" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </summary>

                  <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                    {/* Primary Metadata Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>SXD Tracking ID</small>
                        <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, color: "var(--accent)" }}>
                          {r.tracking_code || r.data?.tracking_code || "SXD-001"}
                        </div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Customer Name</small>
                        <div style={{ fontWeight: 600 }}>{r.data.name}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Email Address</small>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <a href={"mailto:" + r.data.email} style={{ fontWeight: 600, color: "var(--accent)" }}>
                            {r.data.email}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyEmail(r.data.email, r.id)}
                            style={{
                              padding: "2px 6px",
                              fontSize: 11,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              border: "1px solid var(--line)",
                              borderRadius: 4,
                            }}
                          >
                            {copiedId === r.id ? <Check size={12} color="green" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Phone / WhatsApp</small>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{r.phone || r.data.phone || "Not provided"}</span>
                          {(r.phone || r.data.phone) && (
                            <a
                              href={`https://wa.me/${(r.phone || r.data.phone).replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 11,
                                color: "#25d366",
                                fontWeight: 600,
                                textDecoration: "underline",
                              }}
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Business / Brand Name</small>
                        <div>{r.data.company || r.data.business_name || (r.data.is_individual ? "For Myself (Individual)" : "None")}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Website Type</small>
                        <div style={{ fontWeight: 600 }}>{r.data.service}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Design Preference</small>
                        <div>{r.data.design_preference || "Standard"}</div>
                      </div>

                      {r.data.reference_url && (
                        <div>
                          <small style={{ color: "var(--muted)", display: "block" }}>Reference Website</small>
                          <a href={r.data.reference_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--accent)", fontSize: 12 }}>
                            {r.data.reference_url} ↗
                          </a>
                        </div>
                      )}

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Existing Website</small>
                        <div>
                          {r.data.website_url || r.data.existing_website_url ? (
                            <a href={r.data.website_url || r.data.existing_website_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                              {r.data.website_url || r.data.existing_website_url} ↗
                            </a>
                          ) : (
                            r.data.has_existing_website || "No existing site"
                          )}
                        </div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Domain Preference</small>
                        <div>{r.data.has_domain || "Not Sure"}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Timeline & Budget</small>
                        <div>{r.data.timeline || "Flexible"} · {r.data.budget || "No budget specified"}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Preferred Contact</small>
                        <div style={{ fontWeight: 600 }}>{r.preferred_contact || r.data.preferred_contact || "Email"}</div>
                      </div>

                      {r.data.city && (
                        <div>
                          <small style={{ color: "var(--muted)", display: "block" }}>Location</small>
                          <div>{r.data.city}</div>
                        </div>
                      )}

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Submission Date</small>
                        <div>{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)", display: "block" }}>Email Notification Status</small>
                        <div>
                          {r.email_status === "sent" ? (
                            <span style={{ color: "green", fontSize: 12, fontWeight: 600 }}>✓ Delivered to Owner</span>
                          ) : r.email_status === "failed" ? (
                            <span style={{ color: "var(--accent)", fontSize: 12 }}>⚠ Delivery Failed</span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>Saved in Database</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selected Features */}
                    {r.data.features && (
                      <div style={{ marginBottom: 16 }}>
                        <small style={{ color: "var(--muted)", display: "block", marginBottom: 6 }}>Selected Features</small>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(Array.isArray(r.data.features) ? r.data.features : [r.data.features]).map((f: string, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                background: "var(--panel)",
                                border: "1px solid var(--line)",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Description */}
                    <div style={{ marginBottom: 16 }}>
                      <small style={{ color: "var(--muted)" }}>Project Description / Idea</small>
                      <div
                        style={{
                          background: "var(--panel)",
                          padding: 12,
                          borderRadius: 4,
                          marginTop: 4,
                          whiteSpace: "pre-wrap",
                          fontSize: 13.5,
                          lineHeight: 1.6,
                        }}
                      >
                        {r.data.description || "No written description provided (selected categories and features above)."}
                      </div>
                    </div>

                    {/* Additional Message */}
                    {r.data.additional_message && (
                      <div style={{ marginBottom: 16 }}>
                        <small style={{ color: "var(--muted)" }}>Additional Client Message</small>
                        <div
                          style={{
                            background: "var(--panel)",
                            borderLeft: "3px solid var(--accent)",
                            padding: 12,
                            borderRadius: "0 4px 4px 0",
                            marginTop: 4,
                            whiteSpace: "pre-wrap",
                            fontSize: 13.5,
                          }}
                        >
                          {r.data.additional_message}
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void run(async () => {
                          await api({
                            action: "enquiry",
                            id: r.id,
                            status: f.get("status"),
                            notes: f.get("notes"),
                          });
                          await load();
                          setStatus("Enquiry updated successfully.");
                        });
                      }}
                      style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                        <label>
                          Enquiry Status
                          <select name="status" defaultValue={r.status}>
                            <option value="new">New</option>
                            <option value="in-progress">In-progress</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                            <option value="closed">Closed</option>
                          </select>
                        </label>

                        <label>
                          Private Owner Notes
                          <textarea
                            name="notes"
                            rows={3}
                            maxLength={5000}
                            placeholder="Add private internal notes about this client enquiry…"
                            defaultValue={r.notes || ""}
                          />
                        </label>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 12,
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <button className="button" style={{ padding: "8px 16px" }} disabled={busy}>
                            Save update
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "8px 16px" }}
                            onClick={() =>
                              void run(async () => {
                                await api({
                                  action: "enquiry-read",
                                  id: r.id,
                                  read: !r.read,
                                });
                                await loadSilently();
                              })
                            }
                          >
                            {r.read ? "Mark as unread" : "Mark as read"}
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "8px 16px", borderColor: "var(--accent)", color: "var(--accent)" }}
                            onClick={() => {
                              setEditingProject({
                                tracking_code: r.tracking_code || "SXD-001",
                                title: (r.data.company || r.data.name) + " — " + r.data.service,
                                client_name: r.data.name,
                                client_email: r.data.email,
                                client_phone: r.phone || r.data.phone || "",
                                company: r.data.company || "",
                                service: r.data.service,
                                status: "scope_confirmed",
                                agreed_scope: r.data.description,
                                estimated_price: r.data.budget || "",
                                agreed_price: r.data.budget || "",
                                start_date: new Date().toISOString().slice(0, 10),
                                target_date: "",
                                progress_pct: 15,
                                milestones: [
                                  { name: "Enquiry Received & Scoping", completed: true },
                                  { name: "Requirements Confirmation & Proposal", completed: true },
                                  { name: "Core Architecture & Design Concept", completed: false },
                                  { name: "Active Development & Feature Build", completed: false },
                                  { name: "Quality Assurance & Responsive Testing", completed: false },
                                  { name: "Production Deployment & Handover", completed: false },
                                ],
                                public_update: "Project scope has been confirmed. Architecture and design are underway.",
                                internal_notes: r.notes || "",
                                live_url: "",
                                delivery_notes: "",
                                enquiry_id: r.id,
                              });
                              setIsProjectModalOpen(true);
                              setTab("Active Projects");
                            }}
                          >
                            Convert to Active Project →
                          </button>
                        </div>

                        <button
                          type="button"
                          style={{
                            color: "var(--accent)",
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => {
                            if (
                              confirm(
                                `Permanently delete enquiry from ${r.data.name}? This action cannot be undone.`,
                              )
                            ) {
                              void run(async () => {
                                await api({
                                  action: "delete-enquiry",
                                  id: r.id,
                                });
                                await load();
                                setStatus("Enquiry deleted.");
                              });
                            }
                          }}
                        >
                          <Trash2 size={14} /> Delete enquiry
                        </button>
                      </div>
                    </form>
                  </div>
                </details>
              ))}

              {!filteredEnquiries.length && (
                <p style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  No customer enquiries match your search or filter.
                </p>
              )}
            </div>
          )}

          {/* EMAIL OUTBOX TAB */}
          {tab === "Email Outbox" && (
            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>Transactional Email Outbox</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    Audit history of customer tracking codes, owner inbox alerts, and milestone updates via Gmail SMTP (smtp.gmail.com:465 SSL/TLS).
                  </p>
                </div>
              </div>

              {/* GMAIL SMTP STATUS & CONTROLS */}
              <div
                style={{
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "16px 18px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>
                      Delivery Service
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      Gmail SMTP <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>· {data?.emailConfig?.host || "smtp.gmail.com"}:{data?.emailConfig?.port || 465} (SSL/TLS)</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Authenticated Account: <span style={{ color: "var(--text)", fontWeight: 600 }}>{data?.emailConfig?.user || data?.emailConfig?.ownerNotificationEmail || "sanjuxdev27@gmail.com"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: data?.emailConfig?.configured ? "#25d366" : "#b78103",
                        color: "#fff",
                      }}
                    >
                      {data?.emailConfig?.configured ? "SMTP Configured" : "Awaiting App Password"}
                    </span>

                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={verifyingSmtp}
                      onClick={() => {
                        void run(async () => {
                          setVerifyingSmtp(true);
                          setSmtpVerifyResult(null);
                          try {
                            const res = await api({ action: "verify-smtp" });
                            setSmtpVerifyResult(res);
                          } catch (err) {
                            setSmtpVerifyResult({ verified: false, error: (err as Error).message });
                          } finally {
                            setVerifyingSmtp(false);
                          }
                        });
                      }}
                    >
                      {verifyingSmtp ? "Verifying…" : "Test SMTP Connection"}
                    </button>
                  </div>
                </div>

                {smtpVerifyResult && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      fontSize: 12,
                      marginBottom: 12,
                      background: smtpVerifyResult.verified ? "#e6f9ed" : "#fef2f2",
                      color: smtpVerifyResult.verified ? "#15803d" : "#b91c1c",
                      border: `1px solid ${smtpVerifyResult.verified ? "#bbf7d0" : "#fecaca"}`,
                    }}
                  >
                    {smtpVerifyResult.verified
                      ? `✅ Connection to ${smtpVerifyResult.host}:${smtpVerifyResult.port} (SSL/TLS) verified successfully.`
                      : `❌ Verification failed: ${smtpVerifyResult.error || "Unable to connect."}`}
                  </div>
                )}

                {/* TEST EMAIL TRIGGER */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <input
                    type="email"
                    placeholder={`Test recipient (default: ${data?.emailConfig?.ownerNotificationEmail || "sanjuxdev27@gmail.com"})`}
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    style={{
                      flex: "1 1 240px",
                      maxWidth: 400,
                      padding: "7px 12px",
                      fontSize: 13,
                      borderRadius: 5,
                      border: "1px solid var(--line)",
                      background: "var(--paper)",
                    }}
                  />
                  <button
                    type="button"
                    className="button"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13 }}
                    disabled={testEmailBusy}
                    onClick={() => {
                      void run(async () => {
                        setTestEmailBusy(true);
                        setTestEmailResult("");
                        try {
                          const res = await api({ action: "test-email", recipient: testEmailRecipient.trim() || undefined });
                          setTestEmailResult(`✅ Test email successfully dispatched via Gmail SMTP to ${res.recipient}! Check your inbox.`);
                          await load();
                        } catch (err) {
                          setTestEmailResult(`❌ Dispatch failed: ${(err as Error).message}`);
                        } finally {
                          setTestEmailBusy(false);
                        }
                      });
                    }}
                  >
                    <Send size={14} /> {testEmailBusy ? "Sending test…" : "Send Test Email"}
                  </button>
                </div>

                {testEmailResult && (
                  <div className="status" style={{ marginTop: 12, fontSize: 13 }}>
                    {testEmailResult}
                  </div>
                )}
              </div>

              {(!data?.emails || data.emails.length === 0) ? (
                <div style={{ padding: "30px 20px", textAlign: "center", background: "var(--soft)", borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
                    No emails logged in outbox yet. Incoming enquiries and project updates will appear here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.emails.map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        padding: "12px 16px",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        background: "var(--paper)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {m.tracking_code && (
                            <span
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--accent)",
                                padding: "1px 6px",
                                background: "var(--soft)",
                                borderRadius: 3,
                              }}
                            >
                              {m.tracking_code}
                            </span>
                          )}
                          <strong style={{ fontSize: 13 }}>{m.subject}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          To: <span style={{ color: "var(--text)" }}>{m.recipient}</span> · Template: {m.template}
                        </div>
                        {m.error && (
                          <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>
                            Error: {m.error}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                m.status === "sent"
                                  ? "#25d366"
                                  : m.status === "failed"
                                    ? "var(--accent)"
                                    : "#b78103",
                              color: "#fff",
                            }}
                          >
                            {m.status}
                          </span>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                            {new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}
                          </div>
                        </div>

                        {m.status === "failed" && (
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "4px 10px", fontSize: 11 }}
                            onClick={() => {
                              void run(async () => {
                                await api({ action: "retry-email", id: m.id });
                                await load();
                                setStatus("Email retried successfully.");
                              });
                            }}
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REAL ANALYTICS TAB */}
          {tab === "Analytics" && (
            <div className="admin-card">
              <h3>Genuine Business Analytics</h3>
              <p style={{ color: "var(--muted)", marginBottom: 20 }}>
                Direct metrics verified from your database records. No fabricated statistics.
              </p>

              {/* ENQUIRY METRICS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div style={{ background: "var(--panel)", padding: 16, borderRadius: 6 }}>
                  <small style={{ color: "var(--muted)" }}>Total Enquiries</small>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{data.enquiries.length}</div>
                  <small style={{ color: "var(--muted)" }}>All-time submissions</small>
                </div>

                <div style={{ background: "var(--panel)", padding: 16, borderRadius: 6 }}>
                  <small style={{ color: "var(--muted)" }}>New Enquiries</small>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>
                    {data.enquiries.filter((e: any) => e.status === "new").length}
                  </div>
                  <small style={{ color: "var(--muted)" }}>Awaiting response</small>
                </div>

                <div style={{ background: "var(--panel)", padding: 16, borderRadius: 6 }}>
                  <small style={{ color: "var(--muted)" }}>In Progress</small>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#b78103" }}>
                    {data.enquiries.filter((e: any) => e.status === "in-progress").length}
                  </div>
                  <small style={{ color: "var(--muted)" }}>Active conversations</small>
                </div>

                <div style={{ background: "var(--panel)", padding: 16, borderRadius: 6 }}>
                  <small style={{ color: "var(--muted)" }}>Closed & Fulfilled</small>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {data.enquiries.filter((e: any) => e.status === "closed").length}
                  </div>
                  <small style={{ color: "var(--muted)" }}>Completed briefs</small>
                </div>
              </div>

              {/* POPULAR SERVICES BREAKDOWN */}
              <div style={{ marginBottom: 24 }}>
                <h4>Enquiries by Service</h4>
                <div style={{ marginTop: 12 }}>
                  {site.services.map((srv) => {
                    const count = data.enquiries.filter(
                      (e: any) => e.data?.service === srv.name,
                    ).length;
                    const pct = data.enquiries.length
                      ? Math.round((count / data.enquiries.length) * 100)
                      : 0;
                    return (
                      <div key={srv.name} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span>{srv.name}</span>
                          <span>
                            <strong>{count}</strong> ({pct}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: "var(--line)",
                            borderRadius: 3,
                            overflow: "hidden",
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VERCEL WEB ANALYTICS INTEGRATION STATUS */}
              <div
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: 18,
                  marginTop: 20,
                }}
              >
                <h4 style={{ margin: "0 0 6px 0" }}>Vercel Web Analytics Integration</h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Privacy-first visitor statistics, page views, and traffic sources are collected at the Vercel edge.
                  To display live edge telemetry directly inside this view, configure <code>VERCEL_PROJECT_ID</code> and{" "}
                  <code>VERCEL_AUTH_TOKEN</code> in your environment variables.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "green",
                    }}
                  />
                  <small style={{ fontSize: 12 }}>Enquiry database telemetry active and synchronized</small>
                </div>
              </div>
            </div>
          )}

          {/* PROJECTS TAB */}
          {tab === "Projects" && (
            <div className="admin-card">
              <h3>Projects & case studies</h3>
              {site.projects.map((p, i) => (
                <details key={i}>
                  <summary>
                    {p.order}. {p.name} — {p.published ? "Published" : "Draft"}
                  </summary>
                  <div>
                    {(
                      [
                        "name",
                        "short",
                        "slug",
                        "category",
                        "kind",
                        "url",
                        "image",
                        "mobile",
                        "headline",
                        "summary",
                        "story",
                        "note",
                      ] as const
                    ).map((k) => (
                      <label key={k}>
                        {k}
                        {["story", "summary", "note"].includes(k) ? (
                          <textarea
                            value={p[k]}
                            onChange={(e) =>
                              setSite({
                                ...site,
                                projects: site.projects.map((x, j) =>
                                  j === i ? { ...x, [k]: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        ) : (
                          <input
                            value={p[k]}
                            onChange={(e) =>
                              setSite({
                                ...site,
                                projects: site.projects.map((x, j) =>
                                  j === i ? { ...x, [k]: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </label>
                    ))}
                    <label>
                      Features (one per line)
                      <textarea
                        value={p.features.join("\n")}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            projects: site.projects.map((x, j) =>
                              j === i
                                ? { ...x, features: e.target.value.split("\n") }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Display order
                      <input
                        type="number"
                        value={p.order}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            projects: site.projects.map((x, j) =>
                              j === i
                                ? { ...x, order: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={p.published}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            projects: site.projects.map((x, j) =>
                              j === i
                                ? { ...x, published: e.target.checked }
                                : x,
                            ),
                          })
                        }
                      />
                      Published
                    </label>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Remove this project from the draft? Publish to apply.",
                          )
                        )
                          setSite({
                            ...site,
                            projects: site.projects.filter((_, j) => j !== i),
                          });
                      }}
                    >
                      Remove project
                    </button>
                  </div>
                </details>
              ))}
              <button
                onClick={() =>
                  setSite({
                    ...site,
                    projects: [
                      ...site.projects,
                      {
                        ...defaults.projects[0],
                        slug: "new-project-" + (site.projects.length + 1),
                        name: "New project",
                        short: "New project",
                        order: site.projects.length + 1,
                        published: false,
                      },
                    ],
                  })
                }
              >
                Add project draft
              </button>
            </div>
          )}

          {/* PAGE CONTENT TAB */}
          {tab === "Page content" && (
            <div className="admin-card">
              <h3>Brand & editorial text</h3>
              {field("headline", "Home headline", true)}
              {field("intro", "Home introductory paragraph", true)}
              {field("about", "About page summary text", true)}
              {field("email", "Business contact email address")}
              {field("instagram", "Official Instagram URL")}
              {field("facebook", "Official Facebook URL")}
            </div>
          )}

          {/* SERVICES TAB */}
          {tab === "Services" && (
            <div className="admin-card">
              <h3>Offered services</h3>
              {site.services.map((s, i) => (
                <details key={i}>
                  <summary>{s.name}</summary>
                  <div>
                    {(["name", "description", "items"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          value={s[k]}
                          onChange={(e) =>
                            setSite({
                              ...site,
                              services: site.services.map((x, j) =>
                                j === i ? { ...x, [k]: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* THEMES TAB */}
          {/* Site theme is permanently unified to single refined premium theme */}
          {tab === "Page content" && (
            <div className="admin-card" style={{ marginBottom: 20 }}>
              <h3>Primary Brand Theme & Display</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px 0" }}>
                Active Theme: <strong>SANJU X DEV Primary (Silver, White &amp; Metallic Crimson)</strong>.
                Theme-switching has been consolidated into this single refined identity.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={site.introEnabled}
                  onChange={(e) =>
                    setSite({ ...site, introEnabled: e.target.checked })
                  }
                />
                Play introduction animation once per session
              </label>
            </div>
          )}

          {/* SERVICES & ENQUIRY FORM TAB */}
          {tab === "Services & Enquiry Form" && (
            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>Services & Enquiry Form Management</h3>
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                    Customize the 5 website categories, descriptions, example tags, relevant feature matrices, design styles, and form defaults.
                  </p>
                </div>

                <a
                  href="/contact"
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px" }}
                >
                  <ExternalLink size={14} /> Preview Live Enquiry Form
                </a>
              </div>

              {/* 1. EDIT THE FIVE WEBSITE CATEGORIES */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
                  1. Website Categories & Dynamic Feature Matrices
                </h4>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px 0" }}>
                  The enquiry builder displays exactly five main website categories. You can edit names, descriptions, example pills, and tailor the feature checkboxes for each category.
                </p>

                {((site as any).websiteCategories || defaults.websiteCategories || []).map((cat: any, i: number) => (
                  <div
                    key={cat.id || i}
                    style={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 10,
                          }}
                        >
                          Option {i + 1}
                        </span>
                        <strong style={{ fontSize: 15 }}>{cat.label}</strong>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        {i > 0 && (
                          <button
                            type="button"
                            title="Move Up"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => {
                              const list = [...((site as any).websiteCategories || defaults.websiteCategories)];
                              const temp = list[i - 1];
                              list[i - 1] = list[i];
                              list[i] = temp;
                              setSite({ ...site, websiteCategories: list });
                            }}
                          >
                            ↑
                          </button>
                        )}
                        {i < ((site as any).websiteCategories || defaults.websiteCategories).length - 1 && (
                          <button
                            type="button"
                            title="Move Down"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => {
                              const list = [...((site as any).websiteCategories || defaults.websiteCategories)];
                              const temp = list[i + 1];
                              list[i + 1] = list[i];
                              list[i] = temp;
                              setSite({ ...site, websiteCategories: list });
                            }}
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="form-grid">
                      <label>
                        Category Label
                        <input
                          value={cat.label}
                          onChange={(e) =>
                            setSite({
                              ...site,
                              websiteCategories: ((site as any).websiteCategories || defaults.websiteCategories).map(
                                (c: any, j: number) => (j === i ? { ...c, label: e.target.value } : c),
                              ),
                            })
                          }
                        />
                      </label>

                      <label>
                        One-Line Description
                        <input
                          value={cat.desc}
                          onChange={(e) =>
                            setSite({
                              ...site,
                              websiteCategories: ((site as any).websiteCategories || defaults.websiteCategories).map(
                                (c: any, j: number) => (j === i ? { ...c, desc: e.target.value } : c),
                              ),
                            })
                          }
                        />
                      </label>
                    </div>

                    <label style={{ display: "block", marginTop: 8 }}>
                      Examples (Comma-separated)
                      <input
                        value={Array.isArray(cat.examples) ? cat.examples.join(", ") : (cat.examples || "")}
                        onChange={(e) => {
                          const exList = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setSite({
                            ...site,
                            websiteCategories: ((site as any).websiteCategories || defaults.websiteCategories).map(
                              (c: any, j: number) => (j === i ? { ...c, examples: exList } : c),
                            ),
                          });
                        }}
                      />
                    </label>

                    {/* Features checklist for this category */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                        Relevant Selectable Features for {cat.label}:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {(cat.features || []).map((feat: string, fIdx: number) => (
                          <span
                            key={fIdx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "var(--paper)",
                              border: "1px solid var(--line)",
                              borderRadius: 4,
                              padding: "3px 8px",
                              fontSize: 12,
                            }}
                          >
                            {feat}
                            <button
                              type="button"
                              style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--accent)", fontSize: 12 }}
                              onClick={() => {
                                const newFeats = cat.features.filter((_: string, k: number) => k !== fIdx);
                                setSite({
                                  ...site,
                                  websiteCategories: ((site as any).websiteCategories || defaults.websiteCategories).map(
                                    (c: any, j: number) => (j === i ? { ...c, features: newFeats } : c),
                                  ),
                                });
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements.namedItem("addFeature") as HTMLInputElement;
                          const val = input.value.trim();
                          if (!val) return;
                          const newFeats = [...(cat.features || []), val];
                          setSite({
                            ...site,
                            websiteCategories: ((site as any).websiteCategories || defaults.websiteCategories).map(
                              (c: any, j: number) => (j === i ? { ...c, features: newFeats } : c),
                            ),
                          });
                          input.value = "";
                        }}
                        style={{ display: "flex", gap: 8, maxWidth: 350 }}
                      >
                        <input name="addFeature" placeholder={`Add feature to ${cat.label}...`} style={{ flex: 1, fontSize: 12 }} />
                        <button type="submit" className="button secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              {/* PRIMARY OBJECTIVES */}
              <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Primary Objective Options</h4>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px 0" }}>
                  Selectable checkboxes displayed in Step 2 (&quot;What Should Your Website Do?&quot;).
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {((site as any).primaryObjectives || defaults.primaryObjectives || []).map((obj: string, oIdx: number) => (
                    <span
                      key={oIdx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        padding: "4px 10px",
                        fontSize: 12.5,
                      }}
                    >
                      {obj}
                      <button
                        type="button"
                        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--accent)", fontSize: 12 }}
                        onClick={() => {
                          const newObjs = ((site as any).primaryObjectives || defaults.primaryObjectives).filter((_: string, k: number) => k !== oIdx);
                          setSite({ ...site, primaryObjectives: newObjs });
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem("addObjective") as HTMLInputElement;
                    const val = input.value.trim();
                    if (!val) return;
                    const newObjs = [...((site as any).primaryObjectives || defaults.primaryObjectives), val];
                    setSite({ ...site, primaryObjectives: newObjs });
                    input.value = "";
                  }}
                  style={{ display: "flex", gap: 8, maxWidth: 360 }}
                >
                  <input name="addObjective" placeholder="Add new primary objective..." style={{ flex: 1, fontSize: 12.5 }} />
                  <button type="submit" className="button secondary" style={{ fontSize: 12.5, padding: "4px 12px" }}>
                    Add
                  </button>
                </form>
              </div>

              {/* 2. DESIGN PREFERENCES */}
              <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>2. Design Style Preferences</h4>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px 0" }}>
                  Options displayed in Step 2 to capture the client&apos;s aesthetic direction.
                </p>

                <div className="builder-radio-group">
                  {((site as any).designStyles || defaults.designStyles || []).map((style: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      style={{
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: 12,
                      }}
                    >
                      <input
                        value={style.label}
                        style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}
                        onChange={(e) => {
                          const updated = ((site as any).designStyles || defaults.designStyles).map(
                            (st: any, k: number) => (k === sIdx ? { ...st, label: e.target.value } : st),
                          );
                          setSite({ ...site, designStyles: updated });
                        }}
                      />
                      <input
                        value={style.desc}
                        style={{ fontSize: 11.5, color: "var(--muted)" }}
                        onChange={(e) => {
                          const updated = ((site as any).designStyles || defaults.designStyles).map(
                            (st: any, k: number) => (k === sIdx ? { ...st, desc: e.target.value } : st),
                          );
                          setSite({ ...site, designStyles: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. TIMELINE & BUDGET OPTIONS */}
              <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>3. Timeline & Budget Choices</h4>
                <div className="form-grid">
                  <div>
                    <label>
                      Timeline Options (Comma-separated)
                      <input
                        value={(((site as any).timelineChoices || defaults.timelineChoices) || []).join(", ")}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setSite({ ...site, timelineChoices: list });
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label>
                      Budget Range Choices (Comma-separated)
                      <input
                        value={(((site as any).budgetChoices || defaults.budgetChoices) || []).join(", ")}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setSite({ ...site, budgetChoices: list });
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 4. FORM DEFAULTS & SETTINGS */}
              <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>4. Form Defaults & Rules</h4>
                <div className="form-grid">
                  <label>
                    Default Category Selected on Open
                    <select
                      value={(site as any).formConfig?.defaultCategory || "Business Website"}
                      onChange={(e) =>
                        setSite({
                          ...site,
                          formConfig: { ...((site as any).formConfig || {}), defaultCategory: e.target.value },
                        })
                      }
                    >
                      <option value="">(None - Start Unselected)</option>
                      {((site as any).websiteCategories || defaults.websiteCategories || []).map((cat: any) => (
                        <option key={cat.label} value={cat.label}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Default Design Style
                    <select
                      value={(site as any).formConfig?.defaultDesignStyle || "Clean & Simple"}
                      onChange={(e) =>
                        setSite({
                          ...site,
                          formConfig: { ...((site as any).formConfig || {}), defaultDesignStyle: e.target.value },
                        })
                      }
                    >
                      {((site as any).designStyles || defaults.designStyles || []).map((st: any) => (
                        <option key={st.label} value={st.label}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SPIDEYY TAB */}
          {tab === "spideyy" && (
            <div className="admin-card">
              <h3>Spideyy Configuration</h3>

              {/* AI ENGINE STATUS & LIVE DIAGNOSTICS */}
              <div
                style={{
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "16px 18px",
                  marginBottom: 20,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>
                      AI Response System
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      OpenAI Chat Completions <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>· Model: {data?.aiConfig?.model || "gpt-4o-mini"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Authentication: <span style={{ color: "var(--text)", fontWeight: 600 }}>{data?.aiConfig?.configured ? "Server-side Secret Active" : "Unconfigured in .env.local"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: data?.aiConfig?.configured ? "#25d366" : "#b78103",
                        color: "#fff",
                      }}
                    >
                      {data?.aiConfig?.configured ? "AI Online (gpt-4o-mini)" : "FAQ Guide Mode Active"}
                    </span>

                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={testingAi}
                      onClick={() => {
                        void run(async () => {
                          setTestingAi(true);
                          setTestAiResult(null);
                          try {
                            const res = await api({ action: "test-ai" });
                            setTestAiResult({ ok: true, answer: res.answer, model: res.model });
                            await load();
                          } catch (err) {
                            setTestAiResult({ ok: false, error: (err as Error).message });
                          } finally {
                            setTestingAi(false);
                          }
                        });
                      }}
                    >
                      {testingAi ? "Testing AI…" : "Test AI Connection"}
                    </button>
                  </div>
                </div>

                {/* REAL METRICS ROW */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                    margin: "12px 0",
                    padding: "10px 0",
                    borderTop: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--muted)", display: "block" }}>Today's AI Requests</span>
                    <strong style={{ fontSize: 16 }}>{data?.aiConfig?.stats?.requestsToday || 0}</strong>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--muted)", display: "block" }}>Today's AI Errors</span>
                    <strong style={{ fontSize: 16, color: (data?.aiConfig?.stats?.errorsToday || 0) > 0 ? "var(--accent)" : "inherit" }}>
                      {data?.aiConfig?.stats?.errorsToday || 0}
                    </strong>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--muted)", display: "block" }}>Last Activity</span>
                    <strong style={{ fontSize: 13 }}>
                      {data?.aiConfig?.stats?.lastUsed ? new Date(data.aiConfig.stats.lastUsed).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "None today"}
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: data?.aiConfig?.stats?.lastError ? "var(--accent)" : "var(--muted)" }}>
                  <strong>Diagnostic Status:</strong> {data?.aiConfig?.stats?.lastError ? `⚠️ ${data.aiConfig.stats.lastError}` : "✅ Ready for live customer enquiries."}
                </div>

                {testAiResult && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      background: testAiResult.ok ? "#e6f9ed" : "#fef2f2",
                      color: testAiResult.ok ? "#15803d" : "#b91c1c",
                      border: `1px solid ${testAiResult.ok ? "#bbf7d0" : "#fecaca"}`,
                    }}
                  >
                    {testAiResult.ok ? (
                      <>
                        <strong>✅ Verified AI Response (${testAiResult.model}):</strong> ${testAiResult.answer}
                      </>
                    ) : (
                      <>
                        <strong>❌ AI Test Failed:</strong> ${testAiResult.error}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* USAGE LIMITS & COST CONTROLS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <label>
                  Daily Request Quota (Cost Protection)
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={(site as any).aiDailyLimit || 100}
                    onChange={(e) => setSite({ ...site, aiDailyLimit: Number(e.target.value) || 100 })}
                  />
                  <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
                    Max customer questions answered by OpenAI per day before falling back to verified FAQ guide.
                  </small>
                </label>

                <label>
                  Max Output Tokens Per Turn
                  <input
                    type="number"
                    min="150"
                    max="1000"
                    value={(site as any).aiMaxTokens || 450}
                    onChange={(e) => setSite({ ...site, aiMaxTokens: Number(e.target.value) || 450 })}
                  />
                  <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
                    Length limit per response (450 tokens ≈ 350 English words).
                  </small>
                </label>
              </div>

              <label className="check">
                <input
                  type="checkbox"
                  checked={site.assistantEnabled}
                  onChange={(e) =>
                    setSite({ ...site, assistantEnabled: e.target.checked })
                  }
                />
                Enable Spideyy across the website
              </label>

              <div style={{ marginTop: 16 }}>
                <label>
                  AI Welcome Greeting Message
                  <textarea
                    rows={2}
                    value={(site as any).assistantWelcome || ""}
                    onChange={(e) =>
                      setSite({ ...site, assistantWelcome: e.target.value })
                    }
                    placeholder="Hi, I'm Spideyy! I can help you understand our services..."
                  />
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>Homepage Example Question Chips</h4>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px 0" }}>
                  These 4 prompt chips appear prominently below the homepage AI input field.
                </p>
                {((site as any).homepageQuestions || []).map((qText: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", width: 20 }}>{i + 1}.</span>
                    <input
                      style={{ flex: 1 }}
                      value={qText}
                      onChange={(e) =>
                        setSite({
                          ...site,
                          homepageQuestions: ((site as any).homepageQuestions || []).map((x: string, j: number) =>
                            j === i ? e.target.value : x,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      style={{ fontSize: 11, color: "var(--accent)", padding: "4px 8px" }}
                      onClick={() =>
                        setSite({
                          ...site,
                          homepageQuestions: ((site as any).homepageQuestions || []).filter((_: any, j: number) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: 11, padding: "6px 12px", marginTop: 4 }}
                  onClick={() =>
                    setSite({
                      ...site,
                      homepageQuestions: [...((site as any).homepageQuestions || []), "New example question?"],
                    })
                  }
                >
                  + Add Question Chip
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                {field("knowledge", "Verified public business knowledge & instructions for AI", true)}
              </div>

              <div style={{ marginTop: 24 }}>
                <h4>Frequently Asked Questions (Rule-based Fallback & Knowledge)</h4>
                {site.faqs.map((f, i) => (
                  <div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 12 }}>
                    <label>
                      Question
                      <input
                        value={f.q}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            faqs: site.faqs.map((x, j) =>
                              j === i ? { ...x, q: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Answer
                      <textarea
                        value={f.a}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            faqs: site.faqs.map((x, j) =>
                              j === i ? { ...x, a: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      onClick={() =>
                        setSite({
                          ...site,
                          faqs: site.faqs.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove FAQ
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setSite({
                      ...site,
                      faqs: [...site.faqs, { q: "New question?", a: "New answer." }],
                    })
                  }
                >
                  Add FAQ
                </button>
              </div>
            </div>
          )}

          {/* SEO TAB */}
          {tab === "SEO" && (
            <div className="admin-card">
              <h3>Search engine metadata</h3>
              {field("seoTitle", "Default website title")}
              {field("seoDescription", "Meta description for search results", true)}
            </div>
          )}

          {/* MEDIA TAB */}
          {tab === "Media" && (
            <div className="admin-card">
              <h3>Media library</h3>
              <label>
                Upload PNG, JPEG or WebP (maximum 3 MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void run(async () => {
                      if (f.size > 3145728)
                        throw Error("Image must be under 3 MB.");
                      const readerData = await new Promise<string>(
                        (resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve(String(reader.result).split(",")[1]);
                          reader.onerror = reject;
                          reader.readAsDataURL(f);
                        },
                      );
                      const r = await api({ action: "upload", data: readerData });
                      await load();
                      setStatus("Uploaded: " + r.url);
                    });
                  }}
                />
              </label>
              {data.media.map((m: any) => (
                <div className="admin-row" key={m.name}>
                  <img src={data.mediaBase + m.name} alt={m.name} />
                  <input
                    aria-label="Media URL"
                    readOnly
                    value={data.mediaBase + m.name}
                  />
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Delete this media file? Pages using it will need another image.",
                        )
                      )
                        void run(async () => {
                          await api({ action: "delete-media", name: m.name });
                          await load();
                        });
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <p>
                To replace an image, upload the replacement and update its
                project URL before deleting the old file.
              </p>
            </div>
          )}

          {/* SECURITY TAB */}
          {tab === "Security" && (
            <div className="admin-card">
              <h3>Security & access control</h3>
              <p style={{ color: "var(--muted)" }}>
                Verified owner identity and server-checked salted scrypt verifiers protect every management operation.
                Workspace unlock sessions expire automatically after 30 minutes.
              </p>

              <div style={{ marginTop: 16 }}>
                <h4>Update private secret code</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if (newCode.length < 8) {
                        throw Error("Secret code must be at least 8 characters long.");
                      }
                      if (newCode !== confirmCode) {
                        throw Error("Codes do not match.");
                      }
                      await api({ action: "setup-code", code: newCode, confirmCode });
                      setNewCode("");
                      setConfirmCode("");
                      setStatus("Secret code updated.");
                    });
                  }}
                >
                  <label>
                    New secret code / passphrase
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Enter new 8+ char code or passphrase"
                    />
                  </label>
                  <label>
                    Confirm new secret code
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                    />
                  </label>
                  <button className="button secondary" style={{ marginTop: 8 }} disabled={busy}>
                    Update secret code
                  </button>
                </form>
              </div>

              <div style={{ marginTop: 24 }}>
                <h4>Recent audit activity</h4>
                {data.activity.map((a: any) => (
                  <div className="admin-row" key={a.id}>
                    <span>{a.action}</span>
                    <small>{new Date(a.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!["Overview", "Active Projects", "Email Outbox", "Enquiries", "Analytics", "Media", "Security"].includes(tab) && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button
                className="button"
                disabled={busy}
                onClick={() => void publish()}
              >
                {busy ? "Publishing…" : "Publish changes"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPreviewOpen(true)}
              >
                Preview Changes ↗
              </button>
            </div>
          )}

          {/* PREVIEW CUSTOMER EXPERIENCE MODAL */}
          {previewOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  maxWidth: 820,
                  width: "100%",
                  maxHeight: "88vh",
                  overflowY: "auto",
                  padding: 24,
                  boxShadow: "0 12px 50px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <div>
                    <b style={{ fontSize: 16 }}>Preview Customer Experience</b>
                    <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>Draft changes in active workspace</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    style={{ background: "transparent", border: 0, fontSize: 18, cursor: "pointer", color: "var(--muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: "var(--paper)", padding: 20, borderRadius: 8, border: "1px solid var(--line)", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>
                    Homepage Headline & Intro:
                  </div>
                  <h2 style={{ margin: "0 0 10px 0", fontSize: 24, fontFamily: "Georgia, serif" }}>
                    {site.headline}
                  </h2>
                  <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "var(--muted)" }}>
                    {site.intro}
                  </p>

                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>
                    Homepage Example Question Chips:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {((site as any).homepageQuestions || []).map((q: string, i: number) => (
                      <span key={i} className="home-ai-chip" style={{ cursor: "default" }}>
                        {q}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ background: "var(--paper)", padding: 20, borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>
                    Client Enquiry Categories ({((site as any).enquiryCategories || []).length} available):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {((site as any).enquiryCategories || []).slice(0, 6).map((c: any, i: number) => (
                      <div key={i} style={{ padding: 10, background: "var(--panel)", borderRadius: 6, border: "1px solid var(--line)" }}>
                        <strong style={{ fontSize: 12 }}>{c.label}</strong>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                  <button type="button" className="button secondary" onClick={() => setPreviewOpen(false)}>
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT EDIT / CREATE MODAL */}
          {isProjectModalOpen && editingProject && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 720,
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>
                    {editingProject.id ? `Manage Project (${editingProject.tracking_code})` : "Create New Client Project"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectModalOpen(false);
                      setEditingProject(null);
                    }}
                    style={{ background: "transparent", border: 0, fontSize: 18, cursor: "pointer", color: "var(--muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const isNew = !editingProject.id;
                      await api({
                        action: isNew ? "create-project" : "update-project",
                        project: editingProject,
                        notifyClient: projectNotifyClient,
                        statusReason: projectStatusReason,
                      });
                      await load();
                      setIsProjectModalOpen(false);
                      setEditingProject(null);
                      setStatus(isNew ? "Project created successfully." : "Project updated successfully.");
                    });
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Tracking Code
                      <input
                        type="text"
                        required
                        disabled={!!editingProject.id}
                        value={editingProject.tracking_code}
                        onChange={(e) => setEditingProject({ ...editingProject, tracking_code: e.target.value.toUpperCase() })}
                      />
                    </label>

                    <label>
                      Project Title
                      <input
                        type="text"
                        required
                        placeholder="e.g. StarX Connect Platform"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Client Name
                      <input
                        type="text"
                        required
                        value={editingProject.client_name}
                        onChange={(e) => setEditingProject({ ...editingProject, client_name: e.target.value })}
                      />
                    </label>

                    <label>
                      Client Email
                      <input
                        type="email"
                        required
                        value={editingProject.client_email}
                        onChange={(e) => setEditingProject({ ...editingProject, client_email: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Client Phone / WhatsApp
                      <input
                        type="text"
                        value={editingProject.client_phone || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, client_phone: e.target.value })}
                      />
                    </label>

                    <label>
                      Company / Brand Name
                      <input
                        type="text"
                        value={editingProject.company || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, company: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Project Status
                      <select
                        value={editingProject.status}
                        onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                      >
                        <option value="under_review">Under Review</option>
                        <option value="scope_confirmed">Scope Confirmed</option>
                        <option value="in_progress">In Active Development</option>
                        <option value="testing">Quality & Responsive Testing</option>
                        <option value="completed">Completed & Delivered</option>
                        <option value="on_hold">On Hold</option>
                        <option value="declined">Declined</option>
                      </select>
                    </label>

                    <label>
                      Progress Percentage: {editingProject.progress_pct || 0}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={editingProject.progress_pct || 0}
                        onChange={(e) => setEditingProject({ ...editingProject, progress_pct: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Start Date
                      <input
                        type="date"
                        value={editingProject.start_date || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                      />
                    </label>

                    <label>
                      Target Completion Date
                      <input
                        type="date"
                        value={editingProject.target_date || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, target_date: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Agreed Pricing
                      <input
                        type="text"
                        placeholder="e.g. ₹65,000 / $800"
                        value={editingProject.agreed_price || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, agreed_price: e.target.value })}
                      />
                    </label>

                    <label>
                      Live Application / Preview URL
                      <input
                        type="url"
                        placeholder="https://client-project.com"
                        value={editingProject.live_url || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, live_url: e.target.value })}
                      />
                    </label>
                  </div>

                  {/* Milestones Manager */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ marginBottom: 6 }}>Milestone Checklist (Visible on /track)</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {(editingProject.milestones || []).map((m: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 10px",
                            background: "var(--soft)",
                            borderRadius: 4,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={m.completed}
                            onChange={(e) => {
                              const updated = [...(editingProject.milestones || [])];
                              updated[idx] = { ...m, completed: e.target.checked };
                              setEditingProject({ ...editingProject, milestones: updated });
                            }}
                          />
                          <input
                            type="text"
                            style={{ margin: 0, flex: 1, padding: "4px 8px", fontSize: 13 }}
                            value={m.name}
                            onChange={(e) => {
                              const updated = [...(editingProject.milestones || [])];
                              updated[idx] = { ...m, name: e.target.value };
                              setEditingProject({ ...editingProject, milestones: updated });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProject.milestones.filter((_: any, i: number) => i !== idx);
                              setEditingProject({ ...editingProject, milestones: updated });
                            }}
                            style={{ color: "var(--accent)", border: 0, background: "transparent", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Add new milestone phase…"
                        style={{ margin: 0, flex: 1 }}
                        value={newMilestoneInput}
                        onChange={(e) => setNewMilestoneInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: "6px 14px" }}
                        onClick={() => {
                          if (newMilestoneInput.trim()) {
                            const updated = [...(editingProject.milestones || []), { name: newMilestoneInput.trim(), completed: false }];
                            setEditingProject({ ...editingProject, milestones: updated });
                            setNewMilestoneInput("");
                          }
                        }}
                      >
                        Add Phase
                      </button>
                    </div>
                  </div>

                  <label>
                    Public Broadcast Update (Shown to client on /track)
                    <textarea
                      rows={3}
                      placeholder="e.g. Core architecture and database models completed. Beginning frontend integration."
                      value={editingProject.public_update || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, public_update: e.target.value })}
                    />
                  </label>

                  <label>
                    Confirmed Project Scope
                    <textarea
                      rows={3}
                      placeholder="Agreed technical scope and deliverables…"
                      value={editingProject.agreed_scope || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, agreed_scope: e.target.value })}
                    />
                  </label>

                  <label>
                    Private Owner Internal Notes
                    <textarea
                      rows={2}
                      placeholder="Strictly internal notes (never visible to client)…"
                      value={editingProject.internal_notes || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, internal_notes: e.target.value })}
                    />
                  </label>

                  {/* Automated Email Notification Checkbox */}
                  <div style={{ margin: "16px 0", padding: 12, background: "var(--soft)", borderRadius: 6 }}>
                    <label className="check" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={projectNotifyClient}
                        onChange={(e) => setProjectNotifyClient(e.target.checked)}
                      />
                      <span>
                        <strong>Dispatch automatic email notification to client</strong> ({editingProject.client_email || "no email"})
                      </span>
                    </label>

                    {["on_hold", "declined"].includes(editingProject.status) && projectNotifyClient && (
                      <div style={{ marginTop: 10 }}>
                        <label>
                          Reason for Status Change (included in email to client)
                          <input
                            type="text"
                            placeholder="e.g. Paused per client request while awaiting branding assets"
                            value={projectStatusReason}
                            onChange={(e) => setProjectStatusReason(e.target.value)}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                    {editingProject.id ? (
                      <button
                        type="button"
                        style={{ color: "var(--accent)", border: 0, background: "transparent", cursor: "pointer", fontSize: 13 }}
                        onClick={() => {
                          if (confirm(`Permanently delete project ${editingProject.title}?`)) {
                            void run(async () => {
                              await api({ action: "delete-project", id: editingProject.id });
                              await load();
                              setIsProjectModalOpen(false);
                              setEditingProject(null);
                              setStatus("Project deleted.");
                            });
                          }
                        }}
                      >
                        Delete Project
                      </button>
                    ) : <span />}

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setIsProjectModalOpen(false);
                          setEditingProject(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="button" disabled={busy}>
                        {busy ? "Saving…" : "Save Project"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {status && (
        <p role="status" className="status">
          {status}
        </p>
      )}
    </section>
  );
}
