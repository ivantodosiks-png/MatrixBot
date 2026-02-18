/* eslint-disable @next/next/no-html-link-for-pages */
import BodyClass from "@/components/body-class";

export default function ExitMatrixPage() {
  return (
    <>
      <BodyClass classes="matrix matrix-exit-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />

      <main className="matrix-exit-wrap">
        <p className="matrix-exit-kicker">TRANSMISSION COMPLETE</p>
        <h1 className="matrix-exit-title">You Escaped the Matrix</h1>
        <p className="matrix-exit-subtitle">
          Reality has been restored. Your signal is now outside the simulation.
        </p>

        <div className="matrix-exit-actions">
          <a className="btn primary" href="/chat">
            Enter Chat Again
          </a>
          <a className="btn ghost" href="/">
            Back to Home
          </a>
        </div>
      </main>
    </>
  );
}
