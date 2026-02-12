"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-cyan-400"
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </button>
  );
}

