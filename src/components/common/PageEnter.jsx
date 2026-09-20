import { cn } from '@/utils/cn';

/**
 * Subtle page/section enter motion. Honors prefers-reduced-motion via CSS.
 */
export function PageEnter({ children, className, delay = 0 }) {
  return (
    <div
      className={cn('motion-safe:animate-[fadeUp_0.5s_ease-out]', className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
