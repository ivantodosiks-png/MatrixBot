import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/sign-out-button";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-cyan-400/25 bg-zinc-900/70 p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-wide">Your account</h1>
        <p className="mt-3 text-sm text-zinc-300">You are logged in.</p>

        <dl className="mt-5 grid gap-2 text-sm">
          <div>
            <dt className="text-zinc-400">User ID</dt>
            <dd>{session.user.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Email</dt>
            <dd>{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Name</dt>
            <dd>{session.user.name || "-"}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

