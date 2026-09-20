import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
