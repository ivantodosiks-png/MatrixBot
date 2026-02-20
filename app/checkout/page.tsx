import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import BodyClass from "@/components/body-class";
import CheckoutForm from "@/components/checkout-form";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";
import type { PublicPlan } from "@/lib/plans";

type CheckoutPageProps = {
  searchParams?: Promise<{
    plan?: string;
  }>;
};

function resolvePlan(value: string | undefined): PublicPlan {
  if (value === "pro") return "pro";
  if (value === "ultra") return "ultra";
  return "free";
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const plan = resolvePlan(resolvedSearchParams?.plan);

  return (
    <>
      <BodyClass classes="matrix checkout-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="checkout-shell">
        <section className="checkout-panel reveal-on-scroll">
          <div className="checkout-top">
            <h1>Payment</h1>
            <a className="lp-btn lp-btn-secondary" href="/pricing">
              Back to pricing
            </a>
          </div>
          <p className="checkout-subtitle">
            Demo checkout page: enter any data, click buy, and we will send a receipt
            to your email.
          </p>
          <CheckoutForm plan={plan} email={user.email} />
        </section>
      </main>
    </>
  );
}
