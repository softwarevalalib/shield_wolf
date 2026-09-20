import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';
import { HomePage } from '@/pages/public/HomePage';
import { ShopPage } from '@/pages/public/ShopPage';
import { CategoryPage } from '@/pages/public/CategoryPage';
import { ProductDetailPage } from '@/pages/public/ProductDetailPage';
import { CartPage } from '@/pages/public/CartPage';
import { CheckoutPage } from '@/pages/public/CheckoutPage';
import { OrderSuccessPage } from '@/pages/public/OrderSuccessPage';
import { TrackOrderPage } from '@/pages/public/TrackOrderPage';
import { CompletePaymentPage } from '@/pages/public/CompletePaymentPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/public/ResetPasswordPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { PrivacyPage } from '@/pages/public/PrivacyPage';
import { TermsPage } from '@/pages/public/TermsPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import {
  AboutPage,
  FaqPage,
  ContactPage,
  DeliveryInfoPage,
  AccountOverviewPage,
  CustomerOrdersPage,
  CustomerOrderDetailPage,
  CustomerDeliveriesPage,
  CustomerInvoicesPage,
  CustomerInvoiceDetailPage,
  CustomerReceiptsPage,
  CustomerReceiptDetailPage,
  CustomerAddressesPage,
  CustomerProfilePage,
  CustomerSecurityPage,
  CustomerNotificationsPage,
  AdminDashboardPage,
  AdminProductsPage,
  AdminProductEditorPage,
  AdminCategoriesPage,
  AdminInventoryPage,
  AdminOrdersPage,
  AdminOrderDetailPage,
  AdminPaymentsPage,
  AdminPaymentDetailPage,
  AdminDeliveryDashboardPage,
  AdminDeliveriesPage,
  AdminDispatchBoardPage,
  AdminDeliveryDetailPage,
  AdminDriversPage,
  AdminVehiclesPage,
  AdminDeliveryZonesPage,
  AdminDeliverySettingsPage,
  AdminInvoicesPage,
  AdminInvoiceDetailPage,
  AdminReceiptsPage,
  AdminReceiptDetailPage,
  AdminFinanceDashboardPage,
  AdminFinanceSalesPage,
  AdminExpensesPage,
  AdminTransactionsPage,
  AdminTransactionDetailPage,
  AdminRefundsPage,
  AdminReportsHubPage,
  AdminReportPage,
  AdminSettingsHubPage,
  AdminSettingsGroupPage,
  AdminContentEditorPage,
  AdminTestimonialsPage,
  AdminMediaPage,
  AdminNotificationsPage,
} from '@/routes/lazyPages';
import { RequireAuth } from '@/components/navigation/RequireAuth';
import { RequireAdmin } from '@/components/navigation/RequireAdmin';
import { RequirePermission } from '@/components/navigation/RequirePermission';
import { ADMIN_NAV_GROUPS } from '@/config/adminNav';

const ADMIN_IMPLEMENTED_PATHS = new Set([
  'products',
  'categories',
  'inventory',
  'orders',
  'payments',
  'deliveries',
  'deliveries/all',
  'deliveries/dispatch',
  'drivers',
  'vehicles',
  'delivery-zones',
  'delivery-settings',
  'invoices',
  'receipts',
  'finance',
  'finance/sales',
  'finance/reports',
  'expenses',
  'transactions',
  'refunds',
  'reports',
  'reports/sales',
  'reports/orders',
  'reports/products',
  'reports/customers',
  'reports/inventory',
  'reports/delivery',
  'reports/finance',
  'settings',
  'settings/business',
  'settings/store',
  'settings/payments',
  'settings/delivery',
  'settings/tax',
  'settings/email',
  'settings/security',
  'settings/integrations',
  'content/homepage',
  'content/about',
  'content/faq',
  'content/contact',
  'content/delivery',
  'marketing/testimonials',
  'marketing/banners',
  'marketing/announcements',
  'media',
  'notifications',
]);

