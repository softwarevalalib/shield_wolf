import { useLoading } from '@/contexts/LoadingContext';

/**
 * Global loading indicator foundation (non-blocking bar).
 */
export function GlobalLoadingIndicator() {
  const { isGlobalLoading } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-border"
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
    >
      <div className="h-full w-1/3 animate-pulse bg-shield-red" />
    </div>
  );
}
