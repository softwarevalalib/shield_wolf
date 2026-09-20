import { cn } from '@/utils/cn';

const paths = {
  grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  orders: 'M6 6h12v2H6V6zm0 5h12v2H6v-2zm0 5h8v2H6v-2z',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4V8zm8 4l8-4M12 12L4 8m8 4v8',
  tags: 'M4 6h7l9 9-4 4-9-9V6zm3.5 2.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  layers: 'M12 4l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z',
  users:
    'M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1m10-10a3 3 0 11-6 0 3 3 0 016 0zm6 10v-1a3 3 0 00-2-2.8',
  percent:
    'M6 18L18 6M8.5 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm10 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  megaphone: 'M4 10v4h3l6 4V6L7 10H4zm13 1a3 3 0 010 2',
  truck:
    'M3 7h11v10H3V7zm11 3h4l3 3v4h-7v-7zM7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  board: 'M4 4h6v16H4V4zm10 0h6v10h-6V4z',
  rider: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  vehicle:
    'M5 17h14v-5l-2-4H7l-2 4v5zm2 0a2 2 0 11-4 0 2 2 0 014 0zm12 0a2 2 0 11-4 0 2 2 0 014 0z',
  map: 'M9 4l6 2 5-2v14l-5 2-6-2-5 2V6l5-2zm0 0v14m6-12v14',
  sliders: 'M4 8h10M18 8h2M12 16h8M4 16h4M14 6v4M8 14v4',
  chart: 'M4 19h16M7 16V9m5 7V5m5 11v-6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h5v5',
  card: 'M3 7h18v10H3V7zm0 3h18',
  swap: 'M7 8h12l-3-3M17 16H5l3 3',
  file: 'M7 3h7l5 5v13H7V3zm7 0v5h5',
  receipt: 'M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3zm4 5h4m-4 4h4m-4 4h2',
  wallet: 'M3 7h18v12H3V7zm14 4h4v4h-4a2 2 0 110-4z',
  undo: 'M9 14l-4-4 4-4m-4 4h9a5 5 0 010 10h-2',
  report: 'M6 3h9l5 5v13H6V3zm9 0v5h5M9 12h6m-6 4h4',
  ticket:
    'M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8z',
  image: 'M4 5h16v14H4V5zm3 10l3-4 2 3 3-4 3 5',
  quote:
    'M8 8h4v4H9a3 3 0 00-3 3v1h4v4H4v-3a7 7 0 017-7zm8 0h4v4h-3a3 3 0 00-3 3v1h4v4h-6v-3a7 7 0 017-7z',
  bell: 'M12 4a5 5 0 015 5v3l2 3H5l2-3V9a5 5 0 015-5zm-2 14a2 2 0 004 0',
  home: 'M4 11l8-7 8 7v9H4v-9z',
  info: 'M12 4a8 8 0 100 16 8 8 0 000-16zm0 7v5m0-8h.01',
  help: 'M12 4a8 8 0 100 16 8 8 0 000-16zm0 12h.01M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5',
  mail: 'M4 6h16v12H4V6zm0 0l8 7 8-7',
  badge: 'M12 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z',
  key: 'M14 8a4 4 0 11-1.2 7.8L8 20H5v-3l4.8-4.8A4 4 0 0114 8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  settings:
    'M12 9a3 3 0 100 6 3 3 0 000-6zm8 3a8 8 0 01-.3 2.1l2 1.5-2 3.5-2.4-1a8 8 0 01-1.8 1l-.3 2.6H9.8L9.5 19a8 8 0 01-1.8-1l-2.4 1-2-3.5 2-1.5A8 8 0 014 12c0-.7.1-1.4.3-2.1l-2-1.5 2-3.5 2.4 1a8 8 0 011.8-1L9.8 3h4.4l.3 2.6a8 8 0 011.8 1l2.4-1 2 3.5-2 1.5c.2.7.3 1.4.3 2.1z',
  building: 'M5 21V5h10v16H5zm10-10h4v10h-4M8 8h2m-2 4h2m-2 4h2',
  store: 'M4 8l2-4h12l2 4v2a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3v5h14',
  lock: 'M7 11V8a5 5 0 0110 0v3m-11 0h12v10H6V11z',
  plug: 'M9 7v4m6-4v4M8 11h8v3a4 4 0 01-4 4v3',
};

/**
 * Lightweight admin nav icons (no icon package dependency).
 */
export function AdminNavIcon({ name, className }) {
  const d = paths[name] || paths.grid;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
