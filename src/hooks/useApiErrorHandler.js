import { useNotification } from '@/contexts/NotificationContext';
import { getErrorMessage } from '@/utils/errors';

/**
 * Hook to surface API / app errors through the toast system.
 */
export function useApiErrorHandler() {
  const { error } = useNotification();

  return (err, fallback = 'Request failed') => {
    error(getErrorMessage(err, fallback));
  };
}
