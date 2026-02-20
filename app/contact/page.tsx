/* eslint-disable @next/next/no-html-link-for-pages */
import BodyClass from "@/components/body-class";
import ContactForm from "@/components/contact-form";

export default function ContactPage() {
  return (
    <>
      <BodyClass classes="matrix contact-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <main className="contact-shell">
        <section className="contact-panel reveal-on-scroll">
          <div className="contact-top">
            <h1>Contact</h1>
            <a className="lp-btn lp-btn-secondary" href="/">
              Back home
            </a>
          </div>
          <p className="contact-subtitle">
            Send us a message via SMTP through Vercel Serverless Function.
          </p>
          <ContactForm />
        </section>
      </main>
    </>
  );
}
