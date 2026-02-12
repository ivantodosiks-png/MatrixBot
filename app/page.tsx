/* eslint-disable @next/next/no-html-link-for-pages */
import Script from "next/script";
import BodyClass from "@/components/body-class";

export default function HomePage() {
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

      <header className="lp-header">
        <div className="lp-shell">
          <a className="lp-logo" href="/">
            MATRIX GPT
          </a>
          <nav className="lp-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-header-cta">
            <span className="lp-online-pill">Core online</span>
            <a href="/login" className="lp-btn lp-btn-secondary">
              Logg inn
            </a>
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
            <div className="lp-signal-row">
              <span>School-safe workflows</span>
              <span>Server-side key routing</span>
              <span>Fast response loops</span>
            </div>
            <div className="lp-hero-cta">
              <a className="lp-btn lp-btn-primary" href="/chat">
                Start session
              </a>
              <a className="lp-btn lp-btn-secondary" href="/register">
                Create account
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
                Model: gpt-4o-mini
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
              Launch app
            </a>
            <a href="/register" className="lp-btn lp-btn-secondary">
              Get started
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-row">
          <div>(c) Matrix GPT</div>
          <div className="lp-footer-links">
            <a href="/login">Logg inn</a>
            <a href="/register">Registrer</a>
            <a href="/chat">Chat</a>
          </div>
        </div>
      </footer>

      <Script src="/assets/js/landing.js" strategy="afterInteractive" />
    </>
  );
}



