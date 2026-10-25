import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Copy, Check, ChevronDown, Search, ArrowRight } from "lucide-react";
import { useSite, Arrow } from "./App";

interface ServiceCategory {
  id: string;
  label: string;
  desc: string;
}

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { id: "business", label: "Business Website", desc: "Help customers find and contact my business." },
  { id: "store", label: "Online Store", desc: "Sell products online." },
  { id: "portfolio", label: "Portfolio Website", desc: "Showcase my work or skills." },
  { id: "booking", label: "Booking Website", desc: "Let customers book appointments." },
  { id: "education", label: "Educational Website", desc: "Courses, school, tuition or learning platform." },
  { id: "webapp", label: "Business Application", desc: "A custom system for my business." },
  { id: "redesign", label: "Existing Website Changes", desc: "Fix, redesign or improve my website." },
  { id: "other", label: "Other Project", desc: "Something different." },
  { id: "notsure", label: "Not Sure", desc: "Help me decide." },
];

const SEARCHABLE_CATEGORIES: ServiceCategory[] = [
  { id: "realestate", label: "Real Estate & Properties", desc: "Property listings, virtual tours & enquiry forms." },
  { id: "healthcare", label: "Healthcare & Clinic", desc: "Doctor profiles, patient booking & treatment info." },
  { id: "hospitality", label: "Travel & Hospitality", desc: "Hotel, tour itineraries, booking & inquiries." },
  { id: "events", label: "Events & Entertainment", desc: "Show agendas, ticket bookings & attendee portals." },
  { id: "restaurants", label: "Restaurants & Cafes", desc: "Digital menus, table reservations & pickup orders." },
  { id: "membership", label: "Membership & Community", desc: "Member directory, subscription access & private forums." },
  { id: "saas", label: "Custom SaaS Platform", desc: "High-scalability cloud software & user dashboards." },
  { id: "nonprofit", label: "Non-Profit & NGO", desc: "Donor contributions, cause awareness & impact showcase." },
  { id: "editorial", label: "Blog & Media Publication", desc: "Editorial articles, newsletters & author profiles." },
  { id: "fitness", label: "Fitness & Wellness Studio", desc: "Class timetable schedules & membership booking." },
];

const DEFAULT_FEATURES = [
  "WhatsApp button",
  "Online payments",
  "Product listing",
  "Booking",
  "Customer login",
  "Admin dashboard",
  "AI chatbot",
  "Something else",
  "Not sure",
];

const TIMELINE_CHOICES = [
  "Flexible / No rush",
  "Within 2 to 4 weeks",
  "1 to 2 months",
  "Not sure yet",
];

const BUDGET_CHOICES = [
  "Need guidance / Let's discuss scope",
  "Standard business tier (focused website)",
  "Growth / custom application",
  "Flexible",
];

