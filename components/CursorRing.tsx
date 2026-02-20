"use client";

import { useEffect, useRef, useState } from "react";

type CursorRingProps = {
  lerp?: number;
  size?: number;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, [role='button'], input[type='submit'], input[type='button']"
    )
  );
}

export default function CursorRing({ lerp = 0.11, size = 34 }: CursorRingProps) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const anyFinePointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const anyCoarsePointer = window.matchMedia("(any-pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateEnabled = () => {
      const hasFine = finePointer.matches || anyFinePointer.matches;
      const coarseOnly = anyCoarsePointer.matches && !hasFine;
      const likelyDesktop = window.innerWidth >= 1024;
      const next = !reducedMotion.matches && !coarseOnly && (hasFine || likelyDesktop);
      setEnabled(next);
      root.classList.toggle("cursor-ring-enabled", next);
      if (!next) {
        root.classList.remove("cursor-ring-clicking");
      }
    };

    updateEnabled();
    finePointer.addEventListener("change", updateEnabled);
    anyFinePointer.addEventListener("change", updateEnabled);
    anyCoarsePointer.addEventListener("change", updateEnabled);
    reducedMotion.addEventListener("change", updateEnabled);
    window.addEventListener("resize", updateEnabled, { passive: true });

    return () => {
      finePointer.removeEventListener("change", updateEnabled);
      anyFinePointer.removeEventListener("change", updateEnabled);
      anyCoarsePointer.removeEventListener("change", updateEnabled);
      reducedMotion.removeEventListener("change", updateEnabled);
      window.removeEventListener("resize", updateEnabled);
      root.classList.remove("cursor-ring-enabled", "cursor-ring-clicking");
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ringRef.current || typeof window === "undefined") return;

    const root = document.documentElement;
    const ring = ringRef.current;
    const current = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      scale: 1,
    };
    const target = { ...current };

    let rafId = 0;
    let isVisible = false;
    let isPressed = false;
    let isHoveringInteractive = false;

    const setVisible = (next: boolean) => {
      if (isVisible === next) return;
      isVisible = next;
      ring.dataset.visible = next ? "true" : "false";
    };

    const applyTargetScale = () => {
      if (isPressed) {
        target.scale = 0.88;
        return;
      }
      target.scale = isHoveringInteractive ? 1.12 : 1;
    };

    const setPressed = (next: boolean) => {
      if (isPressed === next) return;
      isPressed = next;
      ring.dataset.pressed = next ? "true" : "false";
      root.classList.toggle("cursor-ring-clicking", next);
      applyTargetScale();
    };

    const setHoveringInteractive = (next: boolean) => {
      if (isHoveringInteractive === next) return;
      isHoveringInteractive = next;
      ring.dataset.hover = next ? "true" : "false";
      applyTargetScale();
    };

    const animate = () => {
      current.x += (target.x - current.x) * lerp;
      current.y += (target.y - current.y) * lerp;
      current.scale += (target.scale - current.scale) * 0.2;

      ring.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate3d(-50%, -50%, 0) scale(${current.scale})`;
      rafId = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      target.x = event.clientX;
      target.y = event.clientY;
      setVisible(true);
      setHoveringInteractive(isInteractiveTarget(event.target));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      setPressed(true);
    };
    const onMouseDown = () => {
      setPressed(true);
    };

    const onPointerUp = () => {
      setPressed(false);
    };

    const onMouseMove = (event: MouseEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      setVisible(true);
      const hovered = document.elementFromPoint(event.clientX, event.clientY);
      setHoveringInteractive(isInteractiveTarget(hovered));
    };

    const onPointerLeave = () => {
      setVisible(false);
      setPressed(false);
      setHoveringInteractive(false);
    };

    rafId = window.requestAnimationFrame(animate);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onPointerUp, { passive: true });
    window.addEventListener("blur", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("blur", onPointerLeave);
      root.classList.remove("cursor-ring-clicking");
    };
  }, [enabled, lerp]);

  if (!enabled) return null;

  return (
    <div
      ref={ringRef}
      className="cursor-ring"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="cursor-ring__particles" />
    </div>
  );
}
