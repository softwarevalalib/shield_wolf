/**
 * Responsive breakpoint helpers aligned with Tailwind theme.
 */
export const breakpoints = {
  xs: 320,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
};

export function matchesMinWidth(px) {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(min-width: ${px}px)`).matches;
}
