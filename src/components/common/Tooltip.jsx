import { useId, useState } from 'react';
import { cn } from '@/utils/cn';

export function Tooltip({ children, content, className, ...props }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  if (!content) {
    return children;
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...props}
    >
      <span title={content} aria-describedby={open ? tooltipId : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-xs text-white"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
