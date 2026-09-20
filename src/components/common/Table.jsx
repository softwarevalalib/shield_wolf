import { cn } from '@/utils/cn';

export function Table({
  columns = [],
  rows = [],
  emptyMessage = 'No data to display.',
  className,
  getRowKey,
  ...props
}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)} {...props}>
      <table className="w-full min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('px-3 py-2 font-medium text-muted', column.headerClassName)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="px-3 py-8 text-center text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const key =
                typeof getRowKey === 'function'
                  ? getRowKey(row, rowIndex)
                  : (row.id ?? row.key ?? rowIndex);

              return (
                <tr key={key} className="border-b border-border last:border-b-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-3 py-2.5 text-charcoal', column.cellClassName)}
                    >
                      {typeof column.render === 'function'
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
