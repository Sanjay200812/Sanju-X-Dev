import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Copy, Check, MessageCircle } from "lucide-react";
import { useSite, Arrow } from "./App";

const PROJECT_CATEGORIES = [
  { id: "ecommerce", label: "Online Store (E-Commerce)", desc: "Sell physical/digital products, accept payments & manage inventory" },
  { id: "corporate", label: "Business / Corporate Site", desc: "Build authority, showcase core services & capture qualified leads" },
  { id: "portfolio", label: "Portfolio / Creative Showcase", desc: "Showcase photography, design, agency work or personal brand" },
  { id: "landing", label: "Landing Page / Launch", desc: "High-converting single page designed for a product, campaign or app" },
  { id: "webapp", label: "Custom Web App / SaaS", desc: "Interactive web application with databases, user portals or dashboards" },
  { id: "booking", label: "Booking & Reservations", desc: "Appointment scheduling, event tickets or service booking calendars" },
  { id: "restaurant", label: "Restaurant & Food Ordering", desc: "Interactive menus, table reservations & pickup/delivery requests" },
  { id: "realestate", label: "Real Estate & Properties", desc: "Searchable property listings, high-res photos & enquiry forms" },
  { id: "education", label: "Course / Learning Portal", desc: "Video modules, student registration & resource downloads" },
  { id: "healthcare", label: "Healthcare & Clinic", desc: "Specialist profiles, treatment explanations & appointment booking" },
  { id: "nonprofit", label: "NGO / Community Platform", desc: "Showcase mission, impact reports, volunteer signups & support info" },
  { id: "editorial", label: "Blog & Publication", desc: "Articles, editorial categories, author profiles & newsletter capture" },
  { id: "fitness", label: "Fitness / Gym Studio", desc: "Class timetables, membership tiers & personal trainer booking" },
  { id: "events", label: "Event & Conference Hub", desc: "Speaker rosters, schedule agendas, venue maps & registration" },
  { id: "clientportal", label: "Client Portal (B2B)", desc: "Private dashboard for customer files, milestones & project status" },
  { id: "directory", label: "Directory & Marketplace", desc: "Searchable vendor directory, user reviews & category filters" },
  { id: "finance", label: "Finance & Advisory", desc: "Consulting services, calculators & private consultation bookings" },
  { id: "logistics", label: "Logistics & Fleet", desc: "Service routes, quote calculators & shipment tracking forms" },
  { id: "mobileapp", label: "Mobile-First Web App", desc: "Optimized Progressive Web App (PWA) with native mobile feel" },
  { id: "redesign", label: "UI/UX Redesign", desc: "Complete visual modernization and performance overhaul of an existing site" },
];

const POPULAR_FEATURES = [
  "Online Payments & Invoicing",
  "User Accounts & Secure Login",
  "Search Engine Optimization (SEO)",
  "Ultra-Fast Mobile Speed",
  "WhatsApp & Instant Inquiry Integration",
  "Content Management (Easy Updates)",
  "Analytics & Visitor Tracking",
  "Custom Motion & Visual Effects",
  "Multi-Language Support",
  "Automated Email Notifications",
];

