import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSite, Arrow } from "./App";
export default function Contact() {
  const s = useSite();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    service:
      s.services.find((item) => item.name === params.get("service"))?.name ||
      s.services[0].name,
    features: "",
    timeline: "Flexible",
    budget: "",
    name: "",
    email: "",
    company: "",
    description:
      params.get("service") &&
      !s.services.some((item) => item.name === params.get("service"))
        ? "I’m interested in a similar project: " + params.get("service")
        : "",
    consent: false,
    website: "",
  });
  const update = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const r = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Unable to send. Please try again.");
      setSent(true);
      setStatus(
        "Your enquiry has been saved. Thank you — we’ll use the details you shared to get in touch.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page wrap">
      <span className="eyebrow">Start a project</span>
      <h1>
        Your next chapter
        <br />
        <em>starts here.</em>
      </h1>
      <div className="contact-grid">
        <aside className="contact-aside">
          <h2>
            Tell us what
            <br />
            you have in mind.
          </h2>
          <p>
            A few useful details are all we need to begin. No fixed packages or
            assumptions — just a conversation about the right approach.
          </p>
          <a href={"mailto:" + s.email}>{s.email}</a>
          <p>Prefer to explore first?</p>
          <Link className="text-link" to="/work">
            See the work <Arrow />
          </Link>
        </aside>
        <div className="form-panel">
          <div className="steps">
            {["01 / The idea", "02 / The scope", "03 / Your details"].map(
              (x, i) => (
                <span key={x} className={i === step ? "active" : ""}>
                  {x}
                </span>
              ),
            )}
          </div>
          {sent ? (
            <div role="status" className="status">
              {status}
            </div>
          ) : (
            <form onSubmit={submit}>
              {step === 0 && (
                <>
                  <label>
                    What do you need?
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
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tell us about your project
                    <textarea
                      required
                      minLength={20}
                      maxLength={5000}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="What does your business do, and what should the website help people do?"
                    />
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  <label>
                    Features you have in mind
                    <textarea
                      maxLength={2000}
                      value={form.features}
                      onChange={(e) => update("features", e.target.value)}
                      placeholder="For example: product catalogue, bookings, member area…"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Expected timeline
                      <select
                        value={form.timeline}
                        onChange={(e) => update("timeline", e.target.value)}
                      >
                        {[
                          "Flexible",
                          "Within a month",
                          "1–3 months",
                          "3+ months",
                          "Let’s discuss",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Budget range (optional)
                      <input
                        maxLength={100}
                        value={form.budget}
                        onChange={(e) => update("budget", e.target.value)}
                        placeholder="Your preferred range"
                      />
                    </label>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="form-grid">
                    <label>
                      Your name
                      <input
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                      />
                    </label>
                    <label>
                      Email address
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Business / organization (optional)
                    <input
                      maxLength={150}
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />
                  </label>
                  <div className="status">
                    <strong>{form.service}</strong>
                    <p>{form.description}</p>
                    <small>
                      {form.timeline}
                      {form.budget ? " · " + form.budget : ""}
                    </small>
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                    />
                    <span>
                      I agree that SANJU X DEV may use these details to respond
                      to my enquiry. <Link to="/privacy">Privacy policy</Link>
                    </span>
                  </label>
                </>
              )}
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
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(step - 1)}>
                    ← Back
                  </button>
                ) : (
                  <span />
                )}
                <button className="button" disabled={busy}>
                  {busy
                    ? "Sending…"
                    : step < 2
                      ? "Continue"
                      : "Send project enquiry"}
                  <Arrow />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
