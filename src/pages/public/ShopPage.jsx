import { ProductCatalog } from '@/components/products/ProductCatalog';

export function ShopPage() {
  return (
    <ProductCatalog
      title="Shop"
      description="Browse Shield Wolf products. Prices and availability come from the live catalog."
      breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Shop' }]}
    />
  );
}
