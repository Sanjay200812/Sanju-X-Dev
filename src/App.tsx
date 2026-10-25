import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  Menu,
  X,
  Monitor,
  Smartphone,
  Expand,
  Plus,
  Minus,
} from "lucide-react";
import { defaults, projects as seed } from "./content";
import Contact from "./Contact";
import Assistant from "./Assistant";
import { ChatProvider, useChat } from "./chat-context";
const Admin = lazy(() => import("./Admin"));
const Track = lazy(() => import("./Track"));
export type Site = typeof defaults;
export const Context = createContext(defaults);
export const useSite = () => useContext(Context);
export const Arrow = () => <ArrowUpRight size={19} aria-hidden="true" />;
export function CTA({
  text = "Start a conversation",
  to = "/contact",
  light = false,
}: {
  text?: string;
  to?: string;
  light?: boolean;
}) {
  return (
    <Link className={"button " + (light ? "secondary" : "")} to={to}>
      {text}
      <Arrow />
    </Link>
  );
}
function Brand() {
  return (
    <Link to="/" className="brand" aria-label="SANJU X DEV home">
      <img src="/media/official-logo.webp" alt="" />
      <span>
        SANJU <b>X</b> DEV<small>DESIGN & DIGITAL DEVELOPMENT</small>
      </span>
    </Link>
  );
}
function Affiliation() {
  return (
    <section className="affiliation">
      <span className="eyebrow">A separate professional affiliation</span>
      <div>
        <h2>
          Co-Founder <span>— CodeXa Agency</span>
        </h2>
        <p>
          Sanjay is a Co-Founder at CodeXa Agency. A distinct business
          association, alongside SANJU X DEV.
        </p>
      </div>
      <a href="https://codxa-agency.online/" target="_blank" rel="noreferrer">
        Explore CodeXa <Arrow />
      </a>
    </section>
  );
}
function Footer() {
  const s = useSite();
  return (
    <footer>
      <div className="footer-top">
        <span className="eyebrow">Good things start with a conversation</span>
        <Link to="/contact" className="footer-title">
          What’s next
          <br />
          for your business? <ArrowUpRight />
        </Link>
        <a href={"mailto:" + s.email}>{s.email}</a>
      </div>
      <div className="footer-bottom">
        <Brand />
        <span>Digital Experiences. Designed to Stand Out.</span>
        <div>
          <a href={s.instagram} target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
          <Link to="/track">Track Project</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <small>© {new Date().getFullYear()} SANJU X DEV</small>
      </div>
    </footer>
  );
}
export function Device({
  p,
  hero = false,
}: {
  p: (typeof seed)[number];
  hero?: boolean;
}) {
  const [mobile, setMobile] = useState(p.slug === "starx-connect");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div
      className={"device-stage " + (hero ? "hero-device" : "")}
      style={{ "--project": p.color } as React.CSSProperties}
    >
      <div className="device-controls">
        <span>{new URL(p.url).hostname}</span>
        <div>
          <button
            aria-label="Desktop preview"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            <Monitor size={16} />
          </button>
          <button
            aria-label="Mobile preview"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={16} />
          </button>
          <button
            aria-label="Expand screenshot"
            onClick={() => dialog.current?.showModal()}
          >
            <Expand size={16} />
          </button>
        </div>
      </div>
      <div className={"device " + (mobile ? "phone" : "desktop")}>
        <div className="device-bar">
          <i />
          <i />
          <i />
          <span>{p.short}</span>
        </div>
        <img
          src={mobile ? p.mobile : p.image}
          alt={
            p.short +
            " actual " +
            (mobile ? "mobile" : "desktop") +
            " website screenshot"
          }
          loading={hero ? "eager" : "lazy"}
        />
      </div>
      <span className="image-caption">
        ACTUAL INTERFACE / {mobile ? "MOBILE" : "DESKTOP"} VIEW
      </span>
      <dialog ref={dialog} className="lightbox">
        <button
          onClick={() => dialog.current?.close()}
          autoFocus
          aria-label="Close screenshot"
        >
          <X />
        </button>
        <img
          src={mobile ? p.mobile : p.image}
          alt={p.short + " expanded screenshot"}
        />
      </dialog>
    </div>
  );
}
function HomepageAiConsole({ questions }: { questions?: string[] }) {
  const { messages, busy, mode, ask, setFloatingOpen } = useChat();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultQuestions = [
    "What kind of website does my business need?",
    "Can you build an online store?",
    "How do I start a project?",
    "How can I check my project status?",
  ];
  const exampleList =
    questions && questions.length > 0 ? questions : defaultQuestions;

  const handleSubmit = (q: string) => {
    const target = q.trim();
    if (!target || busy) return;
    setQuery("");
    void ask(target);
  };

  // Filter to questions asked during this active session
  const conversationTurns = messages.filter(
    (m) => m.role === "user" || (m.role === "assistant" && m.timestamp),
  );
  const latestTurns =
    conversationTurns.length > 0 ? conversationTurns.slice(-4) : [];

  return (
    <div className="home-ai-card" aria-label="spideyy AI Assistant">
      <div className="home-ai-header">
        <div className="home-ai-badge">
          <img className="spider" src="/media/spideyy.svg" alt="" />
          <div>
            <b>spideyy AI</b>
            <span>Instant website guidance & project estimates</span>
          </div>
        </div>
        <span className="home-ai-status-pill">
          <span className="live-dot" />{" "}
          {mode === "AI assistant" ? "AI Online" : "spideyy Active"}
        </span>
      </div>

      <form
        className="home-ai-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(query);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="home-ai-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask spideyy about websites, services or your project idea..."
          aria-label="Ask spideyy a question"
          disabled={busy}
        />
        <button
          type="submit"
          className="home-ai-submit"
          disabled={busy || !query.trim()}
          aria-label="Send question to spideyy"
        >
          <ArrowUp size={20} />
        </button>
      </form>

      <div className="home-ai-chips-wrap">
        <span className="home-ai-chips-label">Try asking:</span>
        <div className="home-ai-chips">
          {exampleList.map((qText, idx) => (
            <button
              key={idx}
              type="button"
              className="home-ai-chip"
              disabled={busy}
              onClick={() => handleSubmit(qText)}
            >
              {qText}
            </button>
          ))}
        </div>
      </div>

      {/* Live Conversation Stream right inside homepage */}
      {(busy || latestTurns.length > 0) && (
        <div className="home-ai-stream" aria-live="polite">
          {latestTurns.map((turn, tIdx) => (
            <div key={tIdx} className={`home-ai-message ${turn.role}`}>
              <div className="home-ai-msg-role">
                {turn.role === "user" ? "You" : "spideyy"}
              </div>
              <div className="home-ai-msg-text">
                {turn.text.split("\n").map((line, li) => (
                  <span key={li}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
              {turn.links && turn.links.length > 0 && (
                <div className="home-ai-msg-links">
                  {turn.links.map((lnk, lIdx) =>
                    lnk.url.startsWith("http") ? (
                      <a
                        key={lIdx}
                        href={lnk.url}
                        target="_blank"
                        rel="noreferrer"
                        className="home-ai-link"
                      >
                        {lnk.label}
                      </a>
                    ) : (
                      <Link key={lIdx} to={lnk.url} className="home-ai-link">
                        {lnk.label} <Arrow />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="home-ai-message assistant thinking">
              <span className="live-dot" /> spideyy is thinking…
            </div>
          )}
          <div className="home-ai-footer-actions">
            <button
              type="button"
              className="home-ai-popout-btn"
              onClick={() => setFloatingOpen(true)}
            >
              Continue in floating assistant ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Home() {
  const s = useSite();
  const p = s.projects
    .filter((p) => p.published)
    .sort((a, b) => a.order - b.order);
  return (
    <>
      <section className="hero wrap hero-centered-layout">
        <div className="hero-meta hero-centered-meta">
          <span className="eyebrow">
            SANJU X DEV · DESIGN & DIGITAL DEVELOPMENT
          </span>
          <span className="availability">
            <i /> Let’s build your next chapter
          </span>
        </div>
        <div className="hero-centered-content">
          <h1 className="hero-centered-title">
            {s.headline.split("\n").map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </h1>
          <p className="hero-centered-intro">{s.intro}</p>
          <div className="hero-centered-actions">
            <CTA text="Explore Our Work" to="/work" />
            <Link to="/contact" className="button secondary">
              Start a Project <ArrowRight size={18} />
            </Link>
          </div>
          <HomepageAiConsole questions={(s as any).homepageQuestions} />
        </div>
        {p[0] && (
          <div className="hero-featured-showcase">
            <div className="paper-label">Selected work · No. 01</div>
            <div className="pinned-project">
              <Device p={p[0]} hero />
              <Link to={"/work/" + p[0].slug} className="paper-caption">
                <span>
                  {p[0].short}
                  <small>View case study ↗</small>
                </span>
                <Arrow />
              </Link>
            </div>
            <div className="studio-note">
              <span className="eyebrow">The studio approach</span>
              <p>
                Good ideas.
                <br />
                <em>Carefully made.</em>
              </p>
              <span>Strategy / Design / Development</span>
            </div>
            <span className="editorial-stamp" aria-hidden="true">
              DESIGN WITH
              <br />
              PURPOSE
              <br />✦
            </span>
          </div>
        )}
        <div className="hero-bottom">
          <span>STRATEGY / DESIGN / DEVELOPMENT</span>
          <span>SCROLL TO EXPLORE ↓</span>
        </div>
      </section>
      <section className="intro-line wrap">
        <span className="eyebrow">Designed with intention</span>
        <h2>
          Your website should do more
          <br />
          than <em>look the part.</em>
        </h2>
        <p>
          It should make your business easier to understand, easier to trust and
          easier to choose. That’s where we begin.
        </p>
      </section>
      <section className="work-section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">
              The work / Real interfaces, distinct challenges
            </span>
            <h2>
              Different ideas.
              <br />
              <em>Considered outcomes.</em>
            </h2>
          </div>
          <CTA text="View all projects" to="/work" light />
        </div>
        <div className="work-grid">
          {p.slice(1).map((p, i) => (
            <ProjectCard key={p.slug} p={p} index={i + 2} />
          ))}
        </div>
      </section>
      <section className="services-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">What we do</span>
              <h2>
                From the first idea
                <br />
                to the final detail.
              </h2>
            </div>
            <p>
              A connected set of services.
              <br />
              Built around what your business needs.
            </p>
          </div>
          <ServiceList />
        </div>
      </section>
      <section className="wrap process">
        <span className="eyebrow">A clear way forward</span>
        <h2>
          Good work starts
          <br />
          with good questions.
        </h2>
        <div className="process-grid">
          {[
            [
              "01",
              "Understand",
              "Your business, your audience, and the job your website needs to do.",
            ],
            [
              "02",
              "Shape",
              "A clear structure, a distinct visual direction, and a purposeful user journey.",
            ],
            [
              "03",
              "Build",
              "Responsive development, useful integrations, and attention to the details.",
            ],
            [
              "04",
              "Refine",
              "Review together, test the experience, and prepare for a considered launch.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="wrap">
        <Affiliation />
      </div>
    </>
  );
}
function ProjectCard({
  p,
  index,
}: {
  p: (typeof seed)[number];
  index: number;
}) {
  return (
    <article className={"project-card project-" + p.slug}>
      <Link
        to={"/work/" + p.slug}
        className="project-image"
        style={{ "--project": p.color } as React.CSSProperties}
      >
        <img
          src={p.slug === "starx-connect" ? p.mobile : p.image}
          alt={p.short + " live website interface"}
          loading="lazy"
        />
        <span className="project-open">
          <Arrow />
        </span>
      </Link>
      <div className="project-meta">
        <span className="eyebrow">
          {String(index).padStart(2, "0")} / {p.category}
        </span>
        <h3>
          <Link to={"/work/" + p.slug}>{p.short}</Link>
        </h3>
        <p>{p.summary}</p>
      </div>
    </article>
  );
}
function Work() {
  const s = useSite();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("All");
  const all = s.projects
    .filter((p) => p.published)
    .sort((a, b) => a.order - b.order);
  const shown = all.filter(
    (p) =>
      (filter === "All" || p.kind === filter) &&
      (p.name + " " + p.category).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <section className="wrap page">
      <span className="eyebrow">Selected work</span>
      <h1>
        Proof in
        <br />
        <em>the experience.</em>
      </h1>
      <p className="lede">
        Five real projects. Different audiences, different challenges.
        <br />
        Explore the interfaces and the thinking behind them.
      </p>
      <div className="filters">
        <div>
          {["All", "Websites", "Applications", "Digital experiences"].map(
            (f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ),
          )}
        </div>
        <input
          aria-label="Search projects"
          placeholder="Find a project…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="work-grid">
        {shown.map((p) => (
          <ProjectCard key={p.slug} p={p} index={all.indexOf(p) + 1} />
        ))}
      </div>
      {!shown.length && (
        <p className="empty">
          No matching projects. Try a different search or category.
        </p>
      )}
    </section>
  );
}
function CaseStudy() {
  const { slug } = useParams();
  const s = useSite();
  const p = s.projects.find((p) => p.slug === slug && p.published);
  if (!p) return <NotFound />;
  return (
    <article className="page wrap case">
      <Link className="text-link" to="/work">
        ← All work
      </Link>
      <div className="case-heading">
        <span className="eyebrow">{p.category}</span>
        <h1>{p.name}</h1>
        <p className="lede">{p.headline}</p>
        <a className="button" href={p.url} target="_blank" rel="noreferrer">
          Visit Live Site <Arrow />
        </a>
      </div>
      <Device p={p} />
      <section className="case-story">
        <div>
          <span className="eyebrow">Experience overview</span>
          <h2>{p.headline}</h2>
        </div>
        <div>
          <p>{p.story}</p>
          <h3>Inside the interface</h3>
          {p.features.map((f, i) => (
            <div className="feature-line" key={f}>
              <span>0{i + 1}</span>
              {f}
            </div>
          ))}
          <p className="verification-note">{p.note}</p>
          <p className="verification-note">
            Hosting: Vercel. Other technologies and sole authorship are not
            asserted without source verification.
          </p>
        </div>
      </section>
      <CTA
        text="Discuss a similar project"
        to={"/contact?service=" + encodeURIComponent(p.category)}
      />
    </article>
  );
}
function ServiceList() {
  const s = useSite();
  const [open, setOpen] = useState(0);
  return (
    <div className="service-list">
      {s.services.map((x, i) => (
        <div
          className={"service-row " + (open === i ? "open" : "")}
          key={x.name}
        >
          <button
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>0{i + 1}</span>
            <h3>{x.name}</h3>
            {open === i ? <Minus /> : <Plus />}
          </button>
          {open === i && (
            <div className="service-detail">
              <p>{x.description}</p>
              <span>{x.items}</span>
              <Link to={"/contact?service=" + encodeURIComponent(x.name)}>
                Enquire about this service <Arrow />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function Services() {
  return (
    <section className="page wrap">
      <span className="eyebrow">Capabilities</span>
      <h1>
        Made for your
        <br />
        <em>next move.</em>
      </h1>
      <p className="lede">
        A new website. A useful application. A more considered experience.
        <br />
        We help turn the right idea into something people can use.
      </p>
      <ServiceList />
      <div className="callout">
        <h2>Not sure where to start?</h2>
        <p>Bring the problem. We’ll help define the brief.</p>
        <CTA />
      </div>
    </section>
  );
}
function About() {
  const s = useSite();
  return (
    <section className="page wrap">
      <span className="eyebrow">About the business</span>
      <h1>
        Small details.
        <br />
        <em>A bigger picture.</em>
      </h1>
      <div className="about-grid">
        <div className="logo-object">
          <img
            src="/media/official-logo.webp"
            alt="SANJU X DEV official silver and crimson logo"
          />
        </div>
        <div>
          <h2>
            Design and development,
            <br />
            working together.
          </h2>
          <p className="lede">{s.about}</p>
          <p>
            Our starting point is always the business: what you offer, who you
            serve, and how a better digital experience can help. We value clear
            communication, practical choices and carefully finished work.
          </p>
          <CTA text="Explore our services" to="/services" />
        </div>
      </div>
      <Affiliation />
    </section>
  );
}
function Privacy() {
  return (
    <section className="page wrap prose">
      <span className="eyebrow">Your information</span>
      <h1>Privacy, clearly.</h1>
      <p>
        When you submit a project enquiry, SANJU X DEV uses your contact details
        and project requirements to respond and discuss the requested work.
        Please do not submit passwords, payment details or confidential
        documents.
      </p>
      <h2>Storage and service providers</h2>
      <p>
        Submitted enquiries are stored in a private Supabase database when
        configured. Vercel hosts the website. If AI mode is enabled, your
        assistant question is sent to the configured AI provider; FAQ mode does
        not require a model provider. The assistant identifies its mode.
      </p>
      <h2>Your choices</h2>
      <p>
        Theme preference is stored on your device. Intro playback uses session
        storage. Owner authentication uses authentication storage and a secure
        session cookie. We do not use advertising cookies or sell enquiry
        details.
      </p>
      <h2>Contact and deletion</h2>
      <p>
        Ask about your enquiry or request deletion at{" "}
        <a href="mailto:sanjuxdev27@gmail.com">sanjuxdev27@gmail.com</a>.
        Information is retained only as needed for the enquiry and any
        subsequent business relationship.
      </p>
    </section>
  );
}
function NotFound() {
  return (
    <section className="page wrap">
      <span className="eyebrow">404 / A little off course</span>
      <h1>
        Let’s get you
        <br />
        <em>back to the good stuff.</em>
      </h1>
      <CTA to="/" text="Back to home" />
    </section>
  );
}
export default function App() {
  const [site, setSite] = useState(defaults),
    [theme, setTheme] = useState(
      () => localStorage.getItem("sxd-theme") || "silver",
    ),
    [menu, setMenu] = useState(false),
    [intro, setIntro] = useState(
      () =>
        location.pathname === "/" &&
        !sessionStorage.getItem("sxd-intro") &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const loc = useLocation();
  const finish = () => {
    setIntro(false);
    sessionStorage.setItem("sxd-intro", "1");
  };
  useEffect(() => {
    fetch("/api/site")
      .then((r) => r.json())
      .then((d) => {
        if (d.site) {
          setSite(d.site);
          if (!localStorage.getItem("sxd-theme")) setTheme(d.site.defaultTheme);
          if (!d.site.introEnabled) setIntro(false);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = [
      "silver",
      "gold",
      "dark",
    ].includes(theme)
      ? theme
      : "silver";
  }, [theme]);
  useEffect(() => {
    if (!intro) return;
    const id = setTimeout(finish, 3600);
    return () => clearTimeout(id);
  }, [intro]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
    const p = site.projects.find((p) => loc.pathname === "/work/" + p.slug);
    document.title =
      (loc.pathname === "/"
        ? ""
        : (p
            ? p.name
            : ((
                {
                  "/": "",
                  "/work": "Our Work",
                  "/about": "About the Business",
                  "/services": "Services",
                  "/contact": "Start a Project",
                  "/privacy": "Privacy",
                  "/spideyy": "spideyy — Private Access",
                  "/admin": "spideyy — Private Access",
                } as Record<string, string>
              )[loc.pathname] ?? "Page not found")) + " — ") + site.seoTitle;
  }, [loc.pathname, site]);
  return (
    <Context.Provider value={site}>
      <ChatProvider>
        <a className="skip" href="#main">
          Skip to content
        </a>
      {intro && (
        <div
          className="intro"
          role="dialog"
          aria-label="SANJU X DEV introduction"
          aria-modal="true"
        >
          <div className="intro-mark">
            <img
              src="/media/official-logo.webp"
              alt="SANJU X DEV official logo"
            />
            <h2>SANJU X DEV</h2>
            <p>Digital Experiences. Designed to Stand Out.</p>
          </div>
          <button autoFocus onClick={finish}>
            Skip introduction <Arrow />
          </button>
        </div>
      )}
      <div {...((intro ? { inert: "" } : {}) as any)}>
        <header>
          <div className="nav-wrap">
            <Brand />
            <button
              className="menu-toggle"
              aria-expanded={menu}
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <nav className={menu ? "expanded" : ""}>
              {[
                ["/work", "Our work"],
                ["/services", "Services"],
                ["/about", "The business"],
              ].map(([to, t]) => (
                <NavLink key={to} to={to}>
                  {t}
                </NavLink>
              ))}
              <Link to="/contact" className="nav-cta">
                Let’s talk <Arrow />
              </Link>
            </nav>
            <select
              aria-label="Website theme"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                localStorage.setItem("sxd-theme", e.target.value);
              }}
            >
              <option value="silver">Paper / Crimson</option>
              <option value="gold">White / Gold</option>
              <option value="dark">Red / Black</option>
            </select>
          </div>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/work" element={<Work />} />
            <Route path="/work/:slug" element={<CaseStudy />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/track"
              element={
                <Suspense
                  fallback={
                    <p className="wrap page">Loading project tracking…</p>
                  }
                >
                  <Track />
                </Suspense>
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/spideyy"
              element={
                <Suspense
                  fallback={
                    <p className="wrap page">Loading owner workspace…</p>
                  }
                >
                  <Admin />
                </Suspense>
              }
            />
            <Route path="/admin" element={<Navigate to="/spideyy" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        {site.assistantEnabled &&
          !loc.pathname.startsWith("/spideyy") &&
          !loc.pathname.startsWith("/admin") && <Assistant />}
      </div>
      </ChatProvider>
    </Context.Provider>
  );
}
