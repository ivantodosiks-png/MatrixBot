"use client";

import { type ReactNode, useEffect } from "react";
import Lenis, { type LenisOptions } from "lenis";
import "lenis/dist/lenis.css";

type SmoothScrollProviderProps = {
  children: ReactNode;
  lerp?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
  smoothWheel?: boolean;
  smoothTouch?: boolean;
};

export default function SmoothScrollProvider({
  children,
  lerp = 0.09,
  wheelMultiplier = 1,
  touchMultiplier = 1,
  smoothWheel = true,
  smoothTouch = true,
}: SmoothScrollProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = window.document.documentElement;
    root.classList.remove("app-preload");
    root.classList.add("app-mounted");

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "auto";

    const options: LenisOptions = {
      lerp,
      wheelMultiplier,
      touchMultiplier,
      smoothWheel,
      syncTouch: smoothTouch,
      allowNestedScroll: true,
      prevent: (node) =>
        node instanceof Element && Boolean(node.closest(".chat-scroll-area")),
      autoRaf: false,
    };
    const lenis = new Lenis(options);

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };
    frameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [lerp, smoothTouch, smoothWheel, touchMultiplier, wheelMultiplier]);

  return <>{children}</>;
}
