/* eslint-disable @next/next/no-html-link-for-pages */
import Script from "next/script";
import { getServerSession } from "next-auth";
import BodyClass from "@/components/body-class";
import { getPublicStats } from "@/lib/stats";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user?.id);
  const stats = await getPublicStats(120).catch(() => ({
    usersCount: 0,
    successfulChatsCount: 0,
    responsesPerSecond: 0,
  }));

  return (
    <>
      <BodyClass classes="matrix landing" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />
      <div className="lp-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="lp-scroll-pod" id="lpScrollPod" aria-hidden="true">
        <div className="lp-scroll-pod-body">
          <div className="lp-scroll-pod-trail" />
          <svg
            className="lp-scroll-pod-ship"
            viewBox="0 0 210 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="lpPodShell" x1="18" y1="55" x2="180" y2="55" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6FE8FF" />
                <stop offset="0.55" stopColor="#73D1FF" />
                <stop offset="1" stopColor="#4D88E6" />
              </linearGradient>
              <linearGradient id="lpPodCore" x1="80" y1="34" x2="160" y2="76" gradientUnits="userSpaceOnUse">
                <stop stopColor="#D5F7FF" />
                <stop offset="1" stopColor="#7AC7FF" />
              </linearGradient>
            </defs>
            <path
              d="M22 55C38 38 73 25 121 24C161 24 184 35 194 55C184 75 161 86 121 86C73 85 38 72 22 55Z"
              fill="url(#lpPodShell)"
              fillOpacity="0.2"
              stroke="url(#lpPodShell)"
              strokeWidth="2.4"
            />
            <path
              d="M57 55C67 45 87 38 115 38C137 38 154 43 163 55C154 67 137 72 115 72C87 72 67 65 57 55Z"
              fill="url(#lpPodCore)"
              fillOpacity="0.26"
              stroke="#BEEBFF"
              strokeOpacity="0.85"
              strokeWidth="1.7"
            />
            <path
              d="M163 55L194 55M48 45L76 45M48 65L76 65M94 31L113 31M94 79L113 79"
              stroke="#8CD8FF"
              strokeOpacity="0.72"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="84" cy="55" r="4.5" fill="#BDEBFF" fillOpacity="0.75" />
          </svg>
          <div className="lp-scroll-pod-glow" />
          <div className="lp-scroll-pod-glitch" />
        </div>
      </div>

      <header className="lp-header">
        <div className="lp-shell">
          <a className="lp-logo" href="/">
            MATRIX GPT
          </a>
          <nav className="lp-nav" aria-label="Main navigation">
            <a href="#stats">Stats</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <a href="/pricing">Subscriptions</a>
          </nav>
          <div className="lp-header-cta">
            <span className="lp-online-pill">
              {isLoggedIn ? "Matrix skriver..." : "Core online"}
            </span>
            {isLoggedIn ? (
              <a href="/account" className="lp-btn lp-btn-secondary">
                Account
              </a>
            ) : (
              <a href="/login" className="lp-btn lp-btn-secondary">
                Logg inn
              </a>
            )}
            <a href="/chat" className="lp-btn lp-btn-primary">
              Open chat
            </a>
          </div>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero lp-shell">
          <div className="lp-hero-copy reveal-on-scroll">
            <p className="lp-eyebrow">NEON INTELLIGENCE PLATFORM</p>
            <h1>Matrix-grade AI assistant for focused, fast decisions.</h1>
            <p className="lp-lead">
              Premium AI workspace with secure flows, low-friction UX, and a
              clean neon visual system built for modern teams.
            </p>
            <div className="lp-hero-cta lp-hero-cta-center">
              <a className="lp-btn lp-btn-primary" href="/chat">
                Start with Matrix
              </a>
            </div>
            <div className="lp-metrics">
              <div className="lp-metric">
                <span>99.9%</span>
                <small>uptime target</small>
              </div>
              <div className="lp-metric">
                <span>&lt;300ms</span>
                <small>avg request routing</small>
              </div>
              <div className="lp-metric">
                <span>24/7</span>
                <small>availability mode</small>
              </div>
            </div>
          </div>

          <aside className="lp-terminal reveal-on-scroll">
            <div className="lp-terminal-head">
              <span>matrix-core://status.live</span>
              <div className="lp-terminal-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="lp-terminal-body">
              <div className="lp-line">
                <span className="ok" />
                AI gateway connected
              </div>
              <div className="lp-line">
                <span className="ok" />
                Model: gpt-5.2
              </div>
              <div className="lp-line">
                <span className="ok" />
                Secure context enabled
              </div>
              <div className="lp-line">
                <span className="pulse" />
                Processing live requests...
              </div>
            </div>
            <div className="lp-terminal-foot">
              <a className="lp-link" href="/chat">
                Open live console
              </a>
            </div>
          </aside>
        </section>

        <section className="lp-band">
          <div className="lp-shell lp-band-marquee">
            <div className="lp-band-track">
              <span>LIVE CONTEXT</span>
              <span>TEAM-READY UX</span>
              <span>LOW LATENCY FLOW</span>
              <span>SECURE BY DEFAULT</span>
              <span>NEON CONTROL PANEL</span>
            </div>
            <div className="lp-band-track" aria-hidden="true">
              <span>LIVE CONTEXT</span>
              <span>TEAM-READY UX</span>
              <span>LOW LATENCY FLOW</span>
              <span>SECURE BY DEFAULT</span>
              <span>NEON CONTROL PANEL</span>
            </div>
          </div>
        </section>

        <section id="stats" className="lp-section lp-shell">
          <div className="lp-section-top reveal-on-scroll">
            <p className="lp-eyebrow">STATISTICS AND ANALYTICS</p>
            <h2>Live service metrics from real product usage.</h2>
          </div>
          <div className="lp-grid-cards">
            <article className="lp-card reveal-on-scroll">
              <h3>Registered users</h3>
              <p className="lp-stat-value">{stats.usersCount.toLocaleString("en-US")}</p>
              <p>Total accounts created in the platform.</p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Successful chats</h3>
              <p className="lp-stat-value">
                {stats.successfulChatsCount.toLocaleString("en-US")}
              </p>
              <p>Dialog responses returned without errors.</p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Responses per second</h3>
              <p className="lp-stat-value">{stats.responsesPerSecond.toFixed(2)}</p>
              <p>Calculated as 1000 / avgResponseMs over recent requests.</p>
            </article>
          </div>
        </section>

        <section id="features" className="lp-section lp-shell">
          <div className="lp-section-top reveal-on-scroll">
            <p className="lp-eyebrow">ADVANTAGES</p>
            <h2>Built like a premium SaaS product, not a toy UI.</h2>
          </div>
          <div className="lp-grid-cards">
            <article className="lp-card reveal-on-scroll">
              <h3>Fast by design</h3>
              <p>
                Lean interface, direct actions, and minimal friction for daily
                AI work.
              </p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Secure defaults</h3>
              <p>
                Backend-first API flow keeps sensitive keys outside the browser
                surface.
              </p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Live context</h3>
              <p>
                Chat history, profile, and settings stay aligned in one clean
                workflow.
              </p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Clear visual system</h3>
              <p>
                Glass panels, balanced contrast, and tight spacing keep focus
                on content.
              </p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Production-ready base</h3>
              <p>
                Simple architecture that can scale into logs, auth policies,
                and team flows.
              </p>
            </article>
            <article className="lp-card reveal-on-scroll">
              <h3>Mobile adaptive</h3>
              <p>
                Layouts and controls adapt smoothly from desktop workspace to
                phone.
              </p>
            </article>
          </div>
        </section>

        <section className="lp-shell lp-showcase">
          <article className="lp-showcase-main reveal-on-scroll">
            <p className="lp-eyebrow">COMMAND CENTER</p>
            <h2>One clean workspace for messages, context, and execution.</h2>
            <p>
              Keep every thread in one place. Launch a new chat, continue old
              sessions, and maintain decision context without switching tools.
            </p>
            <a href="/chat" className="lp-btn lp-btn-primary">
              Enter command center
            </a>
          </article>
          <div className="lp-showcase-grid">
            <article className="lp-showcase-card reveal-on-scroll">
              <strong>01</strong>
              <h3>Structured prompts</h3>
              <p>Use reusable system prompts and stay consistent across chats.</p>
            </article>
            <article className="lp-showcase-card reveal-on-scroll">
              <strong>02</strong>
              <h3>Instant routing</h3>
              <p>Request flow goes through backend proxy with server-side secrets.</p>
            </article>
            <article className="lp-showcase-card reveal-on-scroll">
              <strong>03</strong>
              <h3>Focused output</h3>
              <p>Balanced typography and spacing keep eyes on the answer, not noise.</p>
            </article>
          </div>
        </section>

        <section id="how" className="lp-section lp-shell">
          <div className="lp-section-top reveal-on-scroll">
            <p className="lp-eyebrow">HOW IT WORKS</p>
            <h2>Three steps to go from zero to live AI chat.</h2>
          </div>
          <div className="lp-steps">
            <article className="lp-step reveal-on-scroll">
              <span>01</span>
              <h3>Create access</h3>
              <p>Register an account and configure your workspace in minutes.</p>
            </article>
            <article className="lp-step reveal-on-scroll">
              <span>02</span>
              <h3>Connect the flow</h3>
              <p>
                Backend routes requests through configured AI endpoints
                securely.
              </p>
            </article>
            <article className="lp-step reveal-on-scroll">
              <span>03</span>
              <h3>Run live sessions</h3>
              <p>Launch chat, iterate quickly, and keep context in one place.</p>
            </article>
          </div>
        </section>

        <section id="faq" className="lp-section lp-shell">
          <div className="lp-section-top reveal-on-scroll">
            <p className="lp-eyebrow">FAQ</p>
            <h2>Short answers for practical decisions.</h2>
          </div>
          <div className="lp-faq">
            <details className="lp-faq-item reveal-on-scroll">
              <summary>Can I use this in production?</summary>
              <p>
                Yes. The core structure is ready for hardening with monitoring,
                audit logs, and role-based access.
              </p>
            </details>
            <details className="lp-faq-item reveal-on-scroll">
              <summary>Is the API key exposed in browser?</summary>
              <p>No. With backend proxy flow, keys stay on the server side only.</p>
            </details>
            <details className="lp-faq-item reveal-on-scroll">
              <summary>Does it work on mobile?</summary>
              <p>
                Yes. All key layout blocks and CTA actions are responsive and
                touch-friendly.
              </p>
            </details>
          </div>
        </section>

        <section className="lp-final lp-shell reveal-on-scroll">
          <div>
            <p className="lp-eyebrow">READY TO DEPLOY</p>
            <h2>Launch your premium Matrix AI experience.</h2>
          </div>
          <div className="lp-final-cta">
            <a href="/chat" className="lp-btn lp-btn-primary">
              Start
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-row">
          <div className="lp-footer-brand">
            <span>(c) Matrix GPT</span>
          </div>
          <div className="lp-footer-links">
            <a href="/login">Logg inn</a>
            <a href="/register">Registrer</a>
            <a href="/chat">Chat</a>
            <a href="/pricing">Subscriptions</a>
          </div>
        </div>
      </footer>

      <Script src="/assets/js/landing.js" strategy="afterInteractive" />
    </>
  );
}

