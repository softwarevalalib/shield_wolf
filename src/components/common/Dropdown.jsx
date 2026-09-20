import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function Dropdown({ trigger, items = [], align = 'left', className, menuClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemClass = cn(
    'block w-full px-3 py-2 text-left text-sm text-charcoal hover:bg-off-white',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-shield-red'
  );

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-charcoal',
          'hover:bg-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red'
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-soft',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {items.map((item, index) => {
            const key = `${item.label}-${index}`;
            const closeAndRun = () => {
              setOpen(false);
              item.onClick?.();
            };

            if (item.to) {
              return (
                <Link
                  key={key}
                  role="menuitem"
                  to={item.to}
                  className={itemClass}
                  onClick={closeAndRun}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={closeAndRun}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