export default function Contact() {
  const s = useSite();
  const [params] = useSearchParams();

  // 2 steps: 0 = "Tell us what you need", 1 = "How can we contact you?"
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Searchable categories toggle
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  // Collapsible optional contact details
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Available categories & features from owner dashboard or fallback
  const categories: ServiceCategory[] =
    Array.isArray((s as any).enquiryCategories) && (s as any).enquiryCategories.length > 0
      ? (s as any).enquiryCategories
      : DEFAULT_CATEGORIES;

  const featuresList: string[] =
    Array.isArray((s as any).enquiryFeatures) && (s as any).enquiryFeatures.length > 0
      ? (s as any).enquiryFeatures
      : DEFAULT_FEATURES;

  const [form, setForm] = useState({
    // Step 1: Project Needs
    selectedCategories: (params.get("service")
      ? [params.get("service") as string]
      : ["Business Website"]) as string[],
    description: "",
    selectedFeatures: [] as string[],
    timeline: "Flexible / No rush",
    budget: "Need guidance / Let's discuss scope",

    // Step 2: Contact Details
    name: "",
    email: "",
    phone: "",
    countryCode: "+91",
    preferred_contact: "email",
    company: "",
    is_individual: false,
    website_url: "",
    city: "",
    consent: false,
    website: "", // Honeypot
  });

  const update = (k: string, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleCategory = (catLabel: string) => {
    setForm((f) => {
      const exists = f.selectedCategories.includes(catLabel);
      if (exists) {
        const remaining = f.selectedCategories.filter((c) => c !== catLabel);
        return { ...f, selectedCategories: remaining.length ? remaining : [catLabel] };
      } else {
        return { ...f, selectedCategories: [...f.selectedCategories, catLabel] };
      }
    });
  };

  const toggleFeature = (feat: string) => {
    setForm((f) => {
      const exists = f.selectedFeatures.includes(feat);
      return {
        ...f,
        selectedFeatures: exists
          ? f.selectedFeatures.filter((item) => item !== feat)
          : [...f.selectedFeatures, feat],
      };
    });
  };

  const skipFeatures = () => {
    setForm((f) => ({ ...f, selectedFeatures: [] }));
  };

  // Filter searchable services
  const filteredSearchServices = SEARCHABLE_CATEGORIES.filter((cat) => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      cat.label.toLowerCase().includes(q) ||
      cat.desc.toLowerCase().includes(q)
    );
  });

  function handleContinueToContact(e: React.FormEvent) {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      setStatus("Please share a short sentence (at least 10 characters) about your idea.");
      return;
    }
    setStatus("");
    setStep(1);
    window.scrollTo({ top: 200, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("Please enter your name and email address.");
      return;
    }
    if (!form.consent) {
      setStatus("Please check the consent box to proceed.");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const fullPhone = form.phone.trim()
        ? `${form.countryCode} ${form.phone.trim()}`
        : "";

      const primaryService = form.selectedCategories[0] || "Business Website";

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: fullPhone,
        whatsapp: form.preferred_contact === "whatsapp" ? fullPhone : "",
        preferred_contact: form.preferred_contact,
        company: form.is_individual
          ? "Individual / Personal Project"
          : form.company.trim(),
        is_individual: form.is_individual,
        website_url: form.website_url.trim(),
        city: form.city.trim(),
        service: primaryService,
        categories: form.selectedCategories,
        features: form.selectedFeatures,
        description: form.description.trim(),
        timeline: form.timeline,
        budget: form.budget,
        consent: form.consent,
        website: form.website, // honeypot
      };

      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to send your enquiry. Please try again.");

      setTrackingCode(d.trackingCode || "SXD-001");
      setSent(true);
      window.scrollTo({ top: 150, behavior: "smooth" });
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyTrackingId() {
    if (trackingCode) {
      void navigator.clipboard.writeText(trackingCode);
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
            A few simple details in normal words are all we need to begin. No
            technical jargon or forced fields — just an honest conversation about
            your project.
          </p>

          <a href={"mailto:" + s.email}>{s.email}</a>

          <div style={{ marginTop: 28 }}>
            <p style={{ margin: "6px 0 10px 0" }}>Already have a project with us?</p>
            <Link className="text-link" to="/track">
              Track project status <Arrow />
            </Link>
          </div>

          <p style={{ marginTop: 20 }}>Prefer to explore our work first?</p>
          <Link className="text-link" to="/work">
            See our portfolio <Arrow />
          </Link>
        </aside>

        <div className="form-panel">
          {/* 2-Step Progress Indicator */}
          <div className="simple-steps">
            <div className={`simple-step-pill ${step === 0 ? "active" : ""}`}>
              <span className="simple-step-num">1</span>
              <span>Tell us what you need</span>
            </div>
            <div className={`simple-step-pill ${step === 1 ? "active" : ""}`}>
              <span className="simple-step-num">2</span>
              <span>How can we contact you?</span>
            </div>
          </div>

          {/* SUBMISSION CONFIRMATION SCREEN */}
          {sent ? (
            <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
              <span className="eyebrow" style={{ color: "var(--accent)" }}>
                Enquiry Received Successfully
              </span>
              <h2 style={{ margin: "10px 0 16px", fontSize: 28 }}>
                Thank you! We’ve received your enquiry.
              </h2>
              <p
                style={{
                  color: "var(--muted)",
                  maxWidth: 480,
                  margin: "0 auto 20px",
                  lineHeight: 1.7,
                }}
              >
                Thank you, <strong>{form.name}</strong>. An acknowledgement email with your project details has been sent to <strong>{form.email}</strong>.
              </p>

              {/* Unique Tracking ID Badge */}
              <div
                style={{
                  background: "var(--soft)",
                  border: "1px dashed var(--accent)",
                  borderRadius: 8,
                  padding: "24px 20px",
                  maxWidth: 380,
                  margin: "0 auto 24px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Your Tracking ID
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                    letterSpacing: "0.08em",
                    marginBottom: 14,
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <Link to={`/track?code=${trackingCode}`} className="button">
                  Track My Project <Arrow />
                </Link>
                <Link to="/" className="button secondary">
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: TELL US WHAT YOU NEED */}
              {step === 0 && (
                <form onSubmit={handleContinueToContact}>
                  <div style={{ marginBottom: 18 }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 20 }}>
                      What kind of website or project do you need?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      Choose one or more options that fit your idea. You can also pick &apos;Not Sure&apos; and we will help you decide.
                    </p>
                  </div>

                  {/* 9 Simple Selection Cards */}
                  <div className="simple-service-grid">
                    {categories.map((cat) => {
                      const isSelected = form.selectedCategories.includes(cat.label);
                      return (
                        <div
                          key={cat.id || cat.label}
                          className={`simple-service-card ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleCategory(cat.label)}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              toggleCategory(cat.label);
                            }
                          }}
                        >
                          <div>
                            <div className="simple-service-title">
                              <span>{cat.label}</span>
                              <span
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? "var(--accent)" : "var(--line)",
                                  fontWeight: 700,
                                }}
                              >
                                {isSelected ? "✓" : "+"}
                              </span>
                            </div>
                            <div className="simple-service-desc">{cat.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Searchable View All Services Toggle */}
                  <div style={{ margin: "14px 0 24px" }}>
                    <button
                      type="button"
                      onClick={() => setShowAllServices(!showAllServices)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: 0,
                      }}
                    >
                      <Search size={14} />
                      <span>{showAllServices ? "Hide specialized categories" : "View all specialized industries & services"}</span>
                      <ChevronDown
                        size={14}
                        style={{
                          transform: showAllServices ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>

                    {showAllServices && (
                      <div className="all-services-box">
                        <input
                          type="text"
                          className="all-services-search"
                          placeholder="Search real estate, healthcare, travel, restaurant, SaaS..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                        />
                        <div className="all-services-tags">
                          {filteredSearchServices.map((cat) => {
                            const isSelected = form.selectedCategories.includes(cat.label);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                className={`feature-chip ${isSelected ? "selected" : ""}`}
                                onClick={() => toggleCategory(cat.label)}
                              >
                                {isSelected ? "✓ " : "+ "}
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simple Requirements Description */}
                  <label style={{ display: "block", marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                      Tell us a little about your idea *
                    </div>
                    <textarea
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={4}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Example: I have a small clothing business. I want a website where customers can see my products and contact me on WhatsApp."
                      style={{ width: "100%", fontSize: 13, lineHeight: 1.6 }}
                    />
                    <small style={{ color: "var(--muted)", fontSize: 11, display: "block", marginTop: 4 }}>
                      Normal words are best. You don&apos;t need to know any technical terms like API, CMS, or backend.
                    </small>
                  </label>

                  {/* Optional Helpful Feature Selections */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        Helpful features (Optional)
                      </span>
                      <button
                        type="button"
                        onClick={skipFeatures}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: 11.5,
                          color: "var(--muted)",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                      >
                        Skip feature selection
                      </button>
                    </div>

                    <div className="feature-chips-wrap">
                      {featuresList.map((feat) => {
                        const isSelected = form.selectedFeatures.includes(feat);
                        return (
                          <button
                            type="button"
                            key={feat}
                            className={`feature-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleFeature(feat)}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {feat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Budget & Timeline (Non-binding) */}
                  <div className="form-grid" style={{ marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                        Timeline (Optional, non-binding)
                      </div>
                      <div className="option-chips-wrap">
                        {TIMELINE_CHOICES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`option-chip ${form.timeline === t ? "selected" : ""}`}
                            onClick={() => update("timeline", t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                        Budget estimate (Optional, non-binding)
                      </div>
                      <div className="option-chips-wrap">
                        {BUDGET_CHOICES.map((b) => (
                          <button
                            key={b}
                            type="button"
                            className={`option-chip ${form.budget === b ? "selected" : ""}`}
                            onClick={() => update("budget", b)}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {status && (
                    <p role="alert" className="status" style={{ color: "var(--accent)", marginBottom: 16 }}>
                      {status}
                    </p>
                  )}

                  <div className="form-actions" style={{ justifyContent: "flex-end" }}>
                    <button type="submit" className="button">
                      Continue to Step 2: Contact Details <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: HOW CAN WE CONTACT YOU? */}
              {step === 1 && (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 18 }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 20 }}>
                      How can we contact you?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      Where should we send your project proposal and tracking details?
                    </p>
                  </div>

                  {/* Prominent Core Fields */}
                  <div className="form-grid">
                    <label>
                      Your Full Name *
                      <input
                        required
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                      />
                    </label>

                    <label>
                      Email Address *
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="e.g. rahul@example.com"
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Mobile / WhatsApp Number
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          style={{ width: 85, textAlign: "center" }}
                          value={form.countryCode}
                          onChange={(e) => update("countryCode", e.target.value)}
                          placeholder="+91"
                        />
                        <input
                          type="tel"
                          autoComplete="tel"
                          style={{ flex: 1 }}
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="e.g. 9876543210"
                        />
                      </div>
                      <small style={{ color: "var(--muted)", fontSize: 11, marginTop: 4, display: "block" }}>
                        Include country code for WhatsApp updates.
                      </small>
                    </label>

                    <label>
                      Preferred Contact Method
                      <select
                        value={form.preferred_contact}
                        onChange={(e) => update("preferred_contact", e.target.value)}
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp Message</option>
                        <option value="phone">Phone Call</option>
                      </select>
                    </label>
                  </div>

                  {/* Collapsible Section for Optional Business Details */}
                  <div style={{ margin: "14px 0" }}>
                    <button
                      type="button"
                      className="collapsible-trigger"
                      onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                    >
                      <span>{showOptionalDetails ? "Hide optional business details" : "+ Add optional business details (Brand name, existing website, city)"}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: showOptionalDetails ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>

                    {showOptionalDetails && (
                      <div style={{ background: "var(--panel)", padding: 16, borderRadius: 8, marginBottom: 14 }}>
                        <div className="form-grid">
                          <label>
                            Business or Brand Name (Optional)
                            <input
                              type="text"
                              value={form.company}
                              disabled={form.is_individual}
                              onChange={(e) => update("company", e.target.value)}
                              placeholder="e.g. Bloom Apparel"
                            />
                            <label className="check" style={{ marginTop: 6 }}>
                              <input
                                type="checkbox"
                                checked={form.is_individual}
                                onChange={(e) => update("is_individual", e.target.checked)}
                              />
                              <span style={{ fontSize: 11.5 }}>I am an individual / personal brand</span>
                            </label>
                          </label>

                          <label>
                            Existing Website Link (Optional)
                            <input
                              type="url"
                              value={form.website_url}
                              onChange={(e) => update("website_url", e.target.value)}
                              placeholder="https://mycurrentsite.com"
                            />
                          </label>
                        </div>

                        <label style={{ display: "block", marginTop: 8 }}>
                          City / Location (Optional)
                          <input
                            type="text"
                            value={form.city}
                            onChange={(e) => update("city", e.target.value)}
                            placeholder="e.g. Hyderabad, India"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Short Summary Card */}
                  <div className="enquiry-summary-card">
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Enquiry Summary:</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      <b>Project:</b> {form.selectedCategories.join(", ")}
                    </div>
                    {form.selectedFeatures.length > 0 && (
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                        <b>Features:</b> {form.selectedFeatures.join(", ")}
                      </div>
                    )}
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                      <b>Brief:</b> {form.description.slice(0, 140)}{form.description.length > 140 ? "…" : ""}
                    </div>
                  </div>

                  {/* Explicit Consent */}
                  <label className="check" style={{ marginTop: 16, marginBottom: 16 }}>
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                    />
                    <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      I agree to receive a project proposal and tracking updates from SANJU X DEV. Your details are strictly confidential and will never be shared. <Link to="/privacy">Privacy policy</Link>
                    </span>
                  </label>

                  {/* Honeypot */}
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
                    <p role="alert" className="status" style={{ color: "var(--accent)", marginBottom: 16 }}>
                      {status}
                    </p>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="button secondary"
                    >
                      ← Back to Step 1
                    </button>

                    <button type="submit" className="button" disabled={busy}>
                      {busy ? "Sending Enquiry…" : "Send My Enquiry"}
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
