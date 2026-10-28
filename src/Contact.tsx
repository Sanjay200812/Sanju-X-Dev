import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  BookOpen,
  Building2,
  Layers,
  ShoppingBag,
  Utensils,
  Store,
  GraduationCap,
  Calendar,
  Code,
  HelpCircle,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { useSite, Arrow } from "./App";
import { MailIcon } from "./Decorations";
import {
  DEFAULT_WEBSITE_CATEGORIES,
  PRIMARY_PURPOSE_OPTIONS,
  LOGIN_OPTIONS,
  LOGIN_SECURITY_OPTIONS,
  DASHBOARD_OPTIONS,
  DATA_STORAGE_OPTIONS,
  DESIGN_STYLES,
  ANIMATION_LEVELS,
  PAGE_COUNT_OPTIONS,
  DESIGN_MIND_OPTIONS,
  TIMELINE_CHOICES,
  BUDGET_CHOICES,
  getCategoryFeatureHeading,
  getWhatsAppEnquiryUrl,
  SANJU_BUSINESS_PHONE,
  SANJU_WHATSAPP_NUMBER,
  type WebsiteCategory,
} from "./content";

export function EnquiryBuilder({
  isHomepageSection = false,
}: {
  isHomepageSection?: boolean;
}) {
  const s = useSite();
  const [params] = useSearchParams();

  // Exactly 4 steps: 0 = Choose Website, 1 = Features & Functionality, 2 = Design & Preferences, 3 = Contact & Submit
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);

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

  // Initial category from URL param (e.g. from Spideyy AI suggestion chip)
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
    return ""; // Mandatory rule: No category selected by default
  }, [params, categories]);

  // Form State across all 4 steps
  const [form, setForm] = useState({
    // Step 1: Website & Purpose
    selectedCategory: initialCategory,
    customCategoryText: "",
    selectedPurposes: [] as string[],
    otherPurposeText: "",

    // Step 2: Features & Functionality
    selectedFeatures: [] as string[],
    otherFeatureText: "",
    includeOtherFeature: false,
    includeNotSureFeature: false,
    loginOption: "", // "none", "email_password", "google", "mobile_otp", "email_otp", "multiple", "not_sure"
    loginSecurity: [] as string[],
    dashboardOption: "", // "none", "admin", "customer", "both", "multi_role", "not_sure"
    dataStorage: "", // "no", "yes", "not_sure"

    // Step 3: Design & Preferences
    designStyle: "",
    animationLevel: "",
    pageCount: "",
    designMind: "",
    figmaUrl: "",
    referenceUrl: "",
    designNotes: "",
    timeline: "Flexible",
    budget: "Not Sure",

    // Step 4: Contact & Submit
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    whatsappPhone: "",
    sameAsPhone: true,
    city: "",
    isBusiness: false,
    businessName: "",
    preferredContact: "WhatsApp",
    existingWebsiteUrl: "",
    additionalMessage: "",
    consent: false,
    website: "", // Honeypot
  });

  // Auto-Save Form Progress: Restore temporary draft from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("sxd_enquiry_draft_v4");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setForm((prev) => ({
            ...prev,
            ...parsed,
            selectedCategory: initialCategory || parsed.selectedCategory || "",
            website: "",
          }));
        }
      }
    } catch {
      /* ignore storage errors */
    }
  }, [initialCategory]);

  // Auto-Save Form Progress: Persist changes to sessionStorage
  useEffect(() => {
    try {
      const safeState: Record<string, unknown> = { ...form };
      delete safeState.website;
      sessionStorage.setItem("sxd_enquiry_draft_v4", JSON.stringify(safeState));
    } catch {
      /* ignore storage errors */
    }
  }, [form]);

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

  // Dynamic feature heading for chosen category
  const dynamicFeatureHeading = useMemo(() => {
    return getCategoryFeatureHeading(activeCategory.label);
  }, [activeCategory.label]);

  // Toggle purpose
  const togglePurpose = (purp: string) => {
    setForm((f) => {
      const exists = f.selectedPurposes.includes(purp);
      return {
        ...f,
        selectedPurposes: exists
          ? f.selectedPurposes.filter((item) => item !== purp)
          : [...f.selectedPurposes, purp],
      };
    });
  };

  // Toggle feature
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

  // Toggle login security
  const toggleLoginSecurity = (sec: string) => {
    setForm((f) => {
      const exists = f.loginSecurity.includes(sec);
      return {
        ...f,
        loginSecurity: exists
          ? f.loginSecurity.filter((item) => item !== sec)
          : [...f.loginSecurity, sec],
      };
    });
  };

  const scrollToTop = () => {
    const targetElement = document.getElementById(
      isHomepageSection ? "choose-website" : "enquiry-top",
    );
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Step 1 -> Step 2 validation
  function handleGoToStep2(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.selectedCategory) {
      setStatus("Please select a website type to continue.");
      return;
    }
    if (form.selectedPurposes.length === 0) {
      setStatus("Please choose at least one primary purpose (or select 'Not Sure') to continue.");
      return;
    }
    setStatus("");
    setStep(1);
    scrollToTop();
  }

  // Step 2 -> Step 3 validation
  function handleGoToStep3(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const hasFeature =
      form.selectedFeatures.length > 0 ||
      form.includeNotSureFeature ||
      form.includeOtherFeature;
    if (!hasFeature) {
      setStatus("Please choose at least one website feature or select 'Not Sure — Help Me Decide'.");
      return;
    }
    if (!form.loginOption) {
      setStatus("Please choose a login preference (or select 'No Login Needed' / 'Not Sure').");
      return;
    }
    if (!form.dashboardOption) {
      setStatus("Please choose a dashboard preference (or select 'No Dashboard' / 'Not Sure').");
      return;
    }
    if (!form.dataStorage) {
      setStatus("Please indicate if your website needs to save information (or select 'Not Sure').");
      return;
    }
    setStatus("");
    setStep(2);
    scrollToTop();
  }

  // Step 3 -> Step 4 validation
  function handleGoToStep4(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.designStyle) {
      setStatus("Please select a design style (or choose 'Not Sure — Suggest One').");
      return;
    }
    if (!form.animationLevel) {
      setStatus("Please choose an animation preference (or select 'Not Sure').");
      return;
    }
    if (!form.pageCount) {
      setStatus("Please choose an estimated page count (or select 'Not Sure').");
      return;
    }
    if (!form.designMind) {
      setStatus("Please select whether you already have a design in mind (or select 'Not Sure').");
      return;
    }
    setStatus("");
    setStep(3);
    scrollToTop();
  }

  // Final Step 4 Submission Handler (Handles both Submit & Finalize and Submit & Continue on WhatsApp)
  async function handleSubmit(continueOnWhatsApp: boolean = false) {
    if (busy) return; // Idempotency protection

    // Validation
    if (!form.name.trim() || form.name.trim().length < 2) {
      setStatus("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setStatus("Please enter a valid email address.");
      return;
    }
    if (!form.phone.trim() || form.phone.trim().replace(/\D/g, "").length < 6) {
      setStatus("Please enter a valid mobile number.");
      return;
    }
    const waNumberToCheck = form.sameAsPhone ? form.phone : form.whatsappPhone;
    if (!waNumberToCheck.trim() || waNumberToCheck.trim().replace(/\D/g, "").length < 6) {
      setStatus("Please enter a valid WhatsApp number (or check 'Same as Mobile Number').");
      return;
    }
    if (!form.city.trim()) {
      setStatus("Please enter your city or location.");
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
      const fullPhone = `${form.countryCode} ${form.phone.trim()}`;
      const fullWhatsApp = form.sameAsPhone
        ? fullPhone
        : `${form.countryCode} ${form.whatsappPhone.trim()}`;

      // Compile features and requirements list
      const compiledFeatures = [...form.selectedFeatures];
      if (form.selectedPurposes.length > 0) {
        compiledFeatures.push(`Primary Purposes: ${form.selectedPurposes.join(", ")}`);
      }
      if (form.loginOption) {
        const loginObj = LOGIN_OPTIONS.find((o) => o.id === form.loginOption);
        compiledFeatures.push(`Login Requirement: ${loginObj?.label || form.loginOption}`);
      }
      if (form.loginSecurity.length > 0) {
        compiledFeatures.push(`Login Security: ${form.loginSecurity.join(", ")}`);
      }
      if (form.dashboardOption) {
        const dashObj = DASHBOARD_OPTIONS.find((o) => o.id === form.dashboardOption);
        compiledFeatures.push(`Dashboard: ${dashObj?.label || form.dashboardOption}`);
      }
      if (form.dataStorage) {
        compiledFeatures.push(`Data Storage: ${form.dataStorage.toUpperCase()}`);
      }
      if (form.animationLevel) {
        compiledFeatures.push(`Animation Level: ${form.animationLevel}`);
      }
      if (form.pageCount) {
        compiledFeatures.push(`Page Count: ${form.pageCount}`);
      }
      if (form.designMind) {
        compiledFeatures.push(`Design Mind: ${form.designMind}`);
      }
      if (form.figmaUrl.trim()) {
        compiledFeatures.push(`Figma URL: ${form.figmaUrl.trim()}`);
      }
      if (form.includeOtherFeature && form.otherFeatureText.trim()) {
        compiledFeatures.push(`Other Feature: ${form.otherFeatureText.trim()}`);
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
        whatsapp: fullWhatsApp,
        preferred_contact: form.preferredContact,
        company: form.isBusiness ? form.businessName.trim() : "",
        business_name: form.isBusiness ? form.businessName.trim() : "",
        is_business: form.isBusiness,
        is_individual: !form.isBusiness,
        service: categoryDescription,
        categories: [categoryDescription],
        features: compiledFeatures,
        primary_purpose: form.selectedPurposes.join(", "),
        login_option: form.loginOption,
        login_security: form.loginSecurity,
        dashboard_option: form.dashboardOption,
        data_storage: form.dataStorage,
        animation_preference: form.animationLevel,
        page_count: form.pageCount,
        existing_design_option: form.designMind,
        figma_url: form.figmaUrl.trim(),
        design_preference: form.designStyle,
        reference_url: form.referenceUrl.trim(),
        has_existing_website: form.existingWebsiteUrl.trim() ? "Yes" : "No",
        existing_website_url: form.existingWebsiteUrl.trim(),
        website_url: form.existingWebsiteUrl.trim(),
        timeline: form.timeline,
        budget: form.budget,
        description: `Project enquiry for ${categoryDescription}. Purposes: ${form.selectedPurposes.join(", ") || "General"}. Style: ${form.designStyle || "Clean"}.`,
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

      const generatedCode = d.trackingCode || "SXD-001";
      setTrackingCode(generatedCode);
      setSent(true);

      // Clear draft on successful submission
      sessionStorage.removeItem("sxd_enquiry_draft_v4");
      scrollToTop();

      // OPTION B: WhatsApp Handoff (Only opens after successful database save)
      if (continueOnWhatsApp) {
        const waUrl = getWhatsAppEnquiryUrl(generatedCode, categoryDescription);
        window.open(waUrl, "_blank", "noopener,noreferrer");
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

  const renderCategoryIcon = (catId?: string) => {
    switch (catId) {
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
      case "booking":
        return <Calendar size={20} />;
      case "educational":
        return <GraduationCap size={20} />;
      case "custom":
        return <Code size={20} />;
      case "not_sure":
      default:
        return <HelpCircle size={20} />;
    }
  };

  return (
    <div
      id={isHomepageSection ? "choose-website" : "enquiry-top"}
      className="builder-container"
    >
      {/* 4-Step Progress Indicator Header (01 -> 02 -> 03 -> 04) */}
      {!sent && (
        <div className="builder-progress-stepper" aria-label="Enquiry progress">
          <button
            type="button"
            className={`stepper-item ${step === 0 ? "active" : step > 0 ? "completed" : ""}`}
            onClick={() => step > 0 && setStep(0)}
          >
            <span className="stepper-num">01</span>
            <span className="stepper-label">Website Type</span>
          </button>
          <span className="stepper-arrow" aria-hidden="true">→</span>
          <button
            type="button"
            className={`stepper-item ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}
            onClick={() => step > 1 && setStep(1)}
          >
            <span className="stepper-num">02</span>
            <span className="stepper-label">Features & Functionality</span>
          </button>
          <span className="stepper-arrow" aria-hidden="true">→</span>
          <button
            type="button"
            className={`stepper-item ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}
            onClick={() => step > 2 && setStep(2)}
          >
            <span className="stepper-num">03</span>
            <span className="stepper-label">Design & Preferences</span>
          </button>
          <span className="stepper-arrow" aria-hidden="true">→</span>
          <button
            type="button"
            className={`stepper-item ${step === 3 ? "active" : ""}`}
            onClick={() => step > 3 && setStep(3)}
          >
            <span className="stepper-num">04</span>
            <span className="stepper-label">Contact & Submit</span>
          </button>
        </div>
      )}

      {/* Confirmation Screen */}
      {sent ? (
        <div className="builder-confirmation-card">
          <div className="washi-tape-strip top-center" aria-hidden="true" />
          <div className="confirmation-badge">
            <CheckCircle2 size={36} style={{ color: "#3b5f3d" }} />
          </div>
          <h3 className="confirmation-title">Your Enquiry Has Been Submitted!</h3>
          <p className="confirmation-sub">
            Thank you for choosing SANJU X DEV. We&apos;ll review your requirements and contact you.
          </p>

          <div className="confirmation-code-box">
            <span className="confirmation-code-label">Permanent Tracking ID</span>
            <div className="confirmation-code">{trackingCode}</div>
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
            <a
              href={getWhatsAppEnquiryUrl(trackingCode, form.selectedCategory || "Website Project")}
              target="_blank"
              rel="noreferrer"
              className="button button-whatsapp"
            >
              <MessageCircle size={16} /> Continue on WhatsApp
            </a>
            <Link to="/" className="button secondary">
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================
              STEP 1 — CHOOSE YOUR WEBSITE & PRIMARY PURPOSE
              ================================================================ */}
          {step === 0 && (
            <div className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 1 of 4</span>
                <h3 className="builder-step-title">
                  What Kind of Website Do You Need?
                </h3>
                <p className="builder-step-sub">
                  Choose the type of website you&apos;re planning. We&apos;ll help you with the rest.
                </p>
              </div>

              {/* 11 Selectable Category Cards Grid */}
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
                      Describe your custom website concept or unique requirement:
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

              {/* PRIMARY PURPOSE: "What should your website help you do?" */}
              {form.selectedCategory && (
                <div className="builder-substep-section">
                  <div className="builder-substep-header">
                    <h4 className="builder-substep-title">
                      What should your website help you do?
                    </h4>
                    <p className="builder-substep-desc">
                      Choose what you&apos;d like your website to help with. Select all that apply.
                    </p>
                  </div>

                  <div className="builder-objectives-grid" role="group" aria-label="Primary Purposes">
                    {PRIMARY_PURPOSE_OPTIONS.map((purp) => {
                      const isChecked = form.selectedPurposes.includes(purp);
                      return (
                        <div
                          key={purp}
                          className={`builder-objective-card ${isChecked ? "selected" : ""}`}
                          onClick={() => togglePurpose(purp)}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              togglePurpose(purp);
                            }
                          }}
                        >
                          <span className="builder-objective-name">{purp}</span>
                          <div className={`builder-checkbox-box ${isChecked ? "checked" : ""}`}>
                            {isChecked && "✓"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {form.selectedPurposes.includes("Something Else") && (
                    <div style={{ marginTop: 12 }}>
                      <input
                        type="text"
                        className="builder-input"
                        placeholder="Tell us what else your website should do..."
                        value={form.otherPurposeText}
                        onChange={(e) => update("otherPurposeText", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {status && (
                <p role="alert" className="builder-status-alert">
                  {status}
                </p>
              )}

              <div className="builder-step-actions">
                <button
                  type="button"
                  className="button"
                  disabled={!form.selectedCategory || form.selectedPurposes.length === 0}
                  onClick={() => handleGoToStep2()}
                >
                  Continue to Features & Functionality <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              STEP 2 — FEATURES & FUNCTIONALITY
              ================================================================ */}
          {step === 1 && (
            <div className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 2 of 4</span>
                <h3 className="builder-step-title">
                  What Features Would You Like?
                </h3>
                <p className="builder-step-sub">
                  Choose what you need. If you&apos;re not sure, we&apos;ll help you decide.
                </p>
              </div>

              {/* A. Category-Specific Features */}
              <div className="builder-features-section">
                <div className="builder-features-header">
                  <div>
                    <h4 className="builder-features-title">{dynamicFeatureHeading}</h4>
                    <p className="builder-features-sub">
                      Select specific features you want included (choose at least one or &apos;Not Sure&apos;).
                    </p>
                  </div>
                </div>

                <div className="builder-feature-grid" role="group" aria-label="Category Features">
                  {(activeCategory.features || []).map((feat: string) => {
                    const isSelected = form.selectedFeatures.includes(feat);
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
                        <span className="builder-feature-label">{feat}</span>
                        <div className={`builder-checkbox-box ${isSelected ? "checked" : ""}`}>
                          {isSelected && "✓"}
                        </div>
                      </div>
                    );
                  })}

                  {/* Other Feature Option */}
                  <div
                    className={`builder-feature-card ${form.includeOtherFeature ? "selected" : ""}`}
                    onClick={() => update("includeOtherFeature", !form.includeOtherFeature)}
                    role="checkbox"
                    aria-checked={form.includeOtherFeature}
                    tabIndex={0}
                  >
                    <span className="builder-feature-label">Other Custom Feature</span>
                    <div className={`builder-checkbox-box ${form.includeOtherFeature ? "checked" : ""}`}>
                      {form.includeOtherFeature && "✓"}
                    </div>
                  </div>

                  {/* Not Sure Help Me Decide Option */}
                  <div
                    className={`builder-feature-card ${form.includeNotSureFeature ? "selected" : ""}`}
                    onClick={() => {
                      const nextVal = !form.includeNotSureFeature;
                      setForm((f) => ({
                        ...f,
                        includeNotSureFeature: nextVal,
                        selectedFeatures: nextVal ? [] : f.selectedFeatures,
                      }));
                    }}
                    role="checkbox"
                    aria-checked={form.includeNotSureFeature}
                    tabIndex={0}
                  >
                    <span className="builder-feature-label">Not Sure — Help Me Decide</span>
                    <div className={`builder-checkbox-box ${form.includeNotSureFeature ? "checked" : ""}`}>
                      {form.includeNotSureFeature && "✓"}
                    </div>
                  </div>
                </div>

                {form.includeOtherFeature && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="text"
                      className="builder-input"
                      placeholder="Specify your other requested feature..."
                      value={form.otherFeatureText}
                      onChange={(e) => update("otherFeatureText", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* B. Customer Login Options */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">Do People Need to Log In?</h4>
                  <p className="builder-substep-desc">
                    Choose how customers or members should access your website.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Login Options">
                  {LOGIN_OPTIONS.map((opt) => {
                    const isSelected = form.loginOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("loginOption", opt.id)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{opt.label}</strong>
                          <span className="builder-option-desc">{opt.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* C. Additional Login Security (Conditional when login is enabled) */}
              {form.loginOption && form.loginOption !== "none" && (
                <div className="builder-substep-section">
                  <div className="builder-substep-header">
                    <h4 className="builder-substep-title">Additional Login Security</h4>
                    <p className="builder-substep-desc">
                      Optional protections for user accounts. Select all that apply.
                    </p>
                  </div>

                  <div className="builder-objectives-grid" role="group" aria-label="Login Security">
                    {LOGIN_SECURITY_OPTIONS.map((sec) => {
                      const isChecked = form.loginSecurity.includes(sec);
                      return (
                        <div
                          key={sec}
                          className={`builder-objective-card ${isChecked ? "selected" : ""}`}
                          onClick={() => toggleLoginSecurity(sec)}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                        >
                          <span className="builder-objective-name">{sec}</span>
                          <div className={`builder-checkbox-box ${isChecked ? "checked" : ""}`}>
                            {isChecked && "✓"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* D. Website Management Dashboard */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">Do You Need a Dashboard?</h4>
                  <p className="builder-substep-desc">
                    A private area to manage your website, customers, products or content.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Dashboard Options">
                  {DASHBOARD_OPTIONS.map((opt) => {
                    const isSelected = form.dashboardOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("dashboardOption", opt.id)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{opt.label}</strong>
                          <span className="builder-option-desc">{opt.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* E. Data Storage */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">Does Your Website Need to Save Information?</h4>
                  <p className="builder-substep-desc">
                    Some websites need to save customer accounts, orders, bookings or enquiries.
                  </p>
                </div>

                <div className="builder-radio-cards-grid three-col" role="radiogroup" aria-label="Data Storage">
                  {DATA_STORAGE_OPTIONS.map((opt) => {
                    const isSelected = form.dataStorage === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("dataStorage", opt.id)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{opt.label}</strong>
                          <span className="builder-option-desc">{opt.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
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
                  className="button secondary"
                  onClick={() => {
                    setStatus("");
                    setStep(0);
                    scrollToTop();
                  }}
                >
                  <ArrowLeft size={16} /> Back to Website
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => handleGoToStep3()}
                >
                  Continue to Design & Preferences <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              STEP 3 — DESIGN & PREFERENCES
              ================================================================ */}
          {step === 2 && (
            <div className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 3 of 4</span>
                <h3 className="builder-step-title">
                  How Would You Like Your Website to Look?
                </h3>
                <p className="builder-step-sub">
                  Tell us what style you prefer. You can change your mind later.
                </p>
              </div>

              {/* A. Design Style */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">Design Style</h4>
                  <p className="builder-substep-desc">
                    Choose the visual identity that matches your brand personality.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Design Style">
                  {designStyles.map((style: any) => {
                    const isSelected = form.designStyle === style.label;
                    return (
                      <div
                        key={style.id || style.label}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("designStyle", style.label)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{style.label}</strong>
                          <span className="builder-option-desc">{style.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* B. Animation & Motion */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">How Much Animation Do You Want?</h4>
                  <p className="builder-substep-desc">
                    Choose the motion depth and interaction level for your website.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Animation Levels">
                  {ANIMATION_LEVELS.map((anim) => {
                    const isSelected = form.animationLevel === anim.label;
                    return (
                      <div
                        key={anim.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("animationLevel", anim.label)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{anim.label}</strong>
                          <span className="builder-option-desc">{anim.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* C. Number of Website Pages */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">How Many Pages Might You Need?</h4>
                  <p className="builder-substep-desc">
                    Estimate the size of your website. We can refine this together later.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Page Count">
                  {PAGE_COUNT_OPTIONS.map((pg) => {
                    const isSelected = form.pageCount === pg.label;
                    return (
                      <div
                        key={pg.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("pageCount", pg.label)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{pg.label}</strong>
                          <span className="builder-option-desc">{pg.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* D. Existing Design or Reference */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">Do You Already Have a Design in Mind?</h4>
                  <p className="builder-substep-desc">
                    Let us know if you have Figma files, reference websites, or if we should design from scratch.
                  </p>
                </div>

                <div className="builder-radio-cards-grid" role="radiogroup" aria-label="Design In Mind">
                  {DESIGN_MIND_OPTIONS.map((dm) => {
                    const isSelected = form.designMind === dm.label;
                    return (
                      <div
                        key={dm.id}
                        className={`builder-option-card ${isSelected ? "selected" : ""}`}
                        onClick={() => update("designMind", dm.label)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="builder-option-content">
                          <strong className="builder-option-title">{dm.label}</strong>
                          <span className="builder-option-desc">{dm.desc}</span>
                        </div>
                        <div className={`builder-cat-radio ${isSelected ? "active" : ""}`}>
                          {isSelected && <span className="builder-radio-dot" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {form.designMind === "Yes — I Have a Figma Design" && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="url"
                      className="builder-input"
                      placeholder="Paste your Figma file or prototype URL..."
                      value={form.figmaUrl}
                      onChange={(e) => update("figmaUrl", e.target.value)}
                    />
                  </div>
                )}

                {form.designMind === "Yes — I Have Reference Websites" && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="text"
                      className="builder-input"
                      placeholder="e.g. https://example.com, https://awwwards.com/site..."
                      value={form.referenceUrl}
                      onChange={(e) => update("referenceUrl", e.target.value)}
                    />
                  </div>
                )}

                {form.designMind === "Yes — I Have Screenshots or Sketches" && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      rows={2}
                      className="builder-input"
                      placeholder="Share notes or links to your sketches / screenshots (Google Drive, Dropbox, etc.)..."
                      value={form.designNotes}
                      onChange={(e) => update("designNotes", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* E. Timeline & Budget Preferences */}
              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">When Would You Like It Ready?</h4>
                  <p className="builder-substep-desc">
                    This is a planning preference, not a guaranteed delivery date.
                  </p>
                </div>

                <div className="builder-pills-row" role="radiogroup" aria-label="Timeline">
                  {timelineChoices.map((tl: string) => (
                    <button
                      key={tl}
                      type="button"
                      className={`builder-pill ${form.timeline === tl ? "active" : ""}`}
                      onClick={() => update("timeline", tl)}
                    >
                      {tl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="builder-substep-section">
                <div className="builder-substep-header">
                  <h4 className="builder-substep-title">What Is Your Budget Preference?</h4>
                  <p className="builder-substep-desc">
                    This is an initial preference to guide scoping, not a confirmed price.
                  </p>
                </div>

                <div className="builder-pills-row" role="radiogroup" aria-label="Budget">
                  {budgetChoices.map((bg: string) => (
                    <button
                      key={bg}
                      type="button"
                      className={`builder-pill ${form.budget === bg ? "active" : ""}`}
                      onClick={() => update("budget", bg)}
                    >
                      {bg}
                    </button>
                  ))}
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
                  className="button secondary"
                  onClick={() => {
                    setStatus("");
                    setStep(1);
                    scrollToTop();
                  }}
                >
                  <ArrowLeft size={16} /> Back to Features
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => handleGoToStep4()}
                >
                  Continue to Contact Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              STEP 4 — CONTACT & SUBMIT
              ================================================================ */}
          {step === 3 && (
            <div className="builder-step-form">
              <div className="builder-step-header">
                <span className="eyebrow">Step 4 of 4</span>
                <h3 className="builder-step-title">
                  Almost Done! Let&apos;s Get in Touch.
                </h3>
                <p className="builder-step-sub">
                  Enter your details so we can contact you about your project.
                </p>
              </div>

              {/* Client Information Form Grid */}
              <div className="builder-form-grid">
                <div className="builder-form-group">
                  <label htmlFor="client-name">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    className="builder-input"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>

                <div className="builder-form-group">
                  <label htmlFor="client-email">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    className="builder-input"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>

                <div className="builder-form-group">
                  <label htmlFor="client-phone">
                    Mobile Number <span className="req">*</span>
                  </label>
                  <div className="builder-phone-wrap">
                    <select
                      className="builder-country-select"
                      value={form.countryCode}
                      onChange={(e) => update("countryCode", e.target.value)}
                    >
                      <option value="+91">🇮🇳 +91 (IN)</option>
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                      <option value="+61">🇦🇺 +61 (AU)</option>
                      <option value="+65">🇸🇬 +65 (SG)</option>
                      <option value="+49">🇩🇪 +49 (DE)</option>
                    </select>
                    <input
                      id="client-phone"
                      type="tel"
                      required
                      placeholder="98765 43210"
                      className="builder-input phone-field"
                      value={form.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        update("phone", val);
                        if (form.sameAsPhone) {
                          update("whatsappPhone", val);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="builder-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="client-whatsapp">
                      WhatsApp Number <span className="req">*</span>
                    </label>
                    <label className="builder-checkbox-inline" style={{ fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={form.sameAsPhone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          update("sameAsPhone", checked);
                          if (checked) {
                            update("whatsappPhone", form.phone);
                          }
                        }}
                      />
                      <span>Same as Mobile</span>
                    </label>
                  </div>
                  <input
                    id="client-whatsapp"
                    type="tel"
                    required
                    placeholder="WhatsApp number"
                    disabled={form.sameAsPhone}
                    className="builder-input"
                    value={form.sameAsPhone ? form.phone : form.whatsappPhone}
                    onChange={(e) => update("whatsappPhone", e.target.value)}
                  />
                </div>

                <div className="builder-form-group">
                  <label htmlFor="client-city">
                    City / Location <span className="req">*</span>
                  </label>
                  <input
                    id="client-city"
                    type="text"
                    required
                    placeholder="e.g. Hyderabad, Vijayawada, Bangalore"
                    className="builder-input"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>

                <div className="builder-form-group">
                  <label>Are You Enquiring for Yourself or a Business?</label>
                  <div className="builder-pills-row">
                    <button
                      type="button"
                      className={`builder-pill ${!form.isBusiness ? "active" : ""}`}
                      onClick={() => update("isBusiness", false)}
                    >
                      Personal / Individual Project
                    </button>
                    <button
                      type="button"
                      className={`builder-pill ${form.isBusiness ? "active" : ""}`}
                      onClick={() => update("isBusiness", true)}
                    >
                      Business / Organization
                    </button>
                  </div>
                </div>

                {form.isBusiness && (
                  <div className="builder-form-group full-width">
                    <label htmlFor="client-business-name">
                      Business or Brand Name <span className="req">*</span>
                    </label>
                    <input
                      id="client-business-name"
                      type="text"
                      required
                      placeholder="e.g. Acme Studio, Spice House, StarX Tech"
                      className="builder-input"
                      value={form.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                    />
                  </div>
                )}

                <div className="builder-form-group full-width">
                  <label>Preferred Contact Method</label>
                  <div className="builder-pills-row">
                    {["WhatsApp", "Phone Call", "Email"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`builder-pill ${form.preferredContact === method ? "active" : ""}`}
                        onClick={() => update("preferredContact", method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="builder-form-group full-width">
                  <label htmlFor="client-existing-site">
                    Existing Website or Social Link (Optional)
                  </label>
                  <input
                    id="client-existing-site"
                    type="text"
                    placeholder="https://..."
                    className="builder-input"
                    value={form.existingWebsiteUrl}
                    onChange={(e) => update("existingWebsiteUrl", e.target.value)}
                  />
                </div>

                <div className="builder-form-group full-width">
                  <label htmlFor="client-message">
                    Additional Message or Notes (Optional)
                  </label>
                  <textarea
                    id="client-message"
                    rows={3}
                    placeholder="Tell us any specific requirements, deadlines, or reference ideas..."
                    className="builder-input"
                    value={form.additionalMessage}
                    onChange={(e) => update("additionalMessage", e.target.value)}
                  />
                </div>

                {/* Honeypot field */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ display: "none" }}
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>

              {/* Review Before Submitting: Compact 4-Step Summary Card */}
              <div className="builder-review-summary">
                <div className="review-summary-header">
                  <span className="review-summary-title">Enquiry Summary</span>
                  <span className="review-summary-tag">Ready for Proposal</span>
                </div>

                <div className="review-summary-rows">
                  <div className="review-row">
                    <span className="review-lbl">Website Type:</span>
                    <strong className="review-val">
                      {form.selectedCategory || "Not selected"}
                      {form.customCategoryText ? ` (${form.customCategoryText})` : ""}
                    </strong>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(0)}>Edit</button>
                  </div>

                  <div className="review-row">
                    <span className="review-lbl">Primary Purposes:</span>
                    <span className="review-val">
                      {form.selectedPurposes.length > 0 ? form.selectedPurposes.join(", ") : "Not specified"}
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(0)}>Edit</button>
                  </div>

                  <div className="review-row">
                    <span className="review-lbl">Features Selected:</span>
                    <span className="review-val">
                      {form.includeNotSureFeature
                        ? "Guidance requested (Not Sure)"
                        : form.selectedFeatures.length > 0
                        ? `${form.selectedFeatures.length} features selected (${form.selectedFeatures.slice(0, 3).join(", ")}${form.selectedFeatures.length > 3 ? "..." : ""})`
                        : "Baseline features"}
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(1)}>Edit</button>
                  </div>

                  <div className="review-row">
                    <span className="review-lbl">Login & Dashboard:</span>
                    <span className="review-val">
                      Login: {form.loginOption || "Not sure"} · Dashboard: {form.dashboardOption || "Not sure"}
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(1)}>Edit</button>
                  </div>

                  <div className="review-row">
                    <span className="review-lbl">Design & Style:</span>
                    <span className="review-val">
                      {form.designStyle || "Clean & Simple"} · Animation: {form.animationLevel || "Smooth"} · Pages: {form.pageCount || "Small Website"}
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(2)}>Edit</button>
                  </div>

                  <div className="review-row">
                    <span className="review-lbl">Timeline & Budget:</span>
                    <span className="review-val">
                      Timeline: {form.timeline} · Budget: {form.budget}
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setStep(2)}>Edit</button>
                  </div>
                </div>
              </div>

              {/* Mandatory Privacy Consent Checkbox */}
              <div className="builder-consent-wrap">
                <label className="builder-consent-label">
                  <input
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={(e) => update("consent", e.target.checked)}
                  />
                  <span>
                    I agree to let SANJU X DEV contact me regarding this enquiry and store my submitted project details.
                  </span>
                </label>
              </div>

              {status && (
                <p role="alert" className="builder-status-alert">
                  {status}
                </p>
              )}

              {/* Two Submission Buttons */}
              <div className="builder-step-actions split">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setStatus("");
                    setStep(2);
                    scrollToTop();
                  }}
                >
                  <ArrowLeft size={16} /> Back to Preferences
                </button>

                <div className="builder-submit-dual-actions">
                  <button
                    type="button"
                    className="button"
                    disabled={busy || !form.consent}
                    onClick={() => void handleSubmit(false)}
                  >
                    {busy ? "Submitting..." : "Submit & Finalize"}
                    <Arrow />
                  </button>

                  <button
                    type="button"
                    className="button button-whatsapp"
                    disabled={busy || !form.consent}
                    onClick={() => void handleSubmit(true)}
                  >
                    <MessageCircle size={17} />
                    {busy ? "Saving & Opening..." : "Submit & Continue on WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Contact() {
  const s = useSite();

  return (
    <div className="page contact-page wrap">
      <header className="page-header" style={{ marginBottom: 32 }}>
        <span className="eyebrow">Project Enquiry & Consultation</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "8px 0" }}>
          Choose Your Website
        </h1>
        <p style={{ maxWidth: 640, color: "var(--muted)", fontSize: 16 }}>
          Select what you&apos;re planning to create, pick your features, and get an honest proposal with your unique tracking code.
        </p>
      </header>

      {/* Render 4-step wizard */}
      <EnquiryBuilder isHomepageSection={false} />

      {/* Direct Contact Alternatives */}
      <aside className="contact-direct-options" style={{ marginTop: 60, borderTop: "1px solid var(--line)", paddingTop: 32 }}>
        <h3 style={{ fontSize: 20, marginBottom: 12 }}>Prefer to Reach Out Directly?</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
          If you already have a detailed brief or urgent question, feel free to contact Sanjay directly:
        </p>
        <div className="final-contact-grid">
          <a href={"mailto:" + s.email} className="final-contact-item">
            <div className="contact-item-icon"><MailIcon size={20} /></div>
            <div className="contact-item-info">
              <span className="contact-item-label">Email</span>
              <span className="contact-item-value">{s.email}</span>
            </div>
          </a>
          <a href={"tel:" + SANJU_BUSINESS_PHONE} className="final-contact-item">
            <div className="contact-item-icon">📞</div>
            <div className="contact-item-info">
              <span className="contact-item-label">Direct Phone</span>
              <span className="contact-item-value">{SANJU_BUSINESS_PHONE}</span>
            </div>
          </a>
          <a
            href={`https://wa.me/${SANJU_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello SANJU X DEV, I would like to enquire about a website.")}`}
            target="_blank"
            rel="noreferrer"
            className="final-contact-item"
            style={{ borderLeft: "3px solid #25d366" }}
          >
            <div className="contact-item-icon"><MessageCircle size={20} style={{ color: "#25d366" }} /></div>
            <div className="contact-item-info">
              <span className="contact-item-label">WhatsApp</span>
              <span className="contact-item-value">{SANJU_BUSINESS_PHONE}</span>
            </div>
          </a>
        </div>
      </aside>
    </div>
  );
}
