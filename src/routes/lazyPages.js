import { lazy } from 'react';

/** Lazy-load a named export as a default for React.lazy. */
function lazyNamed(importer, exportName) {
  return lazy(() => importer().then((mod) => ({ default: mod[exportName] })));
}

/** Admin + secondary pages — code-split for smaller initial bundles. */
export const AdminDashboardPage = lazyNamed(
  () => import('@/pages/admin/AdminDashboardPage'),
  'AdminDashboardPage'
);
export const AdminProductsPage = lazyNamed(
  () => import('@/pages/admin/AdminProductsPage'),
  'AdminProductsPage'
);
export const AdminProductEditorPage = lazyNamed(
  () => import('@/pages/admin/AdminProductEditorPage'),
  'AdminProductEditorPage'
);
export const AdminCategoriesPage = lazyNamed(
  () => import('@/pages/admin/AdminCategoriesPage'),
  'AdminCategoriesPage'
);
export const AdminInventoryPage = lazyNamed(
  () => import('@/pages/admin/AdminInventoryPage'),
  'AdminInventoryPage'
);
export const AdminOrdersPage = lazyNamed(
  () => import('@/pages/admin/AdminOrdersPage'),
  'AdminOrdersPage'
);
export const AdminOrderDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminOrderDetailPage'),
  'AdminOrderDetailPage'
);
export const AdminPaymentsPage = lazyNamed(
  () => import('@/pages/admin/AdminPaymentsPage'),
  'AdminPaymentsPage'
);
export const AdminPaymentDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminPaymentDetailPage'),
  'AdminPaymentDetailPage'
);
export const AdminDeliveryDashboardPage = lazyNamed(
  () => import('@/pages/admin/AdminDeliveryDashboardPage'),
  'AdminDeliveryDashboardPage'
);
export const AdminDeliveriesPage = lazyNamed(
  () => import('@/pages/admin/AdminDeliveriesPage'),
  'AdminDeliveriesPage'
);
export const AdminDispatchBoardPage = lazyNamed(
  () => import('@/pages/admin/AdminDispatchBoardPage'),
  'AdminDispatchBoardPage'
);
export const AdminDeliveryDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminDeliveryDetailPage'),
  'AdminDeliveryDetailPage'
);
export const AdminDriversPage = lazyNamed(
  () => import('@/pages/admin/AdminDriversPage'),
  'AdminDriversPage'
);
export const AdminVehiclesPage = lazyNamed(
  () => import('@/pages/admin/AdminVehiclesPage'),
  'AdminVehiclesPage'
);
export const AdminDeliveryZonesPage = lazyNamed(
  () => import('@/pages/admin/AdminDeliveryZonesPage'),
  'AdminDeliveryZonesPage'
);
export const AdminDeliverySettingsPage = lazyNamed(
  () => import('@/pages/admin/AdminDeliverySettingsPage'),
  'AdminDeliverySettingsPage'
);
export const AdminInvoicesPage = lazyNamed(
  () => import('@/pages/admin/AdminInvoicesPage'),
  'AdminInvoicesPage'
);
export const AdminInvoiceDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminInvoiceDetailPage'),
  'AdminInvoiceDetailPage'
);
export const AdminReceiptsPage = lazyNamed(
  () => import('@/pages/admin/AdminReceiptsPage'),
  'AdminReceiptsPage'
);
export const AdminReceiptDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminReceiptDetailPage'),
  'AdminReceiptDetailPage'
);
export const AdminFinanceDashboardPage = lazyNamed(
  () => import('@/pages/admin/AdminFinanceDashboardPage'),
  'AdminFinanceDashboardPage'
);
export const AdminFinanceSalesPage = lazyNamed(
  () => import('@/pages/admin/AdminFinanceSalesPage'),
  'AdminFinanceSalesPage'
);
export const AdminExpensesPage = lazyNamed(
  () => import('@/pages/admin/AdminExpensesPage'),
  'AdminExpensesPage'
);
export const AdminTransactionsPage = lazyNamed(
  () => import('@/pages/admin/AdminTransactionsPage'),
  'AdminTransactionsPage'
);
export const AdminTransactionDetailPage = lazyNamed(
  () => import('@/pages/admin/AdminTransactionDetailPage'),
  'AdminTransactionDetailPage'
);
export const AdminRefundsPage = lazyNamed(
  () => import('@/pages/admin/AdminRefundsPage'),
  'AdminRefundsPage'
);
export const AdminReportsHubPage = lazyNamed(
  () => import('@/pages/admin/AdminReportsHubPage'),
  'AdminReportsHubPage'
);
export const AdminReportPage = lazyNamed(
  () => import('@/pages/admin/AdminReportPage'),
  'AdminReportPage'
);
export const AdminSettingsHubPage = lazyNamed(
  () => import('@/pages/admin/AdminSettingsHubPage'),
  'AdminSettingsHubPage'
);
export const AdminSettingsGroupPage = lazyNamed(
  () => import('@/pages/admin/AdminSettingsGroupPage'),
  'AdminSettingsGroupPage'
);
export const AdminContentEditorPage = lazyNamed(
  () => import('@/pages/admin/AdminContentEditorPage'),
  'AdminContentEditorPage'
);
export const AdminTestimonialsPage = lazyNamed(
  () => import('@/pages/admin/AdminTestimonialsPage'),
  'AdminTestimonialsPage'
);
export const AdminMediaPage = lazyNamed(
  () => import('@/pages/admin/AdminMediaPage'),
  'AdminMediaPage'
);
export const AdminNotificationsPage = lazyNamed(
  () => import('@/pages/admin/AdminNotificationsPage'),
  'AdminNotificationsPage'
);

