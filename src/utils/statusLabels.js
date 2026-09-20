const STATUS_META = {
  pending: { label: 'Pending', variant: 'warning', icon: '…' },
  awaiting_payment: { label: 'Awaiting payment', variant: 'warning', icon: '…' },
  pending_verification: { label: 'Pending verification', variant: 'warning', icon: '…' },
  confirmed: { label: 'Confirmed', variant: 'info', icon: '✓' },
  paid: { label: 'Paid', variant: 'success', icon: '✓' },
  processing: { label: 'Processing', variant: 'info', icon: '↻' },
  packed: { label: 'Packed', variant: 'info', icon: '▣' },
  ready_for_dispatch: { label: 'Ready for dispatch', variant: 'info', icon: '▣' },
  out_for_delivery: { label: 'Out for delivery', variant: 'accent', icon: '→' },
  delivered: { label: 'Delivered', variant: 'success', icon: '✓' },
  cancelled: { label: 'Cancelled', variant: 'danger', icon: '×' },
  refunded: { label: 'Refunded', variant: 'neutral', icon: '↺' },
  rejected: { label: 'Rejected', variant: 'danger', icon: '×' },
  assigned: { label: 'Assigned', variant: 'info', icon: '→' },
  picked_up: { label: 'Picked up', variant: 'info', icon: '→' },
  failed: { label: 'Failed', variant: 'danger', icon: '×' },
  attempted: { label: 'Attempted', variant: 'warning', icon: '…' },
  scheduled: { label: 'Scheduled', variant: 'info', icon: '…' },
  returned: { label: 'Returned', variant: 'neutral', icon: '↺' },
};

export function getStatusMeta(status) {
  const key = String(status || '')
    .trim()
    .toLowerCase();
  return (
    STATUS_META[key] || {
      label: status ? String(status).replace(/_/g, ' ') : 'Unknown',
      variant: 'neutral',
      icon: '•',
    }
  );
}

export function formatStatusLabel(status) {
  return getStatusMeta(status).label;
}
