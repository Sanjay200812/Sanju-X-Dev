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
import {
  CompassStar,
  PostmarkStamp,
  BotanicalSprig,
  WashiTape,
  TornMemoScrap,
  StudioEngraving,
  InstagramIcon,
  FacebookIcon,
  MailIcon,
} from "./Decorations";

const Admin = lazy(() => import("./Admin"));
const Track = lazy(() => import("./Track"));

export type Site = typeof defaults;
export const Context = createContext(defaults);
export const useSite = () => useContext(Context);

export const Arrow = () => <ArrowUpRight size={18} aria-hidden="true" />;

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
      <CompassStar size={26} className="brand-compass-star" />
      <span className="brand-copy">
        <span className="brand-title">SANJU X DEV</span>
        <span className="brand-sub">IDEAS · CODE · DESIGN · PEOPLE</span>
      </span>
    </Link>
  );
}

function Affiliation() {
  return (
    <section className="affiliation-scrapbook">
      <div className="washi-tape-strip top-center" aria-hidden="true" />
      <span className="eyebrow">A separate professional affiliation</span>
      <div className="affiliation-content">
        <h2>
          Co-Founder <span>— CodeXa Agency</span>
        </h2>
        <p>
          Sanjay is a Co-Founder at CodeXa Agency. A distinct business
          association, alongside SANJU X DEV.
        </p>
      </div>
      <a
        href="https://codxa-agency.online/"
        target="_blank"
        rel="noreferrer"
        className="affiliation-link"
      >
        Explore CodeXa <Arrow />
      </a>
    </section>
  );
}