/** Flatten unique admin nav routes (skip dashboard index + implemented modules). */
function adminPlaceholderRoutes() {
  const seen = new Set();
  const routes = [];

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === '/admin' || seen.has(item.to)) continue;
      seen.add(item.to);
      const relativePath = item.to.replace(/^\/admin\//, '');
      if (ADMIN_IMPLEMENTED_PATHS.has(relativePath)) continue;
      routes.push({
        path: relativePath,
        title: item.label,
        permissions: item.permissions,
      });
    }
  }

  return routes;
}

function AdminPlaceholderRoute({ title, permissions }) {
  const page = <RoutePlaceholder title={title} scope="admin" />;

  if (!permissions?.length) {
    return page;
  }

  return (
    <RequirePermission anyOf={permissions} fallback="redirect">
      {page}
    </RequirePermission>
  );
}

/**
 * Application route map.
 * Public, customer, and admin route trees are declared here.
 */
export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted"
          role="status"
        >
          Loading…
        </div>
      }
    >
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="shop/:category" element={<CategoryPage />} />
          <Route path="product/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-success" element={<OrderSuccessPage />} />
          <Route path="track-order" element={<TrackOrderPage />} />
          <Route path="complete-payment" element={<CompletePaymentPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="delivery" element={<DeliveryInfoPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route
          path="account"
          element={
            <RequireAuth>
              <CustomerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountOverviewPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="orders/:id" element={<CustomerOrderDetailPage />} />
          <Route path="deliveries" element={<CustomerDeliveriesPage />} />
          <Route path="notifications" element={<CustomerNotificationsPage />} />
          <Route path="invoices" element={<CustomerInvoicesPage />} />
          <Route path="invoices/:invoiceId" element={<CustomerInvoiceDetailPage />} />
          <Route path="receipts" element={<CustomerReceiptsPage />} />
          <Route path="receipts/:receiptId" element={<CustomerReceiptDetailPage />} />
          <Route path="addresses" element={<CustomerAddressesPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
          <Route path="security" element={<CustomerSecurityPage />} />
        </Route>

        <Route path="admin/login" element={<AdminLoginPage />} />

        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route
            path="products"
            element={
              <RequirePermission permission="products.view" fallback="redirect">
                <AdminProductsPage />
              </RequirePermission>
            }
          />
          <Route
            path="products/new"
            element={
              <RequirePermission permission="products.create" fallback="redirect">
                <AdminProductEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="products/:productId"
            element={
              <RequirePermission anyOf={['products.view', 'products.update']} fallback="redirect">
                <AdminProductEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="categories"
            element={
              <RequirePermission
                anyOf={['categories.view', 'categories.manage']}
                fallback="redirect"
              >
                <AdminCategoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="inventory"
            element={
              <RequirePermission anyOf={['inventory.view', 'inventory.adjust']} fallback="redirect">
                <AdminInventoryPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={
              <RequirePermission permission="orders.view" fallback="redirect">
                <AdminOrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <RequirePermission anyOf={['orders.view', 'orders.update']} fallback="redirect">
                <AdminOrderDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="payments"
            element={
              <RequirePermission anyOf={['payments.view', 'payments.verify']} fallback="redirect">
                <AdminPaymentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="payments/:paymentId"
            element={
              <RequirePermission anyOf={['payments.view', 'payments.verify']} fallback="redirect">
                <AdminPaymentDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="deliveries"
            element={
              <RequirePermission permission="delivery.view" fallback="redirect">
                <AdminDeliveryDashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="deliveries/all"
            element={
              <RequirePermission permission="delivery.view" fallback="redirect">
                <AdminDeliveriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="deliveries/dispatch"
            element={
              <RequirePermission anyOf={['delivery.assign', 'delivery.update']} fallback="redirect">
                <AdminDispatchBoardPage />
              </RequirePermission>
            }
          />
          <Route
            path="deliveries/:deliveryId"
            element={
              <RequirePermission
                anyOf={['delivery.view', 'delivery.update', 'delivery.assign']}
                fallback="redirect"
              >
                <AdminDeliveryDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="drivers"
            element={
              <RequirePermission permission="delivery.view" fallback="redirect">
                <AdminDriversPage />
              </RequirePermission>
            }
          />
          <Route
            path="vehicles"
            element={
              <RequirePermission permission="delivery.view" fallback="redirect">
                <AdminVehiclesPage />
              </RequirePermission>
            }
          />
          <Route
            path="delivery-zones"
            element={
              <RequirePermission anyOf={['delivery.view', 'settings.manage']} fallback="redirect">
                <AdminDeliveryZonesPage />
              </RequirePermission>
            }
          />
          <Route
            path="delivery-settings"
            element={
              <RequirePermission anyOf={['settings.manage', 'delivery.update']} fallback="redirect">
                <AdminDeliverySettingsPage />
              </RequirePermission>
            }
          />
          <Route
            path="invoices"
            element={
              <RequirePermission anyOf={['finance.view', 'orders.view']} fallback="redirect">
                <AdminInvoicesPage />
              </RequirePermission>
            }
          />
          <Route
            path="invoices/:invoiceId"
            element={
              <RequirePermission anyOf={['finance.view', 'orders.view']} fallback="redirect">
                <AdminInvoiceDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="receipts"
            element={
              <RequirePermission anyOf={['finance.view', 'payments.view']} fallback="redirect">
                <AdminReceiptsPage />
              </RequirePermission>
            }
          />
          <Route
            path="receipts/:receiptId"
            element={
              <RequirePermission anyOf={['finance.view', 'payments.view']} fallback="redirect">
                <AdminReceiptDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="finance"
            element={
              <RequirePermission anyOf={['finance.view', 'reports.view']} fallback="redirect">
                <AdminFinanceDashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="finance/sales"
            element={
              <RequirePermission anyOf={['finance.view', 'reports.view']} fallback="redirect">
                <AdminFinanceSalesPage />
              </RequirePermission>
            }
          />
          <Route
            path="expenses"
            element={
              <RequirePermission
                anyOf={['expenses.create', 'expenses.manage', 'finance.view']}
                fallback="redirect"
              >
                <AdminExpensesPage />
              </RequirePermission>
            }
          />
          <Route
            path="transactions"
            element={
              <RequirePermission permission="finance.view" fallback="redirect">
                <AdminTransactionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="transactions/:transactionId"
            element={
              <RequirePermission permission="finance.view" fallback="redirect">
                <AdminTransactionDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="refunds"
            element={
              <RequirePermission anyOf={['finance.view', 'payments.verify']} fallback="redirect">
                <AdminRefundsPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission permission="reports.view" fallback="redirect">
                <AdminReportsHubPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports/:reportType"
            element={
              <RequirePermission permission="reports.view" fallback="redirect">
                <AdminReportPage />
              </RequirePermission>
            }
          />
          <Route
            path="finance/reports"
            element={
              <RequirePermission anyOf={['reports.view', 'finance.view']} fallback="redirect">
                <AdminReportPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings.manage" fallback="redirect">
                <AdminSettingsHubPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings/:group"
            element={
              <RequirePermission permission="settings.manage" fallback="redirect">
                <AdminSettingsGroupPage />
              </RequirePermission>
            }
          />
          <Route
            path="content/:page"
            element={
              <RequirePermission permission="content.manage" fallback="redirect">
                <AdminContentEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="marketing/testimonials"
            element={
              <RequirePermission permission="content.manage" fallback="redirect">
                <AdminTestimonialsPage />
              </RequirePermission>
            }
          />
          <Route
            path="marketing/banners"
            element={
              <RequirePermission permission="content.manage" fallback="redirect">
                <AdminContentEditorPage page="banners" />
              </RequirePermission>
            }
          />
          <Route
            path="marketing/announcements"
            element={
              <RequirePermission permission="content.manage" fallback="redirect">
                <AdminContentEditorPage page="announcements" />
              </RequirePermission>
            }
          />
          <Route
            path="media"
            element={
              <RequirePermission permission="content.manage" fallback="redirect">
                <AdminMediaPage />
              </RequirePermission>
            }
          />
          <Route
            path="notifications"
            element={
              <RequirePermission
                anyOf={['settings.manage', 'content.manage', 'orders.view']}
                fallback="redirect"
              >
                <AdminNotificationsPage />
              </RequirePermission>
            }
          />
          {adminPlaceholderRoutes().map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <AdminPlaceholderRoute title={route.title} permissions={route.permissions} />
              }
            />
          ))}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
