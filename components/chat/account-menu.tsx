"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";

type AccountMenuProps = {
  name: string;
  email: string;
};

type ModalType = "profile" | "settings" | null;

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
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    if (!activeModal) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeModal]);

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
                      href="/"
                      className={`flex w-full items-center rounded-xl px-3 py-2.5 transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Home
                    </Link>
                  )}
                </MenuItem>

                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href="/pricing"
                      className={`mt-1 flex w-full items-center rounded-xl px-3 py-2.5 transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Subscriptions
                    </Link>
                  )}
                </MenuItem>

                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={() => setActiveModal("profile")}
                      className={`mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Profile
                    </button>
                  )}
                </MenuItem>

                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={() => setActiveModal("settings")}
                      className={`mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
                        focus ? "bg-cyan-400/15 text-cyan-100" : "text-cyan-50/90"
                      }`}
                    >
                      Settings
                    </button>
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

          <AnimatePresence>
            {activeModal ? (
              <motion.div
                key={activeModal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-start justify-end bg-slate-950/55 p-4 backdrop-blur-[2px] md:p-6"
                onClick={() => setActiveModal(null)}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-sm rounded-2xl border border-cyan-200/25 bg-slate-950/88 p-4 text-cyan-50 shadow-[0_26px_60px_rgba(2,6,23,0.78),0_0_0_1px_rgba(103,232,249,0.15)] backdrop-blur-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200/20 bg-slate-900/65 text-cyan-100/80 transition hover:border-cyan-200/45 hover:bg-slate-900/90 hover:text-cyan-100"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>

                  {activeModal === "profile" ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/60">Account</p>
                      <h3 className="mt-2 text-lg font-semibold text-cyan-50">Profile</h3>
                      <div className="mt-4 rounded-xl border border-cyan-200/15 bg-slate-900/55 p-3">
                        <p className="truncate text-sm font-semibold text-cyan-50">{name}</p>
                        <p className="truncate text-xs text-cyan-100/65">{email}</p>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-cyan-100/80">
                        <p>Current workspace: Matrix Console</p>
                        <p>Security: Session active</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/60">Preferences</p>
                      <h3 className="mt-2 text-lg font-semibold text-cyan-50">Settings</h3>
                      <div className="mt-4 space-y-2 rounded-xl border border-cyan-200/15 bg-slate-900/55 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/70">Interface</span>
                          <span className="text-cyan-50">Matrix Neo</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/70">Language</span>
                          <span className="text-cyan-50">English</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/70">Notifications</span>
                          <span className="text-cyan-50">Email enabled</span>
                        </div>
                      </div>
                      <Link
                        href="/pricing"
                        className="mt-3 inline-flex rounded-xl border border-cyan-200/25 bg-slate-900/65 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-200/45 hover:bg-slate-900/90"
                      >
                        Manage subscription
                      </Link>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
}
