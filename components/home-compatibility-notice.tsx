"use client";

import { useEffect, useState } from "react";

const NOTICE_STORAGE_KEY = "matrix_home_notice_seen_v1";

export default function HomeCompatibilityNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem(NOTICE_STORAGE_KEY);
      if (!seen) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNotice();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  function closeNotice() {
    try {
      window.sessionStorage.setItem(NOTICE_STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="lp-compat-notice-backdrop" onClick={closeNotice}>
      <section
        className="lp-compat-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lpCompatNoticeTitle"
        aria-describedby="lpCompatNoticeText"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="lp-compat-notice-icon-close"
          onClick={closeNotice}
          aria-label="Close compatibility notice"
        >
          Close
        </button>
        <h2 id="lpCompatNoticeTitle">Compatibility notice</h2>
        <p id="lpCompatNoticeText">
          Thanks for visiting. Because browsers, operating systems, and device
          types (desktop, tablet, mobile) can behave differently, you may
          occasionally notice minor visual or functional inconsistencies. If
          something does not work as expected, please update your browser or
          try another modern browser for the best experience.
        </p>
        <button type="button" className="lp-compat-notice-close" onClick={closeNotice}>
          Got it
        </button>
      </section>
    </div>
  );
}
