import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';

/**
 * Admin notification log — all channels from the abstracted dispatcher.
 */
export function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    q: searchParams.get('q') || '',
    channel: searchParams.get('channel') || 'all',
    eventType: searchParams.get('eventType') || 'all',
    page: Number(searchParams.get('page') || 1),
  };

  const listQuery = useQuery({
    queryKey: ['admin', 'notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('channel', filters.channel);
      if (filters.eventType !== 'all') params.set('eventType', filters.eventType);
      params.set('page', String(filters.page));
      params.set('pageSize', '30');
      const payload = await apiClient.get(`/admin/notifications?${params}`);
      return payload.data;
    },
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || (key === 'page' && Number(value) === 1)) {
      next.delete(key === 'page' ? 'page' : key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (listQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load notifications"
        description={listQuery.error?.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { items, pagination, eventTypes } = listQuery.data;
  const columns = [
    {
      key: 'createdAt',
      header: 'When',
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      key: 'eventType',
      header: 'Event',
      render: (v) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (v) => <Badge variant="neutral">{v}</Badge>,
    },
    {
      key: 'title',
      header: 'Message',
      render: (_v, row) => (
        <div>
          <p className="font-medium text-charcoal">{row.title}</p>
          <p className="line-clamp-2 text-sm text-muted">{row.body}</p>
        </div>
      ),
    },
    {
      key: 'userEmail',
      header: 'Recipient',
      render: (v, row) => v || (row.userId ? row.userId.slice(0, 8) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge variant={v === 'sent' || v === 'read' ? 'success' : 'warning'}>{v}</Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Notifications</h1>
          <p className="mt-1 text-sm text-muted">
            In-app, email, and future SMS/WhatsApp dispatches. Providers stay abstracted.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })}
        >
          Refresh
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input
          label="Search"
          value={filters.q}
          onChange={(e) => updateFilter('q', e.target.value)}
          placeholder="Title, body, event"
        />
        <Select
          label="Channel"
          value={filters.channel}
          onChange={(e) => updateFilter('channel', e.target.value)}
          options={[
            { value: 'all', label: 'All channels' },
            { value: 'in_app', label: 'In-app' },
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ]}
        />
        <Select
          label="Event"
          value={filters.eventType}
          onChange={(e) => updateFilter('eventType', e.target.value)}
          options={[
            { value: 'all', label: 'All events' },
            ...(eventTypes || []).map((event) => ({ value: event, label: event })),
          ]}
        />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Order and payment events will appear here as they are dispatched."
          />
        ) : (
          <>
            <Table columns={columns} rows={items} getRowKey={(row) => row.id} />
            <Pagination
              page={pagination.page}
              pageCount={pagination.totalPages}
              onPageChange={(page) => updateFilter('page', page)}
              className="mt-4"
            />
          </>
        )}
      </div>

      <p className="mt-4 text-sm text-muted">
        Your personal inbox is also on the top-bar Alerts menu.{' '}
        <Link to="/account/notifications" className="underline">
          Customer inbox
        </Link>{' '}
        is available for logged-in shoppers.
      </p>
    </div>
  );
}