export default function Contact() {
  const s = useSite();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    // Step 1: Contact & Brand
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    preferred_contact: "email",
    company: "",
    is_individual: false,
    website_url: "",
    city: "",
    country: "India",

    // Step 2: Project Requirements
    service:
      s.services.find((item) => item.name === params.get("service"))?.name ||
      s.services[0].name,
    categories: [] as string[],
    features: [] as string[],
    description:
      params.get("service") &&
      !s.services.some((item) => item.name === params.get("service"))
        ? "I am interested in a project similar to: " + params.get("service")
        : "",
    timeline: "Standard (2–4 weeks)",
    budget: "Let’s discuss based on scope",
    consent: false,
    website: "", // Honeypot
  });

  const update = (k: string, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleCategory = (catLabel: string) => {
    setForm((f) => {
      const exists = f.categories.includes(catLabel);
      const updated = exists
        ? f.categories.filter((c) => c !== catLabel)
        : [...f.categories, catLabel];
      return { ...f, categories: updated };
    });
  };

  const toggleFeature = (feat: string) => {
    setForm((f) => {
      const exists = f.features.includes(feat);
      const updated = exists
        ? f.features.filter((item) => item !== feat)
        : [...f.features, feat];
      return { ...f, features: updated };
    });
  };

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("Please enter your name and a valid email address.");
      return;
    }
    setStatus("");
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      const payload = {
        ...form,
        company: form.is_individual ? "Individual / Personal Project" : form.company,
      };

      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok) throw Error(d.error || "Unable to send. Please try again.");

      setTrackingCode(d.trackingCode || "SXD-001");
      setSent(true);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyTrackingId() {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="page wrap">
      <span className="eyebrow">Start a project</span>
      <h1>
        Your next chapter<br />
        <em>starts here.</em>
      </h1>

      <div className="contact-grid">
        <aside className="contact-aside">
          <h2>
            Tell us what<br />
            you have in mind.
          </h2>
          <p>
            A few useful details are all we need to begin. No fixed packages or
            assumptions — just an honest conversation about the right architecture.
          </p>

          <a href={"mailto:" + s.email}>{s.email}</a>

          <div style={{ marginTop: 28 }}>
            <p style={{ margin: "6px 0 10px 0" }}>Already submitted an enquiry?</p>
            <Link className="text-link" to="/track">
              Track your project status <Arrow />
            </Link>
          </div>

          <p style={{ marginTop: 20 }}>Prefer to explore our work first?</p>
          <Link className="text-link" to="/work">
            See the work <Arrow />
          </Link>
        </aside>

        <div className="form-panel">
          <div className="steps">
            {["01 / Contact & Brand", "02 / Project & Scope"].map((x, i) => (
              <span key={x} className={i === step ? "active" : ""}>
                {x}
              </span>
            ))}
          </div>

          {sent ? (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 24px" }}>
                <span className="eyebrow" style={{ color: "var(--accent)" }}>Enquiry Received Successfully</span>
                <h2 style={{ margin: "10px 0 16px", fontSize: 28 }}>We’ve Received Your Brief</h2>
                <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 20px" }}>
                  Thank you, <strong>{form.name}</strong>. Your project enquiry has been registered and a
                  confirmation copy has been dispatched to <strong>{form.email}</strong>.
                </p>

                {/* Permanent Tracking ID Badge */}
                <div
                  style={{
                    background: "var(--soft)",
                    border: "1px dashed var(--accent)",
                    borderRadius: 8,
                    padding: "20px",
                    maxWidth: 380,
                    margin: "0 auto 24px",
                  }}
                >
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 6 }}>
                    Your Permanent Tracking ID
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--accent)",
                      letterSpacing: "0.08em",
                      marginBottom: 12,
                    }}
                  >
                    {trackingCode}
                  </div>

                  <button
                    type="button"
                    onClick={copyTrackingId}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      padding: "8px 16px",
                      borderRadius: 4,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {copied ? <Check size={16} style={{ color: "#25d366" }} /> : <Copy size={16} />}
                    {copied ? "Copied to Clipboard!" : "Copy Tracking ID"}
                  </button>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14 }}>
                  <Link to={`/track?code=${trackingCode}`} className="button">
                    Track Project Status Now <Arrow />
                  </Link>

                  <a
                    href={`https://wa.me/919392257217?text=${encodeURIComponent(`Hi Sanjay, I have submitted project enquiry ${trackingCode} (${form.company || form.name}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button secondary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <MessageCircle size={16} />
                    Follow up on WhatsApp
                  </a>
                </div>

                <div
                  style={{
                    marginTop: 28,
                    paddingTop: 18,
                    borderTop: "1px solid var(--line)",
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  Submitting an enquiry allows us to review your requirements. We will contact you via {form.preferred_contact === "whatsapp" ? "WhatsApp" : form.preferred_contact === "phone" ? "Phone Call" : "Email"} within 24 hours to confirm scope, milestones, and tailored pricing.
                </div>
              </div>
            </div>
          ) : (
            <>
              {step === 0 ? (
                /* STEP 1: Contact Information */
                <form onSubmit={handleContinue}>
                  <div className="form-grid">
                    <label>
                      Full Name *
                      <input
                        required
                        type="text"
                        maxLength={100}
                        autoComplete="name"
                        placeholder="e.g. Sanjay Boddukuri"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                      />
                    </label>

                    <label>
                      Email Address *
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Mobile Number (with country code)
                      <input
                        type="tel"
                        maxLength={40}
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </label>

                    <label>
                      WhatsApp Number
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          type="tel"
                          maxLength={40}
                          style={{ margin: 0, flex: 1 }}
                          placeholder="+91 98765 43210"
                          value={form.whatsapp}
                          onChange={(e) => update("whatsapp", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => update("whatsapp", form.phone)}
                          style={{
                            background: "var(--soft)",
                            border: "1px solid var(--line)",
                            padding: "0 10px",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            color: "var(--text)",
                          }}
                        >
                          Same as Mobile
                        </button>
                      </div>
                    </label>
                  </div>

                  <label>
                    Preferred Contact Method
                    <select
                      value={form.preferred_contact}
                      onChange={(e) => update("preferred_contact", e.target.value)}
                    >
                      <option value="email">Email (Detailed scope & proposals)</option>
                      <option value="whatsapp">WhatsApp (Quick updates & discussions)</option>
                      <option value="phone">Phone Call (Direct conversation)</option>
                    </select>
                  </label>

                  <label>
                    Business / Brand Name
                    <input
                      type="text"
                      maxLength={150}
                      disabled={form.is_individual}
                      placeholder={form.is_individual ? "Individual / Personal Project" : "e.g. StarX Media, Acme Studio"}
                      value={form.is_individual ? "" : form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />
                  </label>

                  <label className="check" style={{ marginBottom: 20 }}>
                    <input
                      type="checkbox"
                      checked={form.is_individual}
                      onChange={(e) => update("is_individual", e.target.checked)}
                    />
                    <span>I don’t have a registered business (This is an individual or personal project)</span>
                  </label>

                  <div className="form-grid">
                    <label>
                      Existing Website / Reference URL (optional)
                      <input
                        type="url"
                        maxLength={300}
                        placeholder="https://example.com"
                        value={form.website_url}
                        onChange={(e) => update("website_url", e.target.value)}
                      />
                    </label>

                    <label>
                      City & Country (optional)
                      <input
                        type="text"
                        maxLength={100}
                        placeholder="e.g. Hyderabad, India"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                      />
                    </label>
                  </div>

                  {status && (
                    <p role="alert" className="status">
                      {status}
                    </p>
                  )}

                  <div className="form-actions">
                    <span />
                    <button type="submit" className="button">
                      Continue to Project Details <Arrow />
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: Project Details & Requirements */
                <form onSubmit={handleSubmit}>
                  <label>
                    Primary Service Category
                    <select
                      value={form.service}
                      onChange={(e) => update("service", e.target.value)}
                    >
                      {[
                        ...new Set([
                          ...s.services.map((x) => x.name),
                          form.service,
                        ]),
                      ].map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </label>

                  {/* Plain-English Project Types / Categories */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                      What kind of website or platform are you building? (Select all that apply)
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: 8,
                        maxHeight: 280,
                        overflowY: "auto",
                        padding: 10,
                        background: "var(--soft)",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                      }}
                    >
                      {PROJECT_CATEGORIES.map((cat) => {
                        const selected = form.categories.includes(cat.label);
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => toggleCategory(cat.label)}
                            style={{
                              textAlign: "left",
                              padding: "8px 10px",
                              borderRadius: 4,
                              border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                              background: selected ? "var(--paper)" : "transparent",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 2,
                                  border: "1px solid " + (selected ? "var(--accent)" : "var(--line)"),
                                  background: selected ? "var(--accent)" : "transparent",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: 10,
                                }}
                              >
                                {selected ? "✓" : ""}
                              </span>
                              <strong style={{ fontSize: 12, color: "var(--text)" }}>{cat.label}</strong>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, paddingLeft: 20 }}>
                              {cat.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feature Tags / Pills */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                      Key Features & Integrations Needed
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {POPULAR_FEATURES.map((feat) => {
                        const selected = form.features.includes(feat);
                        return (
                          <button
                            type="button"
                            key={feat}
                            onClick={() => toggleFeature(feat)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 500,
                              border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                              background: selected ? "var(--accent)" : "var(--paper)",
                              color: selected ? "#ffffff" : "var(--text)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {selected ? "✓ " : "+ "}
                            {feat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label>
                    Project Description & Requirements *
                    <textarea
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={4}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Briefly describe what your project or business does, your target audience, and any specific ideas or references you have in mind."
                    />
                  </label>

                  <div className="form-grid">
                    <label>
                      Target Timeline
                      <select
                        value={form.timeline}
                        onChange={(e) => update("timeline", e.target.value)}
                      >
                        <option value="Urgent (Within 1–2 weeks)">Urgent (Within 1–2 weeks)</option>
                        <option value="Standard (2–4 weeks)">Standard (2–4 weeks)</option>
                        <option value="Flexible (1–2 months)">Flexible (1–2 months)</option>
                        <option value="No rush / Planning phase">No rush / Planning phase</option>
                      </select>
                    </label>

                    <label>
                      Estimated Budget Range
                      <select
                        value={form.budget}
                        onChange={(e) => update("budget", e.target.value)}
                      >
                        <option value="Under ₹25,000 / $300 (Starter project)">Under ₹25,000 / $300 (Starter project)</option>
                        <option value="₹25,000 – ₹50,000 / $300 – $600 (Growth project)">₹25,000 – ₹50,000 / $300 – $600 (Growth project)</option>
                        <option value="₹50,000 – ₹1,00,000 / $600 – $1,200 (Professional bespoke)">₹50,000 – ₹1,00,000 / $600 – $1,200 (Professional bespoke)</option>
                        <option value="₹1,00,000+ / $1,200+ (Comprehensive enterprise / custom app)">₹1,00,000+ / $1,200+ (Comprehensive enterprise / custom app)</option>
                        <option value="Let’s discuss based on scope">Let’s discuss based on scope</option>
                      </select>
                    </label>
                  </div>

                  {/* Review Summary */}
                  <div className="status" style={{ fontSize: 12 }}>
                    <strong>Brief Summary:</strong> {form.name} ({form.is_individual ? "Individual Project" : form.company || "Personal Project"})
                    <br />
                    <span>Contact: {form.email} · {form.phone || "No phone"} ({form.preferred_contact})</span>
                  </div>

                  <label className="check" style={{ marginTop: 16 }}>
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                    />
                    <span>
                      I agree that SANJU X DEV may store these details to respond to my project enquiry. <Link to="/privacy">Privacy policy</Link>
                    </span>
                  </label>

                  <label className="honeypot" aria-hidden="true">
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                    />
                  </label>

                  {status && (
                    <p role="alert" className="status">
                      {status}
                    </p>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="button secondary"
                    >
                      ← Back to Contact Info
                    </button>

                    <button type="submit" className="button" disabled={busy}>
                      {busy ? "Submitting Brief…" : "Submit Project Brief"}
                      <Arrow />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
