import { useMemo, useState } from 'react';
import { SearchInput } from '@/components/forms/SearchInput';
import { Table } from '@/components/common/Table';
import { cn } from '@/utils/cn';

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable({
  columns = [],
  rows = [],
  searchable = false,
  searchPlaceholder = 'Search…',
  searchKeys,
  sortable = false,
  emptyMessage = 'No data to display.',
  className,
  ...props
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filteredRows = useMemo(() => {
    let next = rows;

    if (searchable && query.trim()) {
      const needle = query.trim().toLowerCase();
      const keys = searchKeys || columns.map((column) => column.key).filter(Boolean);

      next = next.filter((row) =>
        keys.some((key) =>
          String(row[key] ?? '')
            .toLowerCase()
            .includes(needle)
        )
      );
    }

    if (sortable && sortKey) {
      next = [...next].sort((a, b) => {
        const result = compareValues(a[sortKey], b[sortKey]);
        return sortDir === 'asc' ? result : -result;
      });
    }

    return next;
  }, [rows, searchable, query, searchKeys, columns, sortable, sortKey, sortDir]);

  const enhancedColumns = useMemo(() => {
    if (!sortable) return columns;

    return columns.map((column) => {
      if (column.sortable === false) return column;

      const active = sortKey === column.key;
      return {
        ...column,
        header: (
          <button
            type="button"
            onClick={() => {
              if (sortKey === column.key) {
                setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortKey(column.key);
                setSortDir('asc');
              }
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm font-medium',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red'
            )}
            aria-label={`Sort by ${typeof column.header === 'string' ? column.header : column.key}`}
          >
            {column.header}
            <span aria-hidden="true" className="text-xs text-muted">
              {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
            </span>
          </button>
        ),
      };
    });
  }, [columns, sortable, sortKey, sortDir]);

  return (
    <div className={cn('space-y-3', className)} {...props}>
      {searchable ? (
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          placeholder={searchPlaceholder}
        />
      ) : null}
      <Table columns={enhancedColumns} rows={filteredRows} emptyMessage={emptyMessage} />
    </div>
  );
}
