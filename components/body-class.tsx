"use client";

import { useEffect } from "react";

type BodyClassProps = {
  classes: string;
};

export default function BodyClass({ classes }: BodyClassProps) {
  useEffect(() => {
    const tokens = classes
      .split(" ")
      .map((v) => v.trim())
      .filter(Boolean);

    document.body.classList.add(...tokens);

    return () => {
      document.body.classList.remove(...tokens);
    };
  }, [classes]);

  return null;
}
