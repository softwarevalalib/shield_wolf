/**
 * Phase-safe route placeholder.
 * Declares intended screens without fabricating business UI or mock data.
 */
export function RoutePlaceholder({ title, scope }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{scope}</p>
      <h1 className="mb-3 text-2xl font-semibold text-charcoal">{title}</h1>
      <p className="text-muted">
        This route is registered as part of the Phase 1 architecture. Feature implementation follows
        in later phases per the master specification.
      </p>
    </section>
  );
}
