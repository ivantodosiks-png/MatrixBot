"use client";

import { type ReactNode, useEffect, useState } from "react";
import Lenis, { type LenisOptions } from "lenis";

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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "auto";

    const options: LenisOptions = {
      lerp,
      wheelMultiplier,
      touchMultiplier,
      smoothWheel,
      syncTouch: smoothTouch,
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
  }, [lerp, reducedMotion, smoothTouch, smoothWheel, touchMultiplier, wheelMultiplier]);

  return <>{children}</>;
}
