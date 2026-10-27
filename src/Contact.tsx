import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Copy,
  Check,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  User,
  BookOpen,
  Building2,
  Layers,
  ShoppingBag,
  Sparkles,
  Utensils,
  Store,
  GraduationCap,
  Calendar,
  Code,
  HelpCircle,
} from "lucide-react";
import { useSite, Arrow } from "./App";
import { InstagramIcon, FacebookIcon, MailIcon } from "./Decorations";
import {
  DEFAULT_WEBSITE_CATEGORIES,
  DESIGN_STYLES,
  TIMELINE_CHOICES,
  BUDGET_CHOICES,
  type WebsiteCategory,
} from "./content";

export default function Contact() {
  const s = useSite();
  const [params] = useSearchParams();

  // 3-step builder: 0 = Category, 1 = Features & Preferences, 2 = Contact Details
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showOptionalContact, setShowOptionalContact] = useState(false);

  // Available categories from owner dashboard or default 5
  const categories: WebsiteCategory[] = useMemo(() => {
    const fromSite = (s as any).websiteCategories;
    if (Array.isArray(fromSite) && fromSite.length > 0) {
      return fromSite.filter((c: any) => c.enabled !== false);
    }
    return DEFAULT_WEBSITE_CATEGORIES;
  }, [s]);

  // Design styles, timeline and budget options
  const designStyles = useMemo(() => {
    return Array.isArray((s as any).designStyles) && (s as any).designStyles.length > 0
      ? (s as any).designStyles
      : DESIGN_STYLES;
  }, [s]);

  const timelineChoices = useMemo(() => {
    return Array.isArray((s as any).timelineChoices) && (s as any).timelineChoices.length > 0
      ? (s as any).timelineChoices
      : TIMELINE_CHOICES;
  }, [s]);

  const budgetChoices = useMemo(() => {
    return Array.isArray((s as any).budgetChoices) && (s as any).budgetChoices.length > 0
      ? (s as any).budgetChoices
      : BUDGET_CHOICES;
  }, [s]);

  // Initial category from URL param (spideyy recommendation) or default
  const initialCategory = useMemo(() => {
    const paramVal = params.get("category") || params.get("service");
    if (paramVal) {
      const match = categories.find(
        (c) =>
          c.label.toLowerCase() === paramVal.toLowerCase() ||
          c.id.toLowerCase() === paramVal.toLowerCase(),
      );
      if (match) return match.label;
    }
    return ""; // Phase 6: No default selection
  }, [params, categories]);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Category
    selectedCategory: initialCategory,

    // Step 2: Features & Preferences
    selectedFeatures: [] as string[],
    otherFeatureText: "",
    includeOtherFeature: false,
    includeNotSureFeature: false,
    designStyle: "Clean & Simple",
    referenceUrl: "",
    hasExistingWebsite: "No, I need a new website.",
    existingWebsiteUrl: "",
    hasDomain: "Not Sure",
    timeline: "Flexible",
    budget: "Not Sure Yet",
    description: "",

    // Step 3: Contact Details
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    isBusiness: false,
    businessName: "",
    city: "",
    additionalMessage: "",
    preferredContact: "WhatsApp",
    consent: false,
    website: "", // Honeypot
  });

  const update = (k: string, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Find active category object
  const activeCategory = useMemo(() => {
    return (
      categories.find((c) => c.label === form.selectedCategory) ||
      categories[0] ||
      DEFAULT_WEBSITE_CATEGORIES[0]
    );
  }, [categories, form.selectedCategory]);

  // Toggle feature selection
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
    setForm((f) => ({
      ...f,
      selectedFeatures: [],
      includeOtherFeature: false,
      includeNotSureFeature: true,
    }));
  };

  // Step 1 -> Step 2 validation
  function handleGoToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!form.selectedCategory) {
      setStatus("Please select a website type to continue.");
      return;
    }
    setStatus("");
    setStep(1);
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  // Step 2 -> Step 3 validation
  function handleGoToStep3(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setStep(2);
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  // Final Step 3 submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("Please enter your name and email address.");
      return;
    }
    if (!form.phone.trim()) {
      setStatus("Please enter your mobile or WhatsApp number.");
      return;
    }
    if (form.isBusiness && !form.businessName.trim()) {
      setStatus("Please enter your business or brand name.");
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

      // Compile features list including custom note if entered
      const compiledFeatures = [...form.selectedFeatures];
      if (form.includeOtherFeature && form.otherFeatureText.trim()) {
        compiledFeatures.push(`Other: ${form.otherFeatureText.trim()}`);
      } else if (form.includeOtherFeature) {
        compiledFeatures.push("Other Feature — Tell Us What You Need");
      }
      if (form.includeNotSureFeature) {
        compiledFeatures.push("Not Sure — Help Me Decide");
      }

      // Build structured payload
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: fullPhone,
        whatsapp: form.preferredContact === "WhatsApp" ? fullPhone : "",
        preferred_contact: form.preferredContact,
        company: form.isBusiness ? form.businessName.trim() : "",
        business_name: form.isBusiness ? form.businessName.trim() : "",
        is_business: form.isBusiness,
        is_individual: !form.isBusiness,
        service: form.selectedCategory,
        categories: [form.selectedCategory],
        features: compiledFeatures,
        design_preference: form.designStyle,
        reference_url: form.referenceUrl.trim(),
        has_existing_website: form.hasExistingWebsite,
        existing_website_url: form.existingWebsiteUrl.trim(),
        website_url: form.existingWebsiteUrl.trim(),
        has_domain: form.hasDomain,
        timeline: form.timeline,
        budget: form.budget,
        description: form.description.trim(),
        city: form.city.trim(),
        additional_message: form.additionalMessage.trim(),
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

  // Icons for 5 categories
  function renderCategoryIcon(id: string) {
    switch (id) {
      case "portfolio":
        return <User size={18} />;
      case "blog":
        return <BookOpen size={18} />;
      case "business":
        return <Building2 size={18} />;
      case "agency":
        return <Layers size={18} />;
      case "ecommerce":
        return <ShoppingBag size={18} />;
      case "restaurant":
        return <Utensils size={18} />;
      case "shop":
        return <Store size={18} />;
      case "educational":
        return <GraduationCap size={18} />;
      case "booking":
        return <Calendar size={18} />;
      case "custom":
        return <Code size={18} />;
      case "not_sure":
        return <HelpCircle size={18} />;
      default:
        return <Sparkles size={18} />;
    }
  }

  return (
    <section className="page wrap">
      <span className="eyebrow">Start a project</span>
      <h1 style={{ marginBottom: 12 }}>Let&apos;s Build Your Website</h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--text)",
          maxWidth: 620,
          margin: "0 0 8px 0",
        }}
      >
        Choose the kind of website you need. Tell us a little about your idea,
        and we&apos;ll help you take it forward.
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 32px 0" }}>
        No technical knowledge needed. No payment required to enquire.
      </p>

      <div className="contact-grid">
        {/* Left Column: Context & Helpful Links */}
        <aside className="contact-aside">
          <div className="paper-tape-pin" aria-hidden="true" />
          <h2>
            Simple, honest<br />
            consultation.
          </h2>
          <p>
            You don&apos;t need to worry about servers, code frameworks, or
            complex databases. We handle the full technical architecture so you
            can focus on your business or brand.
          </p>

          <div className="contact-social-links">
            <a href={"mailto:" + s.email} className="contact-social-card" aria-label="Direct email">
              <span className="contact-social-icon"><MailIcon size={18} /></span>
              <div className="contact-social-info">
                <span className="contact-social-label">Email</span>
                <span className="contact-social-val">{s.email}</span>
              </div>
            </a>

            <a
              href={s.instagram || "https://www.instagram.com/sanju_x_dev/"}
              target="_blank"
              rel="noreferrer"
              className="contact-social-card"
              aria-label="Instagram profile"
            >
              <span className="contact-social-icon"><InstagramIcon size={18} /></span>
              <div className="contact-social-info">
                <span className="contact-social-label">Instagram</span>
                <span className="contact-social-val">@sanju_x_dev</span>
              </div>
            </a>

            <a
              href={(s as any).facebook || "https://www.facebook.com/sanju.x.dev"}
              target="_blank"
              rel="noreferrer"
              className="contact-social-card"
              aria-label="Facebook page"
            >
              <span className="contact-social-icon"><FacebookIcon size={18} /></span>
              <div className="contact-social-info">
                <span className="contact-social-label">Facebook</span>
                <span className="contact-social-val">sanju_x_dev</span>
              </div>
            </a>
          </div>

          <div style={{ marginTop: 24 }}>
            <p style={{ margin: "6px 0 10px 0" }}>Already have an SXD enquiry?</p>
            <Link className="text-link" to="/track">
              Track project status <Arrow />
            </Link>
          </div>

          <p style={{ marginTop: 18 }}>Prefer to explore our work first?</p>
          <Link className="text-link" to="/work">
            See our portfolio <Arrow />
          </Link>
        </aside>

        {/* Right Column: 3-Step Enquiry Builder */}
        <div className="form-panel">
          {/* 3-Step Progress Indicator */}
          {!sent && (
            <div className="builder-steps" role="navigation" aria-label="Enquiry steps">
              <div
                className={`builder-step-pill ${step === 0 ? "active" : step > 0 ? "completed" : ""}`}
                onClick={() => setStep(0)}
                style={{ cursor: step > 0 ? "pointer" : "default" }}
              >
                <span className="builder-step-num">{step > 0 ? "✓" : "1"}</span>
                <span>Website Type</span>
              </div>
              <div
                className={`builder-step-pill ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}
                onClick={() => {
                  if (form.selectedCategory) setStep(1);
                }}
                style={{ cursor: step > 1 ? "pointer" : "default" }}
              >
                <span className="builder-step-num">{step > 1 ? "✓" : "2"}</span>
                <span>What You Need</span>
              </div>
              <div
                className={`builder-step-pill ${step === 2 ? "active" : ""}`}
              >
                <span className="builder-step-num">3</span>
                <span>Contact Details</span>
              </div>
            </div>
          )}

          {/* SUBMISSION CONFIRMATION SCREEN */}
          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0 28px" }}>
              <span className="eyebrow" style={{ color: "var(--accent)" }}>
                Enquiry Received Successfully
              </span>
              <h2 style={{ margin: "10px 0 16px", fontSize: 28 }}>
                Thank You! We&apos;ve Received Your Enquiry.
              </h2>
              <p
                style={{
                  color: "var(--muted)",
                  maxWidth: 480,
                  margin: "0 auto 20px",
                  lineHeight: 1.7,
                }}
              >
                Your request has been submitted successfully. A confirmation email
                with your requirements has been dispatched to{" "}
                <strong>{form.email}</strong>.
              </p>

              {/* Sequential SXD Tracking ID Badge */}
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
                  Your Tracking Code
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    fontSize: 30,
                    fontWeight: 700,
                    color: "var(--accent)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  {trackingCode}
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px" }}>
                  This number helps you check the progress of your request.
                </p>

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
                  {copied ? (
                    <Check size={16} style={{ color: "#25d366" }} />
                  ) : (
                    <Copy size={16} />
                  )}
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
                  Track My Request <Arrow />
                </Link>
                <Link to="/" className="button secondary">
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ==============================================================
                  STEP 1 — WHAT KIND OF WEBSITE DO YOU NEED?
                  ============================================================== */}
              {step === 0 && (
                <form onSubmit={handleGoToStep2}>
                  <div style={{ marginBottom: 18 }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 20 }}>
                      What kind of website do you need?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      Select the primary website type you are looking to build.
                      Category selection is required to show relevant features in the next step.
                    </p>
                  </div>

                  {/* Exactly 5 Main Website Category Cards */}
                  <div className="builder-categories-grid">
                    {categories.map((cat) => {
                      const isSelected = form.selectedCategory === cat.label;
                      return (
                        <div
                          key={cat.id || cat.label}
                          className={`builder-category-card ${isSelected ? "selected" : ""}`}
                          onClick={() => update("selectedCategory", cat.label)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              update("selectedCategory", cat.label);
                            }
                          }}
                        >
                          <div>
                            <div className="builder-cat-header">
                              <div className="builder-cat-icon">
                                {renderCategoryIcon(cat.id)}
                              </div>
                              <div className="builder-cat-check">
                                {isSelected ? "✓" : ""}
                              </div>
                            </div>

                            <div className="builder-cat-title">{cat.label}</div>
                            <div className="builder-cat-desc">{cat.desc}</div>
                          </div>

                          {cat.examples?.length > 0 && (
                            <div className="builder-cat-examples">
                              {cat.examples.map((ex: string, idx: number) => (
                                <span key={idx} className="builder-example-tag">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {form.selectedCategory === "Other / Custom Website" && (
                    <div style={{ marginTop: 18, background: "var(--soft)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                        Tell us what kind of custom website you have in mind:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Real Estate Portal, Event Booking, Community Hub..."
                        value={form.otherFeatureText}
                        onChange={(e) => update("otherFeatureText", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px" }}
                      />
                    </div>
                  )}

                  {status && (
                    <p role="alert" className="status" style={{ color: "var(--accent)", marginBottom: 16 }}>
                      {status}
                    </p>
                  )}

                  <div className="form-actions" style={{ justifyContent: "flex-end" }}>
                    <button type="submit" className="button" disabled={!form.selectedCategory}>
                      {form.selectedCategory ? "Continue to Step 2: Tell Us About Your Idea" : "Select a Website Type to Continue"} <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ==============================================================
                  STEP 2 — WHAT WOULD YOU LIKE ON YOUR WEBSITE?
                  ============================================================== */}
              {step === 1 && (
                <form onSubmit={handleGoToStep3}>
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        color: "var(--accent)",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Step 2 · For {form.selectedCategory}
                    </div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 22 }}>
                      Choose What You Need
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      Select anything you&apos;d like. Not sure? You can skip this part
                      and we&apos;ll help you decide.
                    </p>
                  </div>

                  {/* Feature Checklist Header with Skip button */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      margin: "18px 0 8px",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                      Relevant Features for {form.selectedCategory}
                    </span>
                    <button
                      type="button"
                      onClick={skipFeatures}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 12,
                        color: "var(--muted)",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      Skip this part
                    </button>
                  </div>

                  {/* Dynamic Relevant Features Grid */}
                  <div className="builder-feature-grid">
                    {(activeCategory.features || []).map((feat: string) => {
                      const isSelected = form.selectedFeatures.includes(feat);
                      const note = activeCategory.featureNotes?.[feat];
                      return (
                        <div
                          key={feat}
                          className={`builder-feature-card ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleFeature(feat)}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              toggleFeature(feat);
                            }
                          }}
                        >
                          <div>
                            <div className="builder-feature-label">{feat}</div>
                            {note && <div className="builder-feature-sub">{note}</div>}
                          </div>
                          <div className="builder-checkbox-box">
                            {isSelected ? "✓" : ""}
                          </div>
                        </div>
                      );
                    })}

                    {/* Standard: Other Feature Option */}
                    <div
                      className={`builder-feature-card ${form.includeOtherFeature ? "selected" : ""}`}
                      onClick={() =>
                        update("includeOtherFeature", !form.includeOtherFeature)
                      }
                      role="checkbox"
                      aria-checked={form.includeOtherFeature}
                      tabIndex={0}
                    >
                      <div>
                        <div className="builder-feature-label">
                          Other Feature — Tell Us What You Need
                        </div>
                        <div className="builder-feature-sub">
                          Add a custom feature or requirement
                        </div>
                      </div>
                      <div className="builder-checkbox-box">
                        {form.includeOtherFeature ? "✓" : ""}
                      </div>
                    </div>

                    {/* Standard: Not Sure Help Me Decide */}
                    <div
                      className={`builder-feature-card ${form.includeNotSureFeature ? "selected" : ""}`}
                      onClick={() =>
                        update("includeNotSureFeature", !form.includeNotSureFeature)
                      }
                      role="checkbox"
                      aria-checked={form.includeNotSureFeature}
                      tabIndex={0}
                    >
                      <div>
                        <div className="builder-feature-label">
                          Not Sure — Help Me Decide
                        </div>
                        <div className="builder-feature-sub">
                          We will recommend the best features for you
                        </div>
                      </div>
                      <div className="builder-checkbox-box">
                        {form.includeNotSureFeature ? "✓" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Other Feature Text Field when checked */}
                  {form.includeOtherFeature && (
                    <div style={{ marginBottom: 20 }}>
                      <label>
                        Describe your custom feature:
                        <input
                          type="text"
                          value={form.otherFeatureText}
                          onChange={(e) => update("otherFeatureText", e.target.value)}
                          placeholder="e.g. Real-time calendar sync, custom calculator, member portal..."
                        />
                      </label>
                    </div>
                  )}

                  {/* DESIGN PREFERENCE */}
                  <div style={{ margin: "28px 0 16px", paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      What style would you like?
                    </div>
                    <p style={{ margin: "0 0 10px 0", fontSize: 12.5, color: "var(--muted)" }}>
                      These are preferences to guide our design direction.
                    </p>

                    <div className="builder-radio-group">
                      {designStyles.map((style: any) => {
                        const isSelected = form.designStyle === style.label;
                        return (
                          <div
                            key={style.id || style.label}
                            className={`builder-radio-card ${isSelected ? "selected" : ""}`}
                            onClick={() => update("designStyle", style.label)}
                          >
                            <div className="builder-radio-title">{style.label}</div>
                            <div className="builder-radio-desc">{style.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* If Inspired by a website is chosen: optional reference link */}
                    {form.designStyle === "Inspired by a Website" && (
                      <label style={{ display: "block", marginTop: 10 }}>
                        Reference Website URL (Optional)
                        <input
                          type="url"
                          value={form.referenceUrl}
                          onChange={(e) => update("referenceUrl", e.target.value)}
                          placeholder="https://example.com"
                        />
                      </label>
                    )}
                  </div>

                  {/* OPTIONAL WEBSITE DETAILS */}
                  <div style={{ margin: "24px 0 16px", paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                    <div className="form-grid">
                      {/* Existing Website Question */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                          Do you already have a website?
                        </div>
                        <div className="pill-toggle-group">
                          {[
                            "No, I need a new website.",
                            "Yes, I want to improve my existing website.",
                          ].map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              className={`pill-toggle-btn ${form.hasExistingWebsite === choice ? "selected" : ""}`}
                              onClick={() => update("hasExistingWebsite", choice)}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>

                        {form.hasExistingWebsite.includes("Yes") && (
                          <input
                            type="url"
                            value={form.existingWebsiteUrl}
                            onChange={(e) => update("existingWebsiteUrl", e.target.value)}
                            placeholder="https://mycurrentsite.com"
                            style={{ marginTop: 6 }}
                          />
                        )}
                      </div>

                      {/* Domain Name Question */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                          Do you already have a domain name?
                        </div>
                        <p style={{ margin: "0 0 6px 0", fontSize: 11.5, color: "var(--muted)" }}>
                          A domain name is your website address, like yourbusiness.com.
                        </p>
                        <div className="pill-toggle-group">
                          {["Yes", "No", "Not Sure"].map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              className={`pill-toggle-btn ${form.hasDomain === choice ? "selected" : ""}`}
                              onClick={() => update("hasDomain", choice)}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TIMELINE & BUDGET */}
                  <div style={{ margin: "24px 0 16px", paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                    <div className="form-grid">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                          When would you like your website ready?
                        </div>
                        <p style={{ margin: "0 0 6px 0", fontSize: 11.5, color: "var(--muted)" }}>
                          Preferences, not promised delivery dates.
                        </p>
                        <div className="pill-toggle-group">
                          {timelineChoices.map((t: string) => (
                            <button
                              key={t}
                              type="button"
                              className={`pill-toggle-btn ${form.timeline === t ? "selected" : ""}`}
                              onClick={() => update("timeline", t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                          Do you have a budget in mind? (Optional)
                        </div>
                        <p style={{ margin: "0 0 6px 0", fontSize: 11.5, color: "var(--muted)" }}>
                          Help us tailor our proposal. No advance payment required.
                        </p>
                        <div className="pill-toggle-group">
                          {budgetChoices.map((b: string) => (
                            <button
                              key={b}
                              type="button"
                              className={`pill-toggle-btn ${form.budget === b ? "selected" : ""}`}
                              onClick={() => update("budget", b)}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PROJECT IDEA */}
                  <div style={{ margin: "24px 0 16px", paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                    <label style={{ display: "block" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                        Tell us a little about your idea
                      </div>
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={form.description}
                        onChange={(e) => update("description", e.target.value)}
                        placeholder="I have a clothing brand and want a website to show my products and let customers contact me through WhatsApp."
                        style={{ width: "100%", fontSize: 13, lineHeight: 1.6 }}
                      />
                      <small style={{ color: "var(--muted)", fontSize: 11, display: "block", marginTop: 4 }}>
                        Optional if you&apos;ve selected sufficient choices, but a short sentence helps us understand your vision.
                      </small>
                    </label>
                  </div>

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
                      <ArrowLeft size={16} /> Back to Step 1
                    </button>

                    <button type="submit" className="button">
                      Continue to Step 3: Contact Details <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ==============================================================
                  STEP 3 — HOW CAN WE CONTACT YOU?
                  ============================================================== */}
              {step === 2 && (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        color: "var(--accent)",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Step 3 · Final Step
                    </div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 22 }}>
                      How can we contact you?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      Where should we send your project proposal and tracking details?
                    </p>
                  </div>

                  {/* Core Required Contact Fields */}
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
                      Mobile / WhatsApp Number *
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          style={{ width: 85, textAlign: "center" }}
                          value={form.countryCode}
                          onChange={(e) => update("countryCode", e.target.value)}
                          placeholder="+91"
                        />
                        <input
                          required
                          type="tel"
                          autoComplete="tel"
                          style={{ flex: 1 }}
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="e.g. 9876543210"
                        />
                      </div>
                    </label>

                    <label>
                      Preferred Contact Method
                      <select
                        value={form.preferredContact}
                        onChange={(e) => update("preferredContact", e.target.value)}
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Email">Email</option>
                      </select>
                    </label>
                  </div>

                  {/* Enquiring for Myself or Business */}
                  <div style={{ margin: "16px 0" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
                      Are you enquiring for yourself or a business?
                    </div>
                    <div className="pill-toggle-group">
                      <button
                        type="button"
                        className={`pill-toggle-btn ${!form.isBusiness ? "selected" : ""}`}
                        onClick={() => update("isBusiness", false)}
                      >
                        For Myself
                      </button>
                      <button
                        type="button"
                        className={`pill-toggle-btn ${form.isBusiness ? "selected" : ""}`}
                        onClick={() => update("isBusiness", true)}
                      >
                        For My Business / Organization
                      </button>
                    </div>

                    {form.isBusiness && (
                      <label style={{ display: "block", marginTop: 8 }}>
                        Business / Brand Name *
                        <input
                          required
                          type="text"
                          value={form.businessName}
                          onChange={(e) => update("businessName", e.target.value)}
                          placeholder="e.g. Bloom Apparel, Apex Logistics..."
                        />
                      </label>
                    )}
                  </div>

                  {/* Collapsible Optional Contact Info */}
                  <div style={{ margin: "14px 0" }}>
                    <button
                      type="button"
                      className="collapsible-trigger"
                      onClick={() => setShowOptionalContact(!showOptionalContact)}
                    >
                      <span>
                        {showOptionalContact
                          ? "Hide optional details"
                          : "+ Add location, existing website, or additional message (Optional)"}
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: showOptionalContact ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>

                    {showOptionalContact && (
                      <div style={{ background: "var(--panel)", padding: 16, borderRadius: 8, marginBottom: 14 }}>
                        <div className="form-grid">
                          <label>
                            City / Location (Optional)
                            <input
                              type="text"
                              value={form.city}
                              onChange={(e) => update("city", e.target.value)}
                              placeholder="e.g. Hyderabad, India"
                            />
                          </label>

                          <label>
                            Existing Website (Optional)
                            <input
                              type="url"
                              value={form.existingWebsiteUrl}
                              onChange={(e) => update("existingWebsiteUrl", e.target.value)}
                              placeholder="https://example.com"
                            />
                          </label>
                        </div>

                        <label style={{ display: "block", marginTop: 10 }}>
                          Additional Message (Optional)
                          <textarea
                            rows={2}
                            maxLength={3000}
                            value={form.additionalMessage}
                            onChange={(e) => update("additionalMessage", e.target.value)}
                            placeholder="Any other specific requests or notes for our team..."
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Concise Review Summary Card */}
                  <div className="enquiry-summary-card">
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--text)" }}>
                      Review Your Enquiry:
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.6 }}>
                      <div><b>Website Type:</b> {form.selectedCategory}</div>
                      <div>
                        <b>Features:</b>{" "}
                        {form.selectedFeatures.length > 0
                          ? form.selectedFeatures.join(", ")
                          : "General consultation / Not specified"}
                        {form.includeOtherFeature ? " (+ Custom feature)" : ""}
                      </div>
                      <div><b>Design Style:</b> {form.designStyle}</div>
                      <div><b>Timeline / Budget:</b> {form.timeline} · {form.budget}</div>
                      <div><b>Contact:</b> {form.name} ({form.email}, {form.countryCode} {form.phone})</div>
                    </div>
                  </div>

                  {/* Single Clear Consent Checkbox */}
                  <label className="check" style={{ marginTop: 16, marginBottom: 16 }}>
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                    />
                    <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      I agree to receive a project proposal and tracking updates from SANJU X DEV. Your details are strictly confidential and will never be shared.{" "}
                      <Link to="/privacy" style={{ textDecoration: "underline", color: "var(--accent)" }}>
                        Privacy Policy
                      </Link>
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
                      onClick={() => setStep(1)}
                      className="button secondary"
                    >
                      <ArrowLeft size={16} /> Back to Step 2
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
