import { useEffect, useState } from 'react';
import { breakpoints, matchesMinWidth } from '@/utils/breakpoints';

/**
 * Responsive breakpoint hook foundation.
 */
export function useMediaQuery(minWidthPx) {
  const [matches, setMatches] = useState(() => matchesMinWidth(minWidthPx));

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [minWidthPx]);

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.lg);
}
