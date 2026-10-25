import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
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
  const [stage, setStage] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [pin, setPin] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("Overview"),
    [site, setSite] = useState(defaults),
    [data, setData] = useState<any>(null),
    [search, setSearch] = useState("");
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
    if (!r.ok) throw Error(d.error);
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
      setStage("login");
      setData(null);
      setPassword("");
      setPin("");
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
    "Media",
    "Themes",
    "spideyy",
    "SEO",
    "Security",
  ];
  return (
    <section className="page wrap admin-shell">
      <span className="eyebrow">Private / SANJU X DEV</span>
      <h1>Owner workspace.</h1>
      {stage !== "workspace" ? (
        <div className="admin-card admin-login">
          <h3>
            {stage === "login" ? "Secure sign in" : "Secondary verification"}
          </h3>
          {!auth && (
            <p className="status">
              Owner access requires the dedicated Supabase configuration. There
              is no demo login or browser-only admin mode.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (stage === "login") {
                  if (!auth) throw Error("Supabase configuration is required.");
                  const r = await auth.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (r.error) throw Error(r.error.message);
                  setPassword("");
                  setStage("pin");
                } else {
                  await api({ action: "unlock", pin });
                  setPin("");
                  await load();
                }
              });
            }}
          >
            {stage === "login" ? (
              <>
                <label>
                  Owner email
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label>
                Private verification code
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  pattern="[0-9]{4,12}"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </label>
            )}
            <button className="button" disabled={busy || !auth}>
              {busy
                ? "Checking…"
                : stage === "login"
                  ? "Sign in"
                  : "Unlock workspace"}
            </button>
          </form>
          {stage === "pin" && (
            <button onClick={() => void logout()}>Sign out</button>
          )}
        </div>
      ) : (
        <>
          <div className="admin-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            <button onClick={() => void logout()}>Sign out everywhere</button>
          </div>
          {tab === "Overview" && (
            <>
              <div className="admin-summary">
                <div>
                  <b>{site.projects.filter((p) => p.published).length}</b>
                  Published projects
                </div>
                <div>
                  <b>
                    {
                      data.enquiries.filter((x: any) => x.status === "new")
                        .length
                    }
                  </b>
                  New enquiries in latest 500
                </div>
                <div>
                  <b>{data.media.length}</b>Media files (up to 100)
                </div>
              </div>
              <p className="status">
                Changes are drafts until you select Publish changes. Enquiry and
                media operations save immediately. No traffic or revenue figures
                are fabricated.
              </p>
            </>
          )}
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
                        published: false,
                        order: site.projects.length + 1,
                      },
                    ],
                  })
                }
              >
                Add draft project
              </button>
            </div>
          )}
          {tab === "Page content" && (
            <div className="admin-card">
              <h3>Business content & contact</h3>
              {field("headline", "Homepage headline (two lines)", true)}
              {field("intro", "Homepage introduction", true)}
              {field("about", "About the business", true)}
              {field("email", "Contact email")}
              {field("instagram", "Instagram URL")}
              <h3>Draft preview</h3>
              <p>{site.headline}</p>
              <p>{site.intro}</p>
            </div>
          )}
          {tab === "Services" && (
            <div className="admin-card">
              <h3>Services</h3>
              {site.services.map((s, i) => (
                <details key={i}>
                  <summary>{s.name}</summary>
                  <div>
                    {(["name", "description", "items"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <textarea
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
                  <option value="silver">Silver, White & Crimson</option>
                  <option value="gold">White & Gold</option>
                  <option value="dark">Red & Black</option>
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
                Enable spideyy
              </label>
              {field("knowledge", "Verified public business knowledge", true)}
              {site.faqs.map((f, i) => (
                <div key={i}>
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
                    faqs: [
                      ...site.faqs,
                      { q: "New question", a: "Verified answer" },
                    ],
                  })
                }
              >
                Add FAQ
              </button>
              <p>
                AI credentials are configured securely on the server, never in
                this editor.
              </p>
            </div>
          )}
          {tab === "SEO" && (
            <div className="admin-card">
              <h3>Search & sharing</h3>
              {field("seoTitle", "Website title")}
              {field("seoDescription", "Description", true)}
              <p>
                Browser titles update on reload. Rebuild the deployment after
                changing social-preview metadata.
              </p>
            </div>
          )}
          {tab === "Enquiries" && (
            <div className="admin-card">
              <h3>Client enquiries</h3>
              <input
                aria-label="Search enquiries"
                placeholder="Search name, email or status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => {
                  const rows = [
                    ["Name", "Email", "Service", "Status", "Description"],
                    ...data.enquiries.map((r: any) => [
                      r.data.name,
                      r.data.email,
                      r.data.service,
                      r.status,
                      r.data.description,
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
                  a.download = "enquiries.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Export latest enquiries
              </button>
              {data.enquiries
                .filter((r: any) =>
                  JSON.stringify(r)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((r: any) => (
                  <details key={r.id}>
                    <summary>
                      {r.data.name} / {r.data.service} / {r.status}
                    </summary>
                    <div>
                      <p>{r.data.email}</p>
                      <pre>{JSON.stringify(r.data, null, 2)}</pre>
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
                            setStatus("Enquiry updated.");
                          });
                        }}
                      >
                        <label>
                          Status
                          <select name="status" defaultValue={r.status}>
                            <option>new</option>
                            <option>in-progress</option>
                            <option>closed</option>
                          </select>
                        </label>
                        <label>
                          Private notes
                          <textarea
                            name="notes"
                            maxLength={5000}
                            defaultValue={r.notes}
                          />
                        </label>
                        <button disabled={busy}>Save enquiry</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Permanently delete this enquiry?"))
                              void run(async () => {
                                await api({
                                  action: "delete-enquiry",
                                  id: r.id,
                                });
                                await load();
                              });
                          }}
                        >
                          Delete enquiry
                        </button>
                      </form>
                    </div>
                  </details>
                ))}
              {!data.enquiries.length && <p>No enquiries yet.</p>}
            </div>
          )}
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
                      const data = await new Promise<string>(
                        (resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve(String(reader.result).split(",")[1]);
                          reader.onerror = reject;
                          reader.readAsDataURL(f);
                        },
                      );
                      const r = await api({ action: "upload", data });
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
          {tab === "Security" && (
            <div className="admin-card">
              <h3>Security & activity</h3>
              <p>
                Verified owner identity and a server-checked secondary code
                protect every management operation. Workspace unlock expires
                after 30 minutes. Signing out revokes all workspace unlocks.
              </p>
              {data.activity.map((a: any) => (
                <div className="admin-row" key={a.id}>
                  <span>{a.action}</span>
                  <small>{new Date(a.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
          {!["Overview", "Enquiries", "Media", "Security"].includes(tab) && (
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
