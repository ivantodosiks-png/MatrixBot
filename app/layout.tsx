import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";

export const metadata: Metadata = {
  title: "Matrix GPT",
  description: "Matrix GPT AI workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider
          lerp={0.09}
          wheelMultiplier={1}
          touchMultiplier={1}
          smoothWheel
          smoothTouch
        >
          <div className="ambient-layer ambient-particles" aria-hidden="true" />
          <div className="ambient-layer ambient-glowdots" aria-hidden="true" />
          <div className="ambient-layer ambient-rain" aria-hidden="true" />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
