"use client";

import { useMemo, useState, type FormEvent } from "react";

type SendMailResponse = {
  ok?: boolean;
  error?: {
    message?: string;
  };
};

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const clientTs = useMemo(() => Date.now(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/sendMail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          clientTs,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as SendMailResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      setSuccess("Message sent successfully.");
      setName("");
      setEmail("");
      setMessage("");
      setWebsite("");
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : "Request failed";
      setError(messageText);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <label className="contact-label">
        Name
        <input
          className="contact-input"
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
      </label>

      <label className="contact-label">
        Email
        <input
          className="contact-input"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          required
        />
      </label>

      <label className="contact-label">
        Message
        <textarea
          className="contact-textarea"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={10}
          maxLength={5000}
          required
        />
      </label>

      <div className="contact-honeypot" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <button type="submit" className="lp-btn lp-btn-primary" disabled={pending}>
        {pending ? "Sending..." : "Submit"}
      </button>

      {error ? <p className="contact-error">{error}</p> : null}
      {success ? <p className="contact-success">{success}</p> : null}
    </form>
  );
}
