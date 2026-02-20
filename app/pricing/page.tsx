/* eslint-disable @next/next/no-html-link-for-pages */
import BodyClass from "@/components/body-class";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";
import { PLAN_DETAILS, userPlanToPublicPlan } from "@/lib/plans";
import PricingPlanAction from "@/components/pricing-plan-action";

type PricingPageProps = {
  searchParams?: Promise<{
    canceled?: string;
  }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id ? await findUserById(session.user.id).catch(() => null) : null;
  const currentPlan = user ? userPlanToPublicPlan(user.plan) : null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const canceled = resolvedSearchParams?.canceled === "1";

  return (
    <>
      <BodyClass classes="matrix pricing-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="pricing-shell">
        <header className="pricing-header reveal-on-scroll">
          <a className="lp-logo" href="/">
            <span className="lp-logo-mark-wrap" aria-hidden="true">
              <img
                src="/assets/img/brand/logo-icon-primary.png"
                alt=""
                className="lp-logo-mark"
              />
            </span>
            <span className="lp-logo-text">MATRIX GPT</span>
          </a>
          <nav className="lp-nav" aria-label="Pricing navigation">
            <a href="/">Home</a>
            <a href="/chat">Chat</a>
            <a href="/pricing">Subscriptions</a>
            <a href="/account">Account</a>
          </nav>
        </header>

        <section className="pricing-hero reveal-on-scroll">
          <p className="lp-eyebrow">SUBSCRIPTIONS</p>
          <h1>Choose a plan that matches your chat volume.</h1>
          <p>
            Free is great for lightweight use. Pro and Ultra are paid plans with
            checkout on this site.
          </p>
          {canceled ? (
            <p className="pricing-banner">Checkout canceled. You can choose a plan again.</p>
          ) : null}
          <p className="pricing-current-plan">
            Current plan: <strong>{currentPlan ? currentPlan.toUpperCase() : "Not selected"}</strong>
          </p>
        </section>

        <section className="pricing-grid">
          <article className={`pricing-card ${currentPlan === "free" ? "active" : ""}`}>
            <div className="pricing-card-head">
              <h2>{PLAN_DETAILS.FREE.name}</h2>
              <p>
                {PLAN_DETAILS.FREE.priceLabel} <span>{PLAN_DETAILS.FREE.periodLabel}</span>
              </p>
            </div>
            <ul>
              <li>{PLAN_DETAILS.FREE.limitLabel}</li>
              <li>Basic support</li>
              <li>Standard queue</li>
            </ul>
            <PricingPlanAction
              plan={PLAN_DETAILS.FREE.id}
              isAuthenticated={Boolean(session?.user)}
              isCurrentPlan={currentPlan === "free"}
            />
          </article>

          <article className={`pricing-card popular ${currentPlan === "pro" ? "active" : ""}`}>
            <div className="pricing-badge">Popular</div>
            <div className="pricing-card-head">
              <h2>{PLAN_DETAILS.PRO.name}</h2>
              <p>
                {PLAN_DETAILS.PRO.priceLabel} <span>{PLAN_DETAILS.PRO.periodLabel}</span>
              </p>
            </div>
            <ul>
              <li>{PLAN_DETAILS.PRO.limitLabel}</li>
              <li>Priority responses</li>
              <li>Email receipt after purchase</li>
            </ul>
            <PricingPlanAction
              plan={PLAN_DETAILS.PRO.id}
              isAuthenticated={Boolean(session?.user)}
              isCurrentPlan={currentPlan === "pro"}
            />
          </article>

          <article className={`pricing-card ${currentPlan === "ultra" ? "active" : ""}`}>
            <div className="pricing-card-head">
              <h2>{PLAN_DETAILS.ULTRA.name}</h2>
              <p>
                {PLAN_DETAILS.ULTRA.priceLabel} <span>{PLAN_DETAILS.ULTRA.periodLabel}</span>
              </p>
            </div>
            <ul>
              <li>{PLAN_DETAILS.ULTRA.limitLabel}</li>
              <li>Max priority</li>
              <li>Early access features</li>
            </ul>
            <PricingPlanAction
              plan={PLAN_DETAILS.ULTRA.id}
              isAuthenticated={Boolean(session?.user)}
              isCurrentPlan={currentPlan === "ultra"}
            />
          </article>
        </section>
      </main>
    </>
  );
}
