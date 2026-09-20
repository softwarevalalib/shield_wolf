import { Link } from 'react-router-dom';

const REPORTS = [
  {
    to: '/admin/reports/sales',
    title: 'Sales',
    body: 'Daily sales, gross/net totals, and average order value.',
  },
  {
    to: '/admin/reports/orders',
    title: 'Orders',
    body: 'Orders in range by status with line listing.',
  },
  {
    to: '/admin/reports/products',
    title: 'Products',
    body: 'Best sellers and slow-moving products.',
  },
  {
    to: '/admin/reports/customers',
    title: 'Customers',
    body: 'Spend and order counts by customer contact.',
  },
  {
    to: '/admin/reports/inventory',
    title: 'Inventory',
    body: 'Low stock, out of stock, and stock value estimate.',
  },
  {
    to: '/admin/reports/delivery',
    title: 'Delivery',
    body: 'Delivery volume and success rate by status.',
  },
  {
    to: '/admin/reports/finance',
    title: 'Finance',
    body: 'Payment collection, outstanding, expenses, profitability.',
  },
];

/**
 * Reports hub — links to date-filtered operational reports.
 */
export function AdminReportsHubPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Reports</h1>
      <p className="mt-1 text-sm text-muted">
        Date-filtered operational reports from live data. Export CSV where permitted.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="block rounded-md border border-border bg-surface p-4 hover:border-charcoal/30"
            >
              <p className="font-medium text-charcoal">{item.title}</p>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
