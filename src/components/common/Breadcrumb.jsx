import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function Breadcrumb({ items = [], className, ...props }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn(className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-border">
                  /
                </span>
              ) : null}
              {isLast || !item.to ? (
                <span
                  className={cn(isLast && 'font-medium text-charcoal')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="hover:text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red rounded-sm"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
