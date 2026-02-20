import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import BodyClass from "@/components/body-class";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <BodyClass classes="matrix settings-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="settings-shell">
        <section className="settings-panel reveal-on-scroll">
          <div className="account-top">
            <h1>Settings</h1>
            <a className="lp-btn lp-btn-secondary" href="/account">
              Back to profile
            </a>
          </div>

          <p className="checkout-subtitle">
            Manage your app preferences. Account data for <strong>{user.email}</strong>.
          </p>

          <div className="settings-grid">
            <div>
              <h2>Chat experience</h2>
              <ul>
                <li>Auto-scroll: enabled</li>
                <li>Typing indicator: enabled</li>
                <li>Compact mode: disabled</li>
              </ul>
            </div>
            <div>
              <h2>Notifications</h2>
              <ul>
                <li>Email receipts: enabled</li>
                <li>Product updates: enabled</li>
                <li>Security alerts: enabled</li>
              </ul>
            </div>
            <div>
              <h2>Privacy</h2>
              <ul>
                <li>Session protection: active</li>
                <li>Secure mode: active</li>
                <li>Data export: available on request</li>
              </ul>
            </div>
            <div>
              <h2>Quick links</h2>
              <div className="settings-actions">
                <a className="lp-btn lp-btn-primary" href="/chat">
                  Open chat
                </a>
                <a className="lp-btn lp-btn-secondary" href="/pricing">
                  Subscriptions
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

