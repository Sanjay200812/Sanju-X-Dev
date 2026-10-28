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
  PRIMARY_OBJECTIVES,
  CATEGORY_OBJECTIVES_MAP,
  getCategoryFeatureHeading,
  type WebsiteCategory,
} from "./content";

export function EnquiryBuilder({
  isHomepageSection = false,
}: {
  isHomepageSection?: boolean;
}) {
  const s = useSite();
  const [params] = useSearchParams();

  // 3-step builder: 0 = Category, 1 = Objectives & Features, 2 = Contact Details
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Available categories from site config or defaults
  const categories: WebsiteCategory[] = useMemo(() => {
    const fromSite = (s as any).websiteCategories;
    if (Array.isArray(fromSite) && fromSite.length > 0) {
      return fromSite.filter((c: any) => c.enabled !== false);
    }
    return DEFAULT_WEBSITE_CATEGORIES;
  }, [s]);

  // Options
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

  // Initial category from URL param (if navigated via Spideyy suggestion)
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
    return ""; // Requirement: No category selected by default
  }, [params, categories]);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Category
    selectedCategory: initialCategory,
    customCategoryText: "",

    // Step 2: Objectives & Features
    selectedObjectives: [] as string[],
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

  // Relevant primary objectives for the chosen category
  const relevantObjectives = useMemo(() => {
    const catId = activeCategory.id || "business";
    const mapped = CATEGORY_OBJECTIVES_MAP[catId];
    if (Array.isArray(mapped) && mapped.length > 0) return mapped;
    return PRIMARY_OBJECTIVES;
  }, [activeCategory]);

  // Dynamic feature heading
  const dynamicFeatureHeading = useMemo(() => {
    return getCategoryFeatureHeading(activeCategory.label);
  }, [activeCategory.label]);

  // Toggle objective selection
  const toggleObjective = (obj: string) => {
    setForm((f) => {
      const exists = f.selectedObjectives.includes(obj);
      return {
        ...f,
        selectedObjectives: exists
          ? f.selectedObjectives.filter((item) => item !== obj)
          : [...f.selectedObjectives, obj],
      };
    });
  };

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
    const targetElement = document.getElementById(isHomepageSection ? "choose-website" : "enquiry-top");
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Step 2 -> Step 3 validation
  function handleGoToStep3(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setStep(2);
    const targetElement = document.getElementById(isHomepageSection ? "choose-website" : "enquiry-top");
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

      // Compile features and objectives list
      const compiledFeatures = [...form.selectedFeatures];
      if (form.selectedObjectives.length > 0) {
        form.selectedObjectives.forEach((obj) => {
          compiledFeatures.push(`Objective: ${obj}`);
        });
      }
      if (form.includeOtherFeature && form.otherFeatureText.trim()) {
        compiledFeatures.push(`Other: ${form.otherFeatureText.trim()}`);
      } else if (form.includeOtherFeature) {
        compiledFeatures.push("Other Feature — Custom requirement");
      }
      if (form.includeNotSureFeature) {
        compiledFeatures.push("Not Sure — Help Me Decide");
      }

      const categoryDescription =
        form.selectedCategory === "Other / Custom Website" && form.customCategoryText.trim()
          ? `${form.selectedCategory} (${form.customCategoryText.trim()})`
          : form.selectedCategory;

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
        service: categoryDescription,
        categories: [categoryDescription],
        features: compiledFeatures,
        design_preference: form.designStyle,
        reference_url: form.referenceUrl.trim(),
        has_existing_website: form.hasExistingWebsite,
        existing_website_url: form.existingWebsiteUrl.trim(),
        website_url: form.existingWebsiteUrl.trim(),
        has_domain: form.hasDomain,
        timeline: form.timeline,
        budget: form.budget,
        description: form.description.trim() || `Enquiry for ${categoryDescription}`,
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
      const targetElement = document.getElementById(isHomepageSection ? "choose-website" : "enquiry-top");
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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

  function renderCategoryIcon(id: string) {
    switch (id) {
      case "portfolio":
        return <User size={20} />;
      case "blog":
        return <BookOpen size={20} />;
      case "business":
        return <Building2 size={20} />;
      case "agency":
        return <Layers size={20} />;
      case "ecommerce":
        return <ShoppingBag size={20} />;
      case "restaurant":
        return <Utensils size={20} />;
      case "shop":
        return <Store size={20} />;
      case "educational":
        return <GraduationCap size={20} />;
      case "booking":
        return <Calendar size={20} />;
      case "custom":
        return <Code size={20} />;
      case "not_sure":
        return <HelpCircle size={20} />;
      default:
        return <Sparkles size={20} />;
    }
  }

  return (
    <div className="enquiry-builder-root" id="enquiry-top">
      {/* 3-Step Progress Indicator */}
      {!sent && (
        <div className="builder-steps" role="navigation" aria-label="Enquiry progress">
          <div
            className={`builder-step-pill ${step === 0 ? "active" : step > 0 ? "completed" : ""}`}
            onClick={() => setStep(0)}
            style={{ cursor: step > 0 ? "pointer" : "default" }}
          >
            <span className="builder-step-num">{step > 0 ? "✓" : "1"}</span>
            <span className="builder-step-label">Website Type</span>
          </div>
          <div
            className={`builder-step-pill ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}
            onClick={() => {
              if (form.selectedCategory) setStep(1);
            }}
            style={{ cursor: step > 1 ? "pointer" : "default" }}
          >
            <span className="builder-step-num">{step > 1 ? "✓" : "2"}</span>
            <span className="builder-step-label">Objectives & Features</span>
          </div>
          <div
            className={`builder-step-pill ${step === 2 ? "active" : ""}`}
          >
            <span className="builder-step-num">3</span>
            <span className="builder-step-label">Contact Details</span>
          </div>
        </div>
      )}

      {/* CONFIRMATION SCREEN */}
      {sent ? (
        <div className="builder-confirmation-panel">
          <span className="eyebrow confirmation-eyebrow">
            Enquiry Received Successfully
          </span>
          <h2 className="confirmation-title">
            Thank You! We&apos;ve Received Your Request.
          </h2>
          <p className="confirmation-desc">
            Your project enquiry has been submitted. A confirmation with your tracking code has been dispatched to{" "}
            <strong>{form.email}</strong>.
          </p>

          <div className="confirmation-badge-box">
            <span className="confirmation-badge-label">Your Unique Tracking Code</span>
            <div className="confirmation-code-display">{trackingCode}</div>
            <p className="confirmation-code-note">
              Use this code anytime to monitor progress, milestones, and delivery status.
            </p>

            <button
              type="button"
              onClick={copyTrackingId}
              className="confirmation-copy-btn"
            >
              {copied ? (
                <>
                  <Check size={16} style={{ color: "#25d366" }} />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Tracking Code</span>
                </>
              )}
            </button>
          </div>

          <div className="confirmation-actions">
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
          {/* ================================================================
              STEP 1 — SELECT WEBSITE TYPE
              ================================================================ */}
          {step === 0 && (
            <form onSubmit={handleGoToStep2} className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 1 of 3</span>
                <h3 className="builder-step-title">
                  What Kind of Website Do You Need?
                </h3>
                <p className="builder-step-sub">
                  Choose what you&apos;re planning to create. We&apos;ll help with the rest.
                </p>
              </div>

              {/* 11 Selectable Category Cards Grid (2-Column Desktop, 1-Column Mobile) */}
              <div className="builder-categories-grid" role="radiogroup" aria-label="Website Categories">
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
                      <div className="builder-cat-header">
                        <div className="builder-cat-icon">
                          {renderCategoryIcon(cat.id)}
                        </div>
                        {/* Radio selection indicator */}
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>

                      <div className="builder-cat-body">
                        <h4 className="builder-cat-title">{cat.label}</h4>
                        <p className="builder-cat-desc">{cat.desc}</p>
                      </div>

                      {cat.examples && cat.examples.length > 0 && (
                        <div className="builder-cat-examples">
                          <span className="builder-examples-label">Examples:</span>
                          <div className="builder-examples-tags">
                            {cat.examples.map((ex: string, idx: number) => (
                              <span key={idx} className="builder-example-tag">
                                {ex}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conditional custom project description field for Other / Custom Website */}
              {form.selectedCategory === "Other / Custom Website" && (
                <div className="builder-custom-category-box">
                  <label>
                    <span className="builder-custom-label">
                      Describe your custom website or unique concept:
                    </span>
                    <input
                      type="text"
                      className="builder-input"
                      placeholder="e.g. Real Estate Portal, Community Network, Specialized Booking Utility..."
                      value={form.customCategoryText}
                      onChange={(e) => update("customCategoryText", e.target.value)}
                    />
                  </label>
                </div>
              )}

              {status && (
                <p role="alert" className="builder-status-alert">
                  {status}
                </p>
              )}

              <div className="builder-step-actions">
                <button
                  type="submit"
                  className="button builder-continue-btn"
                  disabled={!form.selectedCategory}
                >
                  {form.selectedCategory
                    ? `Continue to Step 2: What Should Your Website Do?`
                    : "Select a Website Type to Continue"}{" "}
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          {/* ================================================================
              STEP 2 — WHAT SHOULD YOUR WEBSITE DO? & FEATURES
              ================================================================ */}
          {step === 1 && (
            <form onSubmit={handleGoToStep3} className="builder-step-form">
              {/* PRIMARY OBJECTIVES (MATCHING CODEXA INTERACTION REFERENCE) */}
              <div className="builder-step-header">
                <span className="eyebrow">
                  Step 2 · For {form.selectedCategory}
                </span>
                <h3 className="builder-step-title">
                  What Should Your Website Do?
                </h3>
                <p className="builder-step-sub">
                  Choose the things you&apos;d like your website to help with.
                </p>
              </div>

              {/* Primary Objectives Checkbox Grid */}
              <div className="builder-objectives-grid" role="group" aria-label="Primary Objectives">
                {relevantObjectives.map((obj) => {
                  const isChecked = form.selectedObjectives.includes(obj);
                  return (
                    <div
                      key={obj}
                      className={`builder-objective-card ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleObjective(obj)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggleObjective(obj);
                        }
                      }}
                    >
                      <span className="builder-objective-name">{obj}</span>
                      <div className={`builder-checkbox-box ${isChecked ? "checked" : ""}`}>
                        {isChecked && "✓"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CATEGORY-SPECIFIC FEATURE SELECTION */}
              <div className="builder-features-section">
                <div className="builder-features-header">
                  <div>
                    <h4 className="builder-features-title">
                      {dynamicFeatureHeading}
                    </h4>
                    <p className="builder-features-sub">
                      Select specific features you want included.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={skipFeatures}
                    className="builder-skip-link"
                  >
                    Skip this part
                  </button>
                </div>

                <div className="builder-feature-grid" role="group" aria-label="Features">
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
                        <div className="builder-feature-info">
                          <span className="builder-feature-label">{feat}</span>
                          {note && (
                            <span className="builder-feature-sub">{note}</span>
                          )}
                        </div>
                        <div className={`builder-checkbox-box ${isSelected ? "checked" : ""}`}>
                          {isSelected && "✓"}
                        </div>
                      </div>
                    );
                  })}

                  {/* Other Feature Option */}
                  <div
                    className={`builder-feature-card ${form.includeOtherFeature ? "selected" : ""}`}
                    onClick={() =>
                      update("includeOtherFeature", !form.includeOtherFeature)
                    }
                    role="checkbox"
                    aria-checked={form.includeOtherFeature}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        update("includeOtherFeature", !form.includeOtherFeature);
                      }
                    }}
                  >
                    <div className="builder-feature-info">
                      <span className="builder-feature-label">
                        Other Feature — Tell Us What You Need
                      </span>
                      <span className="builder-feature-sub">
                        Add a custom feature or requirement
                      </span>
                    </div>
                    <div className={`builder-checkbox-box ${form.includeOtherFeature ? "checked" : ""}`}>
                      {form.includeOtherFeature && "✓"}
                    </div>
                  </div>

                  {/* Not Sure Help Me Decide Option */}
                  <div
                    className={`builder-feature-card ${form.includeNotSureFeature ? "selected" : ""}`}
                    onClick={() =>
                      update("includeNotSureFeature", !form.includeNotSureFeature)
                    }
                    role="checkbox"
                    aria-checked={form.includeNotSureFeature}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        update("includeNotSureFeature", !form.includeNotSureFeature);
                      }
                    }}
                  >
                    <div className="builder-feature-info">
                      <span className="builder-feature-label">
                        Not Sure — Help Me Decide
                      </span>
                      <span className="builder-feature-sub">
                        We will suggest the best features for your goals
                      </span>
                    </div>
                    <div className={`builder-checkbox-box ${form.includeNotSureFeature ? "checked" : ""}`}>
                      {form.includeNotSureFeature && "✓"}
                    </div>
                  </div>
                </div>

                {form.includeOtherFeature && (
                  <div className="builder-other-feature-input-wrap">
                    <label>
                      <span className="builder-custom-label">
                        Describe your custom feature or capability:
                      </span>
                      <input
                        type="text"
                        className="builder-input"
                        value={form.otherFeatureText}
                        onChange={(e) => update("otherFeatureText", e.target.value)}
                        placeholder="e.g. Real-time calendar sync, custom pricing calculator, member portal..."
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* DESIGN & PROJECT PREFERENCES */}
              <div className="builder-preferences-section">
                <h4 className="builder-preferences-title">
                  Design & Project Preferences (Optional)
                </h4>

                <div className="builder-pref-block">
                  <span className="builder-pref-label">What design aesthetic do you prefer?</span>
                  <div className="builder-radio-group">
                    {designStyles.map((style: any) => {
                      const isSelected = form.designStyle === style.label;
                      return (
                        <div
                          key={style.id || style.label}
                          className={`builder-radio-card ${isSelected ? "selected" : ""}`}
                          onClick={() => update("designStyle", style.label)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              update("designStyle", style.label);
                            }
                          }}
                        >
                          <span className="builder-radio-title">{style.label}</span>
                          <span className="builder-radio-desc">{style.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {form.designStyle === "Inspired by a Website" && (
                    <div style={{ marginTop: 10 }}>
                      <label>
                        <span className="builder-custom-label">Reference Website URL:</span>
                        <input
                          type="url"
                          className="builder-input"
                          value={form.referenceUrl}
                          onChange={(e) => update("referenceUrl", e.target.value)}
                          placeholder="https://example.com"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="form-grid" style={{ marginTop: 18 }}>
                  <div>
                    <span className="builder-pref-label">Do you already have a website?</span>
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
                        className="builder-input"
                        value={form.existingWebsiteUrl}
                        onChange={(e) => update("existingWebsiteUrl", e.target.value)}
                        placeholder="https://mycurrentsite.com"
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </div>

                  <div>
                    <span className="builder-pref-label">Timeline preference:</span>
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
                </div>

                <div style={{ marginTop: 16 }}>
                  <span className="builder-pref-label">Do you have a budget in mind?</span>
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

                <div style={{ marginTop: 16 }}>
                  <label>
                    <span className="builder-pref-label">Tell us a short sentence about your idea (Optional):</span>
                    <textarea
                      rows={2}
                      maxLength={5000}
                      className="builder-textarea"
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="e.g. I run a boutique bakery in Bangalore and want a website to showcase our menu and let customers place weekend orders over WhatsApp."
                    />
                  </label>
                </div>
              </div>

              {status && (
                <p role="alert" className="builder-status-alert">
                  {status}
                </p>
              )}

              <div className="builder-step-actions split">
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

          {/* ================================================================
              STEP 3 — CUSTOMER INFORMATION & SUBMISSION
              ================================================================ */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 3 of 3 · Final Step</span>
                <h3 className="builder-step-title">
                  Tell Us How to Reach You
                </h3>
                <p className="builder-step-sub">
                  Where should we send your project proposal and tracking details?
                </p>
              </div>

              {/* Required Contact Fields */}
              <div className="form-grid">
                <label>
                  <span>Your Full Name *</span>
                  <input
                    required
                    type="text"
                    autoComplete="name"
                    className="builder-input"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Sanjay Verma"
                  />
                </label>

                <label>
                  <span>Email Address *</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className="builder-input"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="e.g. sanjay@example.com"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  <span>Mobile / WhatsApp Number *</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="builder-input"
                      style={{ width: 85, textAlign: "center" }}
                      value={form.countryCode}
                      onChange={(e) => update("countryCode", e.target.value)}
                      placeholder="+91"
                    />
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      className="builder-input"
                      style={{ flex: 1 }}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </label>

                <label>
                  <span>Preferred Contact Method</span>
                  <select
                    className="builder-select"
                    value={form.preferredContact}
                    onChange={(e) => update("preferredContact", e.target.value)}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Email">Email</option>
                  </select>
                </label>
              </div>

              {/* Individual vs Business */}
              <div style={{ margin: "14px 0" }}>
                <span className="builder-pref-label">Are you enquiring for yourself or a business?</span>
                <div className="pill-toggle-group">
                  <button
                    type="button"
                    className={`pill-toggle-btn ${!form.isBusiness ? "selected" : ""}`}
                    onClick={() => update("isBusiness", false)}
                  >
                    For Myself / Individual
                  </button>
                  <button
                    type="button"
                    className={`pill-toggle-btn ${form.isBusiness ? "selected" : ""}`}
                    onClick={() => update("isBusiness", true)}
                  >
                    For My Business / Brand
                  </button>
                </div>

                {form.isBusiness && (
                  <label style={{ display: "block", marginTop: 8 }}>
                    <span>Business / Brand Name *</span>
                    <input
                      required
                      type="text"
                      className="builder-input"
                      value={form.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                      placeholder="e.g. Studio Luxe, Apex Innovations..."
                    />
                  </label>
                )}
              </div>

              {/* Collapsible Optional Details */}
              <div style={{ margin: "14px 0" }}>
                <button
                  type="button"
                  className="collapsible-trigger"
                  onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                >
                  <span>
                    {showOptionalDetails
                      ? "Hide optional details"
                      : "+ Add location, existing website, or additional message (Optional)"}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: showOptionalDetails ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {showOptionalDetails && (
                  <div className="builder-optional-panel">
                    <div className="form-grid">
                      <label>
                        <span>City / Location</span>
                        <input
                          type="text"
                          className="builder-input"
                          value={form.city}
                          onChange={(e) => update("city", e.target.value)}
                          placeholder="e.g. Bangalore, India"
                        />
                      </label>

                      <label>
                        <span>Existing Website URL</span>
                        <input
                          type="url"
                          className="builder-input"
                          value={form.existingWebsiteUrl}
                          onChange={(e) => update("existingWebsiteUrl", e.target.value)}
                          placeholder="https://example.com"
                        />
                      </label>
                    </div>

                    <label style={{ display: "block", marginTop: 8 }}>
                      <span>Additional Requirements or Notes</span>
                      <textarea
                        rows={2}
                        maxLength={3000}
                        className="builder-textarea"
                        value={form.additionalMessage}
                        onChange={(e) => update("additionalMessage", e.target.value)}
                        placeholder="Any additional notes or specific questions for Sanjay..."
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Review Summary Card */}
              <div className="enquiry-summary-card">
                <div className="enquiry-summary-title">Review Your Enquiry:</div>
                <div className="enquiry-summary-grid">
                  <div>
                    <b>Website Type:</b> {form.selectedCategory}
                    {form.customCategoryText ? ` (${form.customCategoryText})` : ""}
                  </div>
                  {form.selectedObjectives.length > 0 && (
                    <div>
                      <b>Primary Objectives:</b> {form.selectedObjectives.join(", ")}
                    </div>
                  )}
                  <div>
                    <b>Features:</b>{" "}
                    {form.selectedFeatures.length > 0
                      ? form.selectedFeatures.join(", ")
                      : "General scoping / Not specified"}
                    {form.includeOtherFeature ? " (+ Custom feature)" : ""}
                  </div>
                  <div>
                    <b>Style & Timeline:</b> {form.designStyle} · {form.timeline} · {form.budget}
                  </div>
                  <div>
                    <b>Contact:</b> {form.name} ({form.email}, {form.countryCode} {form.phone})
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <label className="check builder-consent-check">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                <span className="builder-consent-text">
                  I agree to receive a project proposal and tracking updates from SANJU X DEV. Your details are strictly confidential and will never be shared.{" "}
                  <Link to="/privacy" style={{ textDecoration: "underline", color: "var(--accent)" }}>
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Honeypot */}
              <label className="honeypot" aria-hidden="true" style={{ display: "none" }}>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </label>

              {status && (
                <p role="alert" className="builder-status-alert">
                  {status}
                </p>
              )}

              <div className="builder-step-actions split">
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
  );
}

export default function Contact() {
  const s = useSite();

  return (
    <section className="page wrap enquiry-page-wrap">
      <span className="eyebrow">Start a project</span>
      <h1 className="enquiry-page-headline">Let&apos;s Build Your Website</h1>
      <p className="enquiry-page-sub">
        Choose what you&apos;re planning to create. We&apos;ll help with the rest.
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
            complex setups. We handle the full digital architecture so you
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

        {/* Right Column: Shared Enquiry Builder */}
        <div className="form-panel">
          <EnquiryBuilder />
        </div>
      </div>
    </section>
  );
}