export const AboutPage = lazyNamed(() => import('@/pages/public/AboutPage'), 'AboutPage');
export const FaqPage = lazyNamed(() => import('@/pages/public/FaqPage'), 'FaqPage');
export const ContactPage = lazyNamed(() => import('@/pages/public/ContactPage'), 'ContactPage');
export const DeliveryInfoPage = lazyNamed(
  () => import('@/pages/public/DeliveryInfoPage'),
  'DeliveryInfoPage'
);

export const AccountOverviewPage = lazyNamed(
  () => import('@/pages/customer/AccountOverviewPage'),
  'AccountOverviewPage'
);
export const CustomerOrdersPage = lazyNamed(
  () => import('@/pages/customer/CustomerOrdersPage'),
  'CustomerOrdersPage'
);
export const CustomerOrderDetailPage = lazyNamed(
  () => import('@/pages/customer/CustomerOrderDetailPage'),
  'CustomerOrderDetailPage'
);
export const CustomerDeliveriesPage = lazyNamed(
  () => import('@/pages/customer/CustomerDeliveriesPage'),
  'CustomerDeliveriesPage'
);
export const CustomerInvoicesPage = lazyNamed(
  () => import('@/pages/customer/CustomerInvoicesPage'),
  'CustomerInvoicesPage'
);
export const CustomerInvoiceDetailPage = lazyNamed(
  () => import('@/pages/customer/CustomerInvoiceDetailPage'),
  'CustomerInvoiceDetailPage'
);
export const CustomerReceiptsPage = lazyNamed(
  () => import('@/pages/customer/CustomerReceiptsPage'),
  'CustomerReceiptsPage'
);
export const CustomerReceiptDetailPage = lazyNamed(
  () => import('@/pages/customer/CustomerReceiptDetailPage'),
  'CustomerReceiptDetailPage'
);
export const CustomerAddressesPage = lazyNamed(
  () => import('@/pages/customer/CustomerAddressesPage'),
  'CustomerAddressesPage'
);
export const CustomerProfilePage = lazyNamed(
  () => import('@/pages/customer/CustomerProfilePage'),
  'CustomerProfilePage'
);
export const CustomerSecurityPage = lazyNamed(
  () => import('@/pages/customer/CustomerSecurityPage'),
  'CustomerSecurityPage'
);
export const CustomerNotificationsPage = lazyNamed(
  () => import('@/pages/customer/CustomerNotificationsPage'),
  'CustomerNotificationsPage'
);
