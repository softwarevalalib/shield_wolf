/**
 * Error-state foundation with optional retry.
 */
export function ErrorState({ title = 'Unable to load', description, onRetry }) {
  return (
    <div
      className="rounded-lg border border-danger/20 bg-surface px-6 py-10 text-center"
      role="alert"
    >
      <h2 className="mb-2 text-base font-medium text-charcoal">{title}</h2>
      {description ? (
        <p className="mx-auto mb-4 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-charcoal px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
