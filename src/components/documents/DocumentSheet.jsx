function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function formatAddress(address) {
  if (!address) return null;
  if (typeof address === 'string') return address;
  return [address.line, address.city, address.country].filter(Boolean).join(', ');
}

/**
 * Printable invoice / receipt sheet (shared by admin + customer).
 */
export function DocumentSheet({ document, variant = 'invoice' }) {
  if (!document) return null;

  const business = document.business || {};
  const snapshot = document.snapshot || {};
  const currency = document.currency || snapshot.currency || 'LRD';
  const isReceipt = variant === 'receipt';
  const title = isReceipt ? 'Receipt' : 'Invoice';
  const number = isReceipt ? document.receiptNumber : document.invoiceNumber;
  const issuedLabel = isReceipt ? 'Paid' : 'Issued';
  const issuedAt = isReceipt ? document.paidAt : document.issuedAt;

  const phones = business.phones || [];
  const emails = business.emails || [];

  return (
    <article className="document-sheet mx-auto max-w-3xl rounded-md border border-border bg-surface p-6 text-charcoal print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">
            {business.name || 'Shield Wolf'}
          </p>
          {formatAddress(business.address) ? (
            <p className="mt-1 text-sm text-muted">{formatAddress(business.address)}</p>
          ) : null}
          {phones.length ? <p className="text-sm text-muted">{phones.join(' · ')}</p> : null}
          {emails.length ? <p className="text-sm text-muted">{emails.join(' · ')}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
          <p className="font-display text-xl font-semibold">{number}</p>
          <p className="mt-1 text-sm text-muted">
            {issuedLabel}: {issuedAt ? new Date(issuedAt).toLocaleString() : '—'}
          </p>
          {!isReceipt && document.status ? (
            <p className="mt-1 text-sm capitalize text-muted">{labelStatus(document.status)}</p>
          ) : null}
        </div>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Bill to</p>
          <p className="mt-1 font-medium">{snapshot.customer?.name || 'Customer'}</p>
          {snapshot.customer?.phone ? (
            <p className="text-muted">{snapshot.customer.phone}</p>
          ) : null}
          {snapshot.customer?.email ? (
            <p className="text-muted">{snapshot.customer.email}</p>
          ) : null}
          {snapshot.delivery ? (
            <p className="mt-2 text-muted">
              {[
                snapshot.delivery.streetLandmark,
                snapshot.delivery.community,
                snapshot.delivery.city,
                snapshot.delivery.county,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-muted">Order</p>
          <p className="mt-1 font-medium">{snapshot.orderNumber || document.orderNumber || '—'}</p>
          {snapshot.orderStatus || document.orderStatus ? (
            <p className="text-muted">
              Status: {labelStatus(snapshot.orderStatus || document.orderStatus)}
            </p>
          ) : null}
          {isReceipt || snapshot.paymentMethod ? (
            <p className="mt-2 text-muted">
              Payment: {labelStatus(document.paymentMethod || snapshot.paymentMethod || '—')}
              {(document.paymentReference || snapshot.paymentReference) &&
                ` · Ref ${document.paymentReference || snapshot.paymentReference}`}
            </p>
          ) : null}
          {!isReceipt && snapshot.paymentStatus ? (
            <p className="text-muted">Payment status: {labelStatus(snapshot.paymentStatus)}</p>
          ) : null}
        </div>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Unit</th>
            <th className="py-2 font-medium text-right">Line</th>
          </tr>
        </thead>
        <tbody>
          {(snapshot.items || []).map((item, index) => (
            <tr key={`${item.name}-${index}`} className="border-b border-border/70">
              <td className="py-2">
                {item.name}
                {item.size ? <span className="text-muted"> · {item.size}</span> : null}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{formatMoney(item.unitPrice, currency)}</td>
              <td className="py-2 text-right">{formatMoney(item.lineTotal, currency)}</td>
            </tr>
          ))}
          {!(snapshot.items || []).length ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted">
                No line items in snapshot
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatMoney(snapshot.subtotal, currency)}</dd>
        </div>
        {Number(snapshot.discountAmount) > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Discount</dt>
            <dd>−{formatMoney(snapshot.discountAmount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Delivery</dt>
          <dd>{formatMoney(snapshot.deliveryFee, currency)}</dd>
        </div>
        {Number(snapshot.taxAmount) > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Tax</dt>
            <dd>{formatMoney(snapshot.taxAmount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
          <dt>{isReceipt ? 'Amount paid' : 'Total due'}</dt>
          <dd>
            {formatMoney(
              isReceipt
                ? (document.amountPaid ?? snapshot.total)
                : (document.amountDue ?? snapshot.total),
              currency
            )}
          </dd>
        </div>
        {!isReceipt && document.amountPaid != null ? (
          <div className="flex justify-between gap-4 text-muted">
            <dt>Amount paid</dt>
            <dd>{formatMoney(document.amountPaid, currency)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-8 text-xs text-muted print:mt-12">
        {isReceipt
          ? 'This receipt confirms payment received by Shield Wolf.'
          : 'This invoice reflects amounts charged for the order above. A separate receipt is issued when payment is confirmed.'}
      </p>
    </article>
  );
}
