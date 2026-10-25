import { useState, useEffect, useRef, useMemo } from "react";
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
    "Projects",
    "Page content",
    "Services",
    "Enquiries",
    "Analytics",
    "Media",
    "Themes",
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
      <h1>spideyy — Private Access</h1>

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

              {/* SECONDARY LOGIN TOGGLE */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setShowSecondaryLogin(!showSecondaryLogin)}
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 0",
                  }}
                >
                  <span>Login with spideyy</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: showSecondaryLogin ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {showSecondaryLogin && (
                  <form
                    style={{ marginTop: 14 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        const res = await api({
                          action: "login-password",
                          email,
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
                      className="button secondary"
                      style={{ width: "100%", marginTop: 12 }}
                      disabled={busy || !auth || passwordLockout > 0}
                    >
                      {busy ? "Signing in…" : "Sign in"}
                    </button>
                  </form>
                )}
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
                  Published projects
                </div>
                <div>
                  <b>
                    {data.enquiries.filter((x: any) => x.status === "new").length}
                  </b>
                  New enquiries ({unreadCount} unread)
                </div>
                <div>
                  <b>{data.media.length}</b>
                  Media files (up to 100)
                </div>
              </div>
              <p className="status">
                Changes to site content are drafts until you click Publish changes.
                Enquiry updates, notes, and media uploads persist immediately to Supabase.
              </p>
            </>
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
                      <span>
                        <strong>{r.data.name}</strong> · {r.data.service}
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
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <small style={{ color: "var(--muted)" }}>Client Email</small>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <a href={"mailto:" + r.data.email} style={{ fontWeight: 600 }}>
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
                            {copiedId === r.id ? (
                              <>
                                <Check size={12} color="green" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {r.data.company && (
                        <div>
                          <small style={{ color: "var(--muted)" }}>Company</small>
                          <div style={{ fontWeight: 600 }}>{r.data.company}</div>
                        </div>
                      )}

                      <div>
                        <small style={{ color: "var(--muted)" }}>Timeline / Budget</small>
                        <div>
                          {r.data.timeline || "Flexible"}{" "}
                          {r.data.budget ? `· Budget: ${r.data.budget}` : ""}
                        </div>
                      </div>

                      <div>
                        <small style={{ color: "var(--muted)" }}>Email Notification</small>
                        <div>
                          {r.email_status === "sent" ? (
                            <span style={{ color: "green", fontSize: 12, fontWeight: 600 }}>
                              ✓ Delivered to Owner
                            </span>
                          ) : r.email_status === "failed" ? (
                            <span style={{ color: "var(--accent)", fontSize: 12 }}>
                              ⚠ Delivery Failed (Check Resend)
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>
                              Saved in Database
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <small style={{ color: "var(--muted)" }}>Project Description</small>
                      <div
                        style={{
                          background: "var(--panel)",
                          padding: 12,
                          borderRadius: 4,
                          marginTop: 4,
                          whiteSpace: "pre-wrap",
                          fontSize: 14,
                        }}
                      >
                        {r.data.description}
                      </div>
                    </div>

                    {r.data.features && (
                      <div style={{ marginBottom: 16 }}>
                        <small style={{ color: "var(--muted)" }}>Requested Features</small>
                        <div
                          style={{
                            background: "var(--panel)",
                            padding: 12,
                            borderRadius: 4,
                            marginTop: 4,
                            whiteSpace: "pre-wrap",
                            fontSize: 14,
                          }}
                        >
                          {r.data.features}
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
                        <div style={{ display: "flex", gap: 8 }}>
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
          {tab === "Themes" && (
            <div className="admin-card">
              <h3>Site settings</h3>
              <label>
                Default theme
                <select
                  value={site.defaultTheme}
                  onChange={(e) =>
                    setSite({ ...site, defaultTheme: e.target.value })
                  }
                >
                  <option value="silver">Paper / Crimson</option>
                  <option value="gold">White / Gold</option>
                  <option value="dark">Red / Black</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={site.introEnabled}
                  onChange={(e) =>
                    setSite({ ...site, introEnabled: e.target.checked })
                  }
                />
                Play cinematic introduction once per session
              </label>
            </div>
          )}

          {/* SPIDEYY TAB */}
          {tab === "spideyy" && (
            <div className="admin-card">
              <h3>Assistant knowledge</h3>
              <label className="check">
                <input
                  type="checkbox"
                  checked={site.assistantEnabled}
                  onChange={(e) =>
                    setSite({ ...site, assistantEnabled: e.target.checked })
                  }
                />
                Enable spideyy assistant
              </label>
              {field("knowledge", "Verified public business knowledge", true)}
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

          {!["Overview", "Enquiries", "Analytics", "Media", "Security"].includes(tab) && (
            <button
              className="button"
              disabled={busy}
              onClick={() => void publish()}
            >
              {busy ? "Publishing…" : "Publish changes"}
            </button>
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
