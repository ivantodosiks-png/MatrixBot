import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/sign-out-button";
import ManageSubscriptionButton from "@/components/manage-subscription-button";
import BodyClass from "@/components/body-class";
import { findUserById } from "@/lib/user-store";

type AccountPageProps = {
  searchParams?: {
    success?: string;
    plan?: string;
  };
};

function formatPeriod(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const checkoutSuccess = searchParams?.success === "1";
  const freeSelected = searchParams?.plan === "free";

  return (
    <>
      <BodyClass classes="matrix account-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="account-shell">
        <section className="account-panel reveal-on-scroll">
          <div className="account-top">
            <h1>Account</h1>
            <a className="lp-btn lp-btn-secondary" href="/pricing">
              Подписки
            </a>
          </div>

          {checkoutSuccess ? (
            <p className="account-banner success">
              Payment completed. Subscription status will sync in a few seconds.
            </p>
          ) : null}

          {freeSelected ? (
            <p className="account-banner">Free plan activated for this account.</p>
          ) : null}

          <dl className="account-grid">
            <div>
              <dt>User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{user.name || "-"}</dd>
            </div>
            <div>
              <dt>Current plan</dt>
              <dd>{user.plan}</dd>
            </div>
            <div>
              <dt>Subscription status</dt>
              <dd>{user.subscription_status}</dd>
            </div>
            <div>
              <dt>Current period end</dt>
              <dd>{formatPeriod(user.current_period_end)}</dd>
            </div>
            <div>
              <dt>Daily usage</dt>
              <dd>{user.daily_message_count} / 20</dd>
            </div>
            <div>
              <dt>Monthly usage</dt>
              <dd>{user.monthly_message_count} / 500</dd>
            </div>
          </dl>

          <div className="account-actions">
            {user.stripe_customer_id ? <ManageSubscriptionButton /> : null}
            <SignOutButton />
            <a className="lp-btn lp-btn-primary" href="/chat">
              Go to chat
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
