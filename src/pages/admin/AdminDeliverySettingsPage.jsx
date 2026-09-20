import { Link } from 'react-router-dom';

const LINKS = [
  {
    to: '/admin/delivery-zones',
    title: 'Delivery zones',
    body: 'Manage coverage areas, fees, and free-delivery thresholds used at checkout.',
  },
  {
    to: '/admin/drivers',
    title: 'Drivers / riders',
    body: 'Maintain the rider roster used when assigning deliveries.',
  },
  {
    to: '/admin/vehicles',
    title: 'Vehicles',
    body: 'Register bikes and vans available for dispatch.',
  },
  {
    to: '/admin/deliveries/dispatch',
    title: 'Dispatch board',
    body: 'Move active deliveries through the operational pipeline.',
  },
];

/**
 * Thin hub for delivery configuration — deeper settings land in later phases.
 */
export function AdminDeliverySettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Delivery settings</h1>
      <p className="mt-1 text-sm text-muted">
        Operational delivery configuration. Zone fees and fleet live in the linked modules.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
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
