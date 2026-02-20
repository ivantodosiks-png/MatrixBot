"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";

type AccountMenuProps = {
  name: string;
  email: string;
};

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AccountMenu({ name, email }: AccountMenuProps) {
  const initials = initialsFromName(name || email);

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuButton className="group flex items-center gap-3 rounded-2xl border border-cyan-300/25 bg-slate-900/70 px-2 py-2 text-left text-cyan-50 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_10px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:border-cyan-200/45 hover:bg-slate-900/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/35 bg-gradient-to-br from-cyan-300/25 to-blue-400/20 font-semibold tracking-wide text-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.32)]">
              {initials}
            </span>
            <span className="hidden min-w-0 md:flex md:flex-col">
              <span className="truncate text-sm font-semibold text-cyan-50">{name}</span>
              <span className="truncate text-xs text-cyan-100/65">{email}</span>
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={`h-4 w-4 text-cyan-200/80 transition ${open ? "rotate-180" : ""}`}
            >
              <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </MenuButton>

          <AnimatePresence>
            {open ? (
              <MenuItems
                static
                as={motion.div}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                anchor="bottom end"
                className="z-40 mt-3 w-64 origin-top-right rounded-2xl border border-cyan-200/20 bg-slate-950/78 p-2 text-sm text-cyan-50 shadow-[0_20px_48px_rgba(2,6,23,0.7),0_0_0_1px_rgba(103,232,249,0.12)] backdrop-blur-2xl focus:outline-none"
              >
                <div className="mb-2 rounded-xl border border-cyan-200/10 bg-slate-900/55 p-3">
                  <p className="truncate text-sm font-semibold text-cyan-50">{name}</p>
                  <p className="truncate text-xs text-cyan-100/65">{email}</p>
                </div>

                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href="/account"
                      className={`flex w-full items-center rounded-xl px-3 py-2.5 transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Profile
                    </Link>
                  )}
                </MenuItem>

                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href="/account?tab=settings"
                      className={`mt-1 flex w-full items-center rounded-xl px-3 py-2.5 transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Settings
                    </Link>
                  )}
                </MenuItem>

                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className={`mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
                        focus
                          ? "bg-rose-500/20 text-rose-100"
                          : "text-rose-200/95"
                      }`}
                    >
                      Logout
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
}
