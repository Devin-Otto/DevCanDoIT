"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

const initialMessage =
  "Tell me what feels messy right now and what a better system would unlock.";

export function LeadForm({
  context = "General inquiry"
}: {
  context?: "General inquiry" | "Consulting inquiry" | "Portfolio walkthrough";
}) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [responseMessage, setResponseMessage] = useState(initialMessage);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setResponseMessage("Sending your note...");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          context
        })
      });

      let data: { message?: string } = {};

      try {
        data = (await response.json()) as { message?: string };
      } catch {
        data = {};
      }

      if (!response.ok) {
        setStatus("error");
        setResponseMessage(data.message || "Something blocked the request. Please email me directly.");
        return;
      }

      form.reset();
      setStatus("success");
      setResponseMessage(data.message || "Thanks. Your message landed and I will follow up by email.");
    } catch {
      setStatus("error");
      setResponseMessage("The request could not be sent. Please email me directly while we sort this out.");
    }
  }

  return (
    <div className="lead-form-wrap">
      <div className="section-copy">
        <p className="eyebrow">Contact</p>
        <h2>Send a short project brief and I’ll follow up by email.</h2>
        <p>{responseMessage}</p>
      </div>

      <form className="lead-form" onSubmit={handleSubmit} aria-busy={status === "loading"}>
        <label>
          Name
          <input type="text" name="name" required placeholder="Your name" />
        </label>

        <label>
          Email
          <input type="email" name="email" required placeholder="you@company.com" />
        </label>

        <label>
          Company / team
          <input type="text" name="company" placeholder="Optional" />
        </label>

        <label>
          What do you need help with?
          <select name="service" defaultValue={context}>
            <option>General inquiry</option>
            <option>Consulting inquiry</option>
            <option>Portfolio walkthrough</option>
            <option>Agentic AI strategy</option>
            <option>Custom web app</option>
            <option>Automation system</option>
          </select>
        </label>

        <label>
          What feels messy right now?
          <textarea
            name="message"
            rows={6}
            required
            placeholder="Describe the bottleneck, manual workflow, or system idea."
          />
        </label>

        <label className="sr-only" aria-hidden="true">
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <button className="button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send project brief"}
        </button>

        <p
          className={`form-state${status === "error" ? " error" : ""}${status === "success" ? " success" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {status === "idle" ? null : responseMessage}
        </p>
      </form>
    </div>
  );
}
