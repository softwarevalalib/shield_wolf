import { useRef } from 'react';
import { cn } from '@/utils/cn';

export function Tabs({ tabs = [], activeId, onChange, className, ...props }) {
  const listRef = useRef(null);

  const handleKeyDown = (event) => {
    if (!tabs.length) return;
    const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    const nextTab = tabs[nextIndex];
    onChange?.(nextTab.id);
    const buttons = listRef.current?.querySelectorAll('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div className={cn(className)} {...props}>
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange?.(tab.id)}
              className={cn(
                'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
                'disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-b-2 border-shield-red text-charcoal'
                  : 'border-b-2 border-transparent text-muted hover:text-charcoal'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
