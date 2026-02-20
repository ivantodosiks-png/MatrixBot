import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CursorRing from "@/components/CursorRing";

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
    <html lang="en" className="app-preload">
      <body>
        <SmoothScrollProvider
          lerp={0.09}
          wheelMultiplier={0.9}
          touchMultiplier={1}
          smoothWheel
          smoothTouch
        >
          <CursorRing lerp={0.22} size={42} />
          <div className="ambient-layer ambient-particles" aria-hidden="true" />
          <div className="ambient-layer ambient-glowdots" aria-hidden="true" />
          <div className="ambient-layer ambient-rain" aria-hidden="true" />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
