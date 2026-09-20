import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useState } from 'react';

/**
 * Customer in-app notification inbox.
 */
export function CustomerNotificationsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['notifications', 'me', page],
    queryFn: async () => {
      const payload = await apiClient.get(`/notifications?page=${page}&pageSize=20`);
      return payload.data;
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ action, id }) => apiClient.patch('/notifications', { action, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => notify.error(error.message || 'Update failed'),
  });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
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

  const { items, pagination, unreadCount } = listQuery.data;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Notifications</h1>
          <p className="mt-1 text-sm text-muted">
            {unreadCount ? `${unreadCount} unread` : 'You are caught up.'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            loading={markMutation.isPending}
            onClick={() => markMutation.mutate({ action: 'read_all' })}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Order and payment updates will show up here."
            action={
              <Link to="/shop" className="text-sm underline">
                Browse the shop
              </Link>
            }
          />
        ) : (
          items.map((item) => {
            const unread = item.status !== 'read' && !item.readAt;
            return (
              <article
                key={item.id}
                className={`rounded-md border border-border px-4 py-3 ${
                  unread ? 'bg-off-white' : 'bg-surface'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-charcoal">{item.title}</h2>
                      {unread ? <Badge variant="accent">New</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      {item.payload?.orderNumber ? (
                        <>
                          {' · '}
                          <Link
                            to={`/account/orders/${encodeURIComponent(item.payload.orderNumber)}`}
                            className="underline"
                          >
                            {item.payload.orderNumber}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {unread ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markMutation.mutate({ action: 'read', id: item.id })}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <Pagination
          page={pagination.page}
          pageCount={pagination.totalPages}
          onPageChange={setPage}
          className="mt-4"
        />
      ) : null}
    </div>
  );
}
