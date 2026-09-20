import { useState } from 'react';
import { cn } from '@/utils/cn';

export function Accordion({ items = [], defaultOpenId = null, className, ...props }) {
  const [openId, setOpenId] = useState(defaultOpenId);

  return (
    <div className={cn('divide-y divide-border border-y border-border', className)} {...props}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `accordion-panel-${item.id}`;
        const buttonId = `accordion-button-${item.id}`;

        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-1 py-3 text-left text-sm font-medium text-charcoal',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red rounded-md'
                )}
              >
                {item.title}
                <span
                  aria-hidden="true"
                  className={cn('text-muted transition-transform', isOpen && 'rotate-180')}
                >
                  ▾
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-1 pb-3 text-sm text-muted"
            >
              {isOpen ? item.content : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
