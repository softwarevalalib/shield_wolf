import { cn } from '@/utils/cn';

/**
 * Skip link for keyboard users — first focusable control in each shell.
 */
export function SkipToContent({ href = '#main-content', className }) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50',
        'focus:rounded-md focus:bg-charcoal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white',
        'focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-gold',
        className
      )}
    >
      Skip to main content
    </a>
  );
}
