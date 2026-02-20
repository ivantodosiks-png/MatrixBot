import BodyClass from "@/components/body-class";

const sections = [
  {
    title: "Hero Block",
    text: "Lenis runs from the root layout with a RAF loop, so page movement stays stable and lightweight.",
  },
  {
    title: "Performance Block",
    text: "No CSS smooth behavior, no extra smooth-scroll engine, and reduced-motion users automatically get native scrolling.",
  },
  {
    title: "Mobile Block",
    text: "Touch scroll uses Lenis sync touch mode while keeping inertia soft and controlled.",
  },
  {
    title: "Diagnostics Block",
    text: "If you still see jitter, disable duplicate wheel handlers and heavy effects attached to scroll.",
  },
];

export default function SmoothScrollExamplePage() {
  return (
    <>
      <BodyClass classes="matrix landing" />
      <main className="relative z-10 px-4 py-12 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-3xl border border-cyan-200/20 bg-slate-950/60 p-8 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/60">Smooth Scroll Demo</p>
            <h1 className="mt-3 text-3xl font-semibold text-cyan-50 md:text-4xl">
              Matrix inertial scroll baseline
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-cyan-100/70 md:text-base">
              Scroll this page to validate that movement is fluid, lightweight, and free from stutter.
            </p>
          </section>

          {sections.map((section, index) => (
            <section
              key={section.title}
              className="min-h-[70vh] rounded-3xl border border-cyan-200/15 bg-slate-950/52 p-8 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/55">Section {index + 1}</p>
              <h2 className="mt-3 text-2xl font-semibold text-cyan-50">{section.title}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-cyan-100/70 md:text-base">
                {section.text}
              </p>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
