/**
 * Lightweight className merger (no external dependency).
 */
export function cn(...parts) {
  return parts
    .flatMap((part) => {
      if (!part) return [];
      if (typeof part === 'string') return part.split(' ').filter(Boolean);
      if (Array.isArray(part)) return part.filter(Boolean);
      if (typeof part === 'object') {
        return Object.entries(part)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}
