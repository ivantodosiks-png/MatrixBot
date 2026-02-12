/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BodyClass from "@/components/body-class";

type LoginResponse = {
  ok?: boolean;
  error?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setState("error");
      setStatus("Error: fill in email and password.");
      return;
    }

    setPending(true);
    setState("pending");
    setStatus("Checking credentials...");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      localStorage.setItem("matrix_user", JSON.stringify(data.user || { email }));
      setState("success");
      setStatus("Login successful. Redirecting...");
      router.push("/chat");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "login failed";
      setState("error");
      setStatus(`Error: ${message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <BodyClass classes="matrix auth-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="auth-shell">
        <section className="auth-panel">
          <div className="auth-logo">MATRIX GPT</div>
          <div className="auth-title">Login</div>
          <p className="auth-sub">Sign in to your account to continue to chat.</p>

          <form className="auth-form" noValidate onSubmit={onSubmit}>
            <label className="field">
              E-mail
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field">
              Password
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? "Please wait..." : "Login"}
            </button>
          </form>

          <p className="form-status" data-state={state === "idle" ? undefined : state}>
            {status}
          </p>

          <div className="auth-links">
            <a href="/register">No account yet? Register</a>
            <a href="/">Back to home</a>
          </div>
        </section>
      </main>
    </>
  );
}