function Footer() {
  const s = useSite();
  const facebookUrl =
    (s as any).facebook || "https://www.facebook.com/sanju.x.dev";
  const instagramUrl =
    s.instagram || "https://www.instagram.com/sanju_x_dev/";

  return (
    <footer className="scrapbook-footer">
      <div className="footer-top">
        <span className="eyebrow">Good things start with a conversation</span>
        <Link to="/contact" className="footer-title">
          What’s next
          <br />
          for your business? <ArrowUpRight />
        </Link>
        <div className="footer-contact-actions">
          <a
            href={"mailto:" + s.email}
            className="footer-contact-badge"
            aria-label="Direct email"
          >
            <MailIcon size={16} />
            <span>{s.email}</span>
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="footer-contact-badge"
            aria-label="Instagram profile"
          >
            <InstagramIcon size={16} />
            <span>@sanju_x_dev</span>
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="footer-contact-badge"
            aria-label="Facebook page"
          >
            <FacebookIcon size={16} />
            <span>sanju_x_dev</span>
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <Brand />
        <span className="footer-tagline">
          Thoughtful Design. Powerful Digital Experiences.
        </span>
        <div className="footer-nav-links">
          <Link to="/">Home</Link>
          <Link to="/work">Our Work</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/track">Track Project</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <small>© {new Date().getFullYear()} SANJU X DEV. All rights reserved.</small>
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

  const conversationTurns = messages.filter(
    (m) => m.role === "user" || (m.role === "assistant" && m.timestamp),
  );
  const latestTurns =
    conversationTurns.length > 0 ? conversationTurns.slice(-4) : [];

  return (
    <div className="home-ai-scrapbook-card" aria-label="Spideyy Assistant">
      <div className="home-ai-card-header">
        <div className="home-ai-badge">
          <img className="spider" src="/media/spideyy.svg" alt="" />
          <div>
            <b>Spideyy</b>
            <span>Instant website guidance & project estimates</span>
          </div>
        </div>
        <span className="home-ai-status-pill">
          <span className="live-dot" />{" "}
          {mode === "AI assistant" ? "AI Online" : "Spideyy Active"}
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
          placeholder="Ask Spideyy about websites, features, or your project idea..."
          aria-label="Ask spideyy a question"
          disabled={busy}
        />
        <button
          type="submit"
          className="home-ai-submit"
          disabled={busy || !query.trim()}
          aria-label="Send question to spideyy"
        >
          <ArrowUp size={18} />
        </button>
      </form>

      <div className="home-ai-chips-wrap">
        <span className="home-ai-chips-label">Quick questions:</span>
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

      {(busy || latestTurns.length > 0) && (
        <div className="home-ai-stream" aria-live="polite">
          {latestTurns.map((turn, tIdx) => (
            <div key={tIdx} className={"home-ai-message " + turn.role}>
              <div className="home-ai-msg-role">
                {turn.role === "user" ? "You" : "Spideyy"}
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
                      <Link
                        key={lIdx}
                        to={lnk.url}
                        className={
                          "home-ai-link " +
                          (lnk.label.includes("Start") ? "action-primary" : "")
                        }
                      >
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
              <span className="live-dot" /> Spideyy is thinking…
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

  const [heroMobile, setHeroMobile] = useState(false);
  const heroProject = p[0] || seed[0];

  const featuredCards = [
    p.find((x) => x.slug === "ticketx") || p[1] || seed[1],
    p.find((x) => x.slug === "starx-connect") || p[2] || seed[2],
    p.find((x) => x.slug === "audiox") || p[3] || seed[3],
  ];

  return (
    <div className="scrapbook-page-canvas">
      {/* HERO SECTION — ASYMMETRIC EDITORIAL COLLAGE MATCHING IMAGE 2 */}
      <section className="scrapbook-hero wrap">
        {/* Left Margin Pressed Botanical & Map Accent */}
        <div className="hero-left-botanical-scrap" aria-hidden="true">
          <div className="map-paper-texture" />
          <BotanicalSprig className="left-sprig" />
        </div>

        {/* HERO LEFT COLUMN */}
        <div className="hero-left-column">
          <div className="hero-top-kicker">
            <span className="hero-est">EST. 2024</span>
          </div>

          <div className="hero-title-wrap">
            <h1 className="hero-editorial-headline">
              <span>Design.</span>
              <span>Develop.</span>
              <span>Create.</span>
            </h1>
            <div className="hero-cursive-note" aria-hidden="true">
              Good Design
              <br />
              Brighter Days
            </div>
          </div>

          <p className="hero-intro-paragraph">
            SANJU X DEV creates thoughtfully designed websites, intuitive
            applications and digital experiences that help ideas and businesses
            stand out.
          </p>

          <div className="hero-cta-group">
            <Link to="/work" className="btn-scrapbook-primary">
              Explore Our Work <ArrowRight size={17} />
            </Link>
            <div className="hero-sub-cta">
              <Link to="/contact" className="btn-scrapbook-secondary">
                Start Your Project
              </Link>
              <span className="hero-subtext-stamp">
                THOUGHTFUL DESIGN · REAL IMPACT
              </span>
            </div>
          </div>

          {/* Naturally Integrated Compact Spideyy Input */}
          <div className="hero-spideyy-embed">
            <HomepageAiConsole questions={(s as any).homepageQuestions} />
          </div>
        </div>

        {/* HERO RIGHT COLUMN — SCRAPBOOK COLLAGE MATCHING IMAGE 2 */}
        <div className="hero-right-collage" aria-label="Creative studio collage">
          {/* Postmark stamp top-right with handwritten annotation */}
          <div className="collage-stamp-group">
            <PostmarkStamp className="hero-postmark" />
            <span className="hero-stamp-note">Same Person Different Ideas ...</span>
          </div>

          {/* Central Polaroid Photo Frame showcasing real StarX Live website */}
          <div className="polaroid-frame-wrap">
            <WashiTape className="tape-top-center" />
            <div className="polaroid-frame">
              <div className="polaroid-browser-header">
                <div className="polaroid-browser-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="polaroid-browser-url">
                  {heroProject.short} · {heroMobile ? "Mobile" : "Desktop"}
                </span>
                <div className="polaroid-view-toggle">
                  <button
                    type="button"
                    className={!heroMobile ? "active" : ""}
                    onClick={() => setHeroMobile(false)}
                    aria-label="View desktop screenshot"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    className={heroMobile ? "active" : ""}
                    onClick={() => setHeroMobile(true)}
                    aria-label="View mobile screenshot"
                  >
                    <Smartphone size={13} />
                  </button>
                </div>
              </div>

              <div className="polaroid-photo-canvas">
                <img
                  src={heroMobile ? heroProject.mobile : heroProject.image}
                  alt={heroProject.name + " real website showcase"}
                  className="polaroid-img"
                  loading="eager"
                />
              </div>

              <div className="polaroid-caption">
                <span className="polaroid-handwriting">
                  Still building a kinder internet. ☺
                </span>
                <Link
                  to={"/work/" + heroProject.slug}
                  className="polaroid-case-link"
                  title="View full case study"
                >
                  View Case Study <Arrow />
                </Link>
              </div>
            </div>
            <WashiTape className="tape-bottom-left" />
          </div>

          {/* Botanical Wildflower Sprig pressed beside the Polaroid */}
          <div className="collage-botanical-wrap" aria-hidden="true">
            <BotanicalSprig className="collage-botanical-sprig" />
          </div>

          {/* Pinned Torn Memo Scrap on far right */}
          <div className="collage-memo-wrap">
            <TornMemoScrap className="collage-memo" />
          </div>

          {/* Web Development / Digital Craft Paper Elements */}
          <div className="collage-dev-tag" aria-hidden="true">
            <code>&lt;design /&gt;</code>
            <span>// crafted with intention</span>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION — 2 COLUMNS MATCHING IMAGE 2 EXACTLY */}
      <section className="scrapbook-bottom-section wrap">
        {/* LEFT COLUMN: FEATURED PROJECTS (3 HORIZONTAL SCRAPBOOK PHOTO CARDS) */}
        <div className="bottom-featured-column">
          <div className="bottom-section-header">
            <span className="bottom-header-title">FEATURED PROJECTS</span>
            <Link to="/work" className="bottom-header-link">
              VIEW ALL →
            </Link>
          </div>

          <div className="featured-cards-row">
            {featuredCards.map((card, idx) => (
              <article key={card.slug} className="scrapbook-photo-card">
                <Link
                  to={"/work/" + card.slug}
                  className="photo-card-media"
                  style={{ "--project-tint": card.color } as React.CSSProperties}
                >
                  <img
                    src={card.slug === "starx-connect" ? card.mobile : card.image}
                    alt={card.short + " website preview"}
                    loading="lazy"
                  />
                  <span className="photo-card-arrow">
                    <ArrowRight size={14} />
                  </span>
                </Link>
                <div className="photo-card-details">
                  <h3 className="photo-card-title">
                    <Link to={"/work/" + card.slug}>{card.short}</Link>
                  </h3>
                  <p className="photo-card-desc">
                    {idx === 0
                      ? "A modern cinema & event ticketing platform."
                      : idx === 1
                      ? "Digital business card & smart links hub."
                      : "Creative audio & music streaming experience."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ABOUT ME (MATCHING IMAGE 2) */}
        <div className="bottom-about-column">
          <div className="bottom-section-header">
            <span className="bottom-header-title">ABOUT ME</span>
            <span className="bottom-cursive-signature" aria-hidden="true">
              Curious mind Always building - Sanju
            </span>
          </div>

          <div className="about-scrapbook-card">
            <div className="about-engraving-container">
              <StudioEngraving className="about-studio-engraving" />
            </div>

            <div className="about-editorial-text">
              <h2 className="about-credo-headline">
                I believe in slow ideas, clean design and a kinder internet.
              </h2>
              <p className="about-credo-bio">
                I’m a designer & developer passionate about creating digital
                spaces that feel human. I love mixing design, code and
                storytelling to build things that matter.
              </p>

              {/* 4 Micro-Badges with Illustrated Icons */}
              <div className="about-micro-badges">
                <div className="about-micro-badge">
                  <span className="badge-icon">☕</span>
                  <span className="badge-text">
                    <b>Coffee</b>
                    <small>Fuel</small>
                  </span>
                </div>
                <div className="about-micro-badge">
                  <span className="badge-icon">💻</span>
                  <span className="badge-text">
                    <b>Design</b>
                    <small>Expression</small>
                  </span>
                </div>
                <div className="about-micro-badge">
                  <span className="badge-icon">🌿</span>
                  <span className="badge-text">
                    <b>Code</b>
                    <small>Freedom</small>
                  </span>
                </div>
                <div className="about-micro-badge">
                  <span className="badge-icon">⛰️</span>
                  <span className="badge-text">
                    <b>Explore</b>
                    <small>Balance</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEPARATE PROFESSIONAL AFFILIATION */}
      <div className="wrap affiliation-wrap">
        <Affiliation />
      </div>
    </div>
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
        <h3>{p.name}</h3>
        <p>{p.summary}</p>
        <Link to={"/work/" + p.slug} className="text-link">
          Explore case study <Arrow />
        </Link>
      </div>
    </article>
  );
}

function Work() {
  const s = useSite();
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const all = s.projects
    .filter((p) => p.published)
    .sort((a, b) => a.order - b.order);

  const shown = all.filter((p) => {
    const matchF = filter === "All" || p.kind === filter;
    const matchQ =
      !q.trim() ||
      (p.name + p.summary + p.story)
        .toLowerCase()
        .includes(q.toLowerCase().trim());
    return matchF && matchQ;
  });

  return (
    <section className="page wrap">
      <span className="eyebrow">Our Work</span>
      <h1>Selected Projects</h1>
      <p className="lede">
        Five verified public projects built for entertainment, discovery and
        direct business action. Explore the interfaces and the thinking behind
        them.
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
            alt="SANJU X DEV official logo"
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
        Owner authentication uses authentication storage and a secure
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
  const [site, setSite] = useState(defaults);
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(
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
          if (!d.site.introEnabled) setIntro(false);
        }
      })
      .catch(() => {});
  }, []);

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
                  "/about": "About",
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
          <header className="scrapbook-header">
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
                  ["/", "Home"],
                  ["/work", "Our Work"],
                  ["/services", "Services"],
                  ["/about", "About"],
                  ["/contact", "Contact"],
                ].map(([to, t]) => (
                  <NavLink key={to} to={to} end={to === "/"}>
                    {t}
                  </NavLink>
                ))}
                <Link to="/contact" className="nav-cta-btn">
                  Start Your Project <ArrowRight size={15} />
                </Link>
              </nav>
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
              <Route
                path="/admin"
                element={<Navigate to="/spideyy" replace />}
              />
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
