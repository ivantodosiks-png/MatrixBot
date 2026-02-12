/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import BodyClass from "@/components/body-class";

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setState("error");
      setStatus("Error: fill in all fields.");
      return;
    }

    setPending(true);
    setState("pending");
    setStatus("Creating account...");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const signInResult = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });
      if (!signInResult || signInResult.error) {
        throw new Error(
          signInResult?.error ||
            "account was created, but automatic login failed"
        );
      }

      localStorage.setItem(
        "matrix_user",
        JSON.stringify(data.user || { name: normalizedName, email: normalizedEmail })
      );
      setState("success");
      setStatus("Account created. Redirecting...");
      router.push("/chat");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "registration failed";
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
          <div className="auth-title">Register</div>
          <p className="auth-sub">Create an account and start chatting.</p>

          <form className="auth-form" noValidate onSubmit={onSubmit}>
            <label className="field">
              Name
              <input
                type="text"
                name="name"
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

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
              {pending ? "Please wait..." : "Create account"}
            </button>
          </form>

          <p className="form-status" data-state={state === "idle" ? undefined : state}>
            {status}
          </p>

          <div className="auth-links">
            <a href="/login">Already have an account? Login</a>
            <a href="/">Back to home</a>
          </div>
        </section>
      </main>
    </>
  );
}



