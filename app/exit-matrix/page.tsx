/* eslint-disable @next/next/no-html-link-for-pages */
import BodyClass from "@/components/body-class";

export default function ExitMatrixPage() {
  return (
    <>
      <BodyClass classes="matrix matrix-exit-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />

      <main className="matrix-exit-wrap">
        <p className="matrix-exit-kicker">SYSTEM MESSAGE</p>
        <h1 className="matrix-exit-title">
          {"\u0412\u044b \u0432\u044b\u0448\u043b\u0438 \u0438\u0437 \u043c\u0430\u0442\u0440\u0438\u0446\u044b"}
        </h1>
        <p className="matrix-exit-subtitle">
          {
            "\u0421\u0435\u043a\u0440\u0435\u0442\u043d\u044b\u0439 \u043a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d. \u0420\u0435\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0438\u0441\u0430\u043d\u0430, \u0441\u0435\u0430\u043d\u0441 \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0435\u043d \u0432 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u0439 \u0440\u0435\u0436\u0438\u043c."
          }
        </p>

        <div className="matrix-exit-actions">
          <a className="btn primary" href="/chat">
            {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u0447\u0430\u0442"}
          </a>
          <a className="btn ghost" href="/">
            {"\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e"}
          </a>
        </div>
      </main>
    </>
  );
}
