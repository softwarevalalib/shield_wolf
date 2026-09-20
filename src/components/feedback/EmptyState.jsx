/**
 * Empty-state foundation for major interfaces.
 */
export function EmptyState({ title, description, action = null }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <h2 className="mb-2 text-base font-medium text-charcoal">{title}</h2>
      {description ? (
        <p className="mx-auto mb-4 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
