import { Link, useParams } from 'react-router-dom';
import { ProductCatalog } from '@/components/products/ProductCatalog';
import { useCategory } from '@/hooks/useCatalog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';

export function CategoryPage() {
  const { category: categorySlug } = useParams();
  const { data: category, isLoading, isError, refetch } = useCategory(categorySlug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Unable to load category"
          description="Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Category not found"
          description="This category does not exist or is not active."
          action={
            <Link
              to="/shop"
              className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
            >
              Back to shop
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ProductCatalog
      categorySlug={category.slug}
      title={category.name}
      description={category.description || `Shop ${category.name} from Shield Wolf.`}
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Shop', to: '/shop' },
        { label: category.name },
      ]}
    />
  );
}
