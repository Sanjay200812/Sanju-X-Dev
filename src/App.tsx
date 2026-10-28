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
  ArrowDown,
  Menu,
  X,
  Monitor,
  Smartphone,
  Expand,
  Plus,
  Minus,
} from "lucide-react";
import { defaults, projects as seed } from "./content";
import Contact, { EnquiryBuilder } from "./Contact";
import Assistant from "./Assistant";
import { ChatProvider, useChat } from "./chat-context";
import {
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
      <img
        src="/assets/official-logo.webp"
        alt="SANJU X DEV official logo"
        className="brand-logo-img"
      />
      <span className="brand-copy">
        <span className="brand-title">SANJU X DEV</span>
        <span className="brand-sub">Thoughtful Design · Powerful Digital Experiences</span>
      </span>
    </Link>
  );
}

function Affiliation() {
  return (
    <section className="affiliation-section wrap" aria-label="Professional Affiliation">
      <div className="affiliation-card">
        <div className="washi-tape-strip top-center" aria-hidden="true" />
        <span className="eyebrow">Professional Affiliation</span>
        <h2 className="affiliation-title">
          Co-Founder at CodeXa Agency
        </h2>
        <p className="affiliation-desc">
          Sanjay is a Co-Founder at CodeXa Agency — a distinct business association delivering full-scale digital agency solutions, alongside SANJU X DEV.
        </p>
        <a
          href="https://codxa-agency.online/"
          target="_blank"
          rel="noreferrer"
          className="button secondary affiliation-btn"
        >
          Visit CodeXa <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}

function ContactSection() {
  const s = useSite();
  const facebookUrl =
    (s as any).facebook || "https://www.facebook.com/sanju.x.dev";
  const instagramUrl =
    s.instagram || "https://www.instagram.com/sanju_x_dev/";
  const whatsappUrl = (s as any).whatsapp;

  return (
    <section id="contact" className="final-contact-section wrap" aria-label="Contact Information">
      <div className="final-contact-card">
        <div className="washi-tape-strip top-center" aria-hidden="true" />
        <span className="eyebrow">Get In Touch</span>
        <h2 className="final-contact-title">Let&apos;s Connect</h2>
        <p className="final-contact-sub">
          Have a question, an idea, or want to discuss a custom digital project? Reach out directly.
        </p>

        <div className="final-contact-grid">
          <a
            href={"mailto:" + s.email}
            className="final-contact-item"
            aria-label="Direct email to SANJU X DEV"
          >
            <div className="contact-item-icon">
              <MailIcon size={22} />
            </div>
            <div className="contact-item-info">
              <span className="contact-item-label">Email</span>
              <span className="contact-item-value">{s.email}</span>
            </div>
          </a>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="final-contact-item"
            aria-label="Instagram profile"
          >
            <div className="contact-item-icon">
              <InstagramIcon size={22} />
            </div>
            <div className="contact-item-info">
              <span className="contact-item-label">Instagram</span>
              <span className="contact-item-value">@sanju_x_dev</span>
            </div>
          </a>

          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="final-contact-item"
            aria-label="Facebook profile"
          >
            <div className="contact-item-icon">
              <FacebookIcon size={22} />
            </div>
            <div className="contact-item-info">
              <span className="contact-item-label">Facebook</span>
              <span className="contact-item-value">sanju_x_dev</span>
            </div>
          </a>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="final-contact-item"
              aria-label="WhatsApp contact"
            >
              <div className="contact-item-icon">
                <span style={{ fontSize: 20 }}>💬</span>
              </div>
              <div className="contact-item-info">
                <span className="contact-item-label">WhatsApp</span>
                <span className="contact-item-value">Message on WhatsApp</span>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="compact-footer">
      <div className="compact-footer-inner wrap">
        <div className="compact-footer-brand">
          <Brand />
          <span className="footer-tagline">
            Thoughtful Design. Powerful Digital Experiences.
          </span>
        </div>
        <div className="compact-footer-nav">
          <Link to="/">Home</Link>
          <Link to="/work">Projects</Link>
          <Link to="/contact">Start a Project</Link>
          <Link to="/track">Track Project</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <small className="footer-copy">
          © {new Date().getFullYear()} SANJU X DEV. All rights reserved.
        </small>
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
        <span className="device-hostname">{new URL(p.url).hostname}</span>
        <div className="device-view-tabs">
          <button
            type="button"
            className={"device-tab-btn " + (!mobile ? "active" : "")}
            aria-label="Desktop preview"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={"device-tab-btn " + (mobile ? "active" : "")}
            aria-label="Mobile preview"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            className="device-tab-btn"
            aria-label="Expand screenshot"
            onClick={() => dialog.current?.showModal()}
          >
            <Expand size={14} />
            <span>Fullscreen</span>
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

function HomepageAiConsole() {
  const { messages, busy, mode, ask, setFloatingOpen } = useChat();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Exactly 3 clean suggestions
  const defaultQuestions = [
    "What website is right for me?",
    "Can you build an online store?",
    "How do I start my project?",
  ];

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
          <img className="spider-official" src="/assets/spideyy.jpg" alt="Spideyy" />
          <div>
            <b>Spideyy</b>
            <span>Instant website guidance & project estimates</span>
          </div>
        </div>
        <span className="home-ai-status-pill">
          <span className="live-dot" />{" "}
          {mode === "AI Online" ? "AI Online" : "Spideyy Active"}
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
          aria-label="Ask Spideyy a question"
          disabled={busy}
        />
        <button
          type="submit"
          className="home-ai-submit"
          disabled={busy || !query.trim()}
          aria-label="Send question to Spideyy"
        >
          <ArrowUp size={18} />
        </button>
      </form>

      <div className="home-ai-chips-wrap">
        <span className="home-ai-chips-label">Quick questions:</span>
        <div className="home-ai-chips">
          {defaultQuestions.map((qText, idx) => (
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

  // Exactly three featured projects: TicketX, StarX Connect, AudioX
  const featuredCards = [
    p.find((x) => x.slug === "ticketx") || seed[1],
    p.find((x) => x.slug === "starx-connect") || seed[2],
    p.find((x) => x.slug === "audiox") || seed[3],
  ];

  return (
    <div className="homepage-five-sections">
      {/* ==============================================================
          SECTION 1 — LANDING / HERO
          Only: SANJU X DEV + Spideyy AI Console + Start Your Project
          ============================================================== */}
      <section className="hero-landing-section wrap" aria-label="SANJU X DEV Landing">
        <div className="hero-landing-container">
          <div className="hero-main-header">
            <h1 className="hero-studio-name">SANJU X DEV</h1>
          </div>

          {/* Working Spideyy AI Console */}
          <div className="hero-spideyy-wrap">
            <HomepageAiConsole />
          </div>

          {/* Clear Start Your Project Button */}
          <div className="hero-start-project-wrap">
            <a href="#choose-website" className="button hero-start-project-btn">
              Start Your Project <ArrowDown size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 2 — THREE FEATURED PROJECTS (Varun Portfolio Presentation)
          TicketX, StarX Connect, AudioX
          ============================================================== */}
      <section id="featured-projects" className="featured-projects-section wrap" aria-label="Featured Projects">
        <div className="featured-section-header">
          <div>
            <span className="eyebrow">Featured Work</span>
            <h2 className="featured-section-title">Selected Projects</h2>
          </div>
          <Link to="/work" className="featured-all-link">
            Explore All Projects →
          </Link>
        </div>

        <div className="featured-projects-grid">
          {featuredCards.map((card) => (
            <article key={card.slug} className="varun-project-card">
              <div className="project-card-tape" aria-hidden="true" />

              {/* Large, uncropped screenshot preview */}
              <Link
                to={"/work/" + card.slug}
                className="varun-project-preview"
                style={{ "--project-color": card.color } as React.CSSProperties}
              >
                <div className="preview-browser-bar">
                  <div className="preview-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="preview-hostname">{new URL(card.url).hostname}</span>
                </div>
                <div className="preview-image-canvas">
                  <img
                    src={card.slug === "starx-connect" ? card.mobile : card.image}
                    alt={card.name + " real website showcase"}
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Clean project information */}
              <div className="varun-project-meta">
                <span className="varun-project-category">{card.category}</span>
                <h3 className="varun-project-title">
                  <Link to={"/work/" + card.slug}>{card.short}</Link>
                </h3>
                <p className="varun-project-desc">{card.summary}</p>
                <div className="varun-project-actions">
                  <Link to={"/work/" + card.slug} className="button varun-view-btn">
                    View Project <ArrowRight size={15} />
                  </Link>
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noreferrer"
                    className="varun-live-link"
                  >
                    Live Site ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ==============================================================
          SECTION 3 — CO-FOUNDER AT CODEXA AGENCY
          Short affiliation panel
          ============================================================== */}
      <div className="wrap">
        <Affiliation />
      </div>

      {/* ==============================================================
          SECTION 4 — CHOOSE YOUR WEBSITE / PROJECT ENQUIRY
          Interactive 3-Step Wizard with CodeXa Structure & SANJU X DEV Theme
          ============================================================== */}
      <section id="choose-website" className="homepage-enquiry-section wrap" aria-label="Choose Your Website">
        <div className="homepage-enquiry-header">
          <span className="eyebrow">Project Enquiry</span>
          <h2 className="homepage-enquiry-title">Choose Your Website</h2>
          <p className="homepage-enquiry-sub">
            Select what you&apos;re planning to create, pick your features, and get an honest proposal with your unique tracking code.
          </p>
        </div>

        <div className="homepage-enquiry-card-wrapper">
          <EnquiryBuilder isHomepageSection={true} />
        </div>
      </section>

      {/* ==============================================================
          SECTION 5 — CONTACT INFORMATION
          Let's Connect (Must be last section)
          ============================================================== */}
      <ContactSection />
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
      <div className="card-washi-tape" aria-hidden="true" />
      <Link
        to={"/work/" + p.slug}
        className="project-image"
        style={{ "--project": p.color } as React.CSSProperties}
      >
        <div className="project-card-browser-bar">
          <div className="browser-dots">
            <span />
            <span />
            <span />
          </div>
          <span className="project-card-url">{new URL(p.url).hostname}</span>
        </div>
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
        <div className="project-meta-top">
          <span className="eyebrow">
            {String(index).padStart(2, "0")} / {p.category}
          </span>
          <span className="project-badge-tag">{p.kind}</span>
        </div>
        <h3 className="project-card-heading">
          <Link to={"/work/" + p.slug}>{p.name}</Link>
        </h3>
        <p className="project-card-summary">{p.summary}</p>
        <div className="project-card-actions">
          <Link to={"/work/" + p.slug} className="button project-view-btn">
            View Project <Arrow />
          </Link>
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="project-external-link"
          >
            Live Site ↗
          </a>
        </div>
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
        Verified public projects built for entertainment, discovery and
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
    if (!loc.hash) {
      window.scrollTo(0, 0);
    } else {
      const el = document.getElementById(loc.hash.replace("#", ""));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }

    const p = site.projects.find((p) => loc.pathname === "/work/" + p.slug);
    document.title =
      (loc.pathname === "/"
        ? ""
        : (p
            ? p.name
            : ((
                {
                  "/": "",
                  "/work": "Selected Projects",
                  "/about": "About",
                  "/services": "Services",
                  "/contact": "Start a Project",
                  "/privacy": "Privacy",
                  "/spideyy": "Spideyy — Private Access",
                  "/admin": "Spideyy — Private Access",
                } as Record<string, string>
              )[loc.pathname] ?? "Page not found")) + " — ") + site.seoTitle;
  }, [loc.pathname, loc.hash, site]);

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
                <NavLink to="/" end>
                  Home
                </NavLink>
                {loc.pathname === "/" ? (
                  <a href="#featured-projects">Projects</a>
                ) : (
                  <NavLink to="/work">Projects</NavLink>
                )}
                {loc.pathname === "/" ? (
                  <a href="#choose-website">Start a Project</a>
                ) : (
                  <NavLink to="/contact">Start a Project</NavLink>
                )}
                {loc.pathname === "/" ? (
                  <a href="#contact">Contact</a>
                ) : (
                  <a href="/#contact">Contact</a>
                )}
                <a
                  href={loc.pathname === "/" ? "#choose-website" : "/contact"}
                  className="nav-cta-btn"
                >
                  Start Your Project <ArrowRight size={15} />
                </a>
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
