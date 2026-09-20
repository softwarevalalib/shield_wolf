import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Tabs } from '@/components/common/Tabs';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';
import { PriceDisplay } from '@/components/products/PriceDisplay';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'description', label: 'Description' },
  { id: 'media', label: 'Media' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'variants', label: 'Variants' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'seo', label: 'SEO' },
  { id: 'visibility', label: 'Visibility' },
];

function emptyForm() {
  return {
    name: '',
    slug: '',
    sku: '',
    barcode: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    subcategory: '',
    brand: 'Shield Wolf',
    price: '',
    compareAtPrice: '',
    costPrice: '',
    currency: 'LRD',
    tax: '',
    stockQuantity: '0',
    lowStockThreshold: '5',
    weight: '',
    weightUnit: 'kg',
    size: '',
    unit: '',
    featured: false,
    active: true,
    status: 'draft',
    thumbnailUrl: '',
    seoTitle: '',
    seoDescription: '',
    images: [],
    variants: [],
  };
}

function productToForm(product) {
  return {
    name: product.name || '',
    slug: product.slug || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    subcategory: product.subcategory || '',
    brand: product.brand || '',
    price: product.price ?? '',
    compareAtPrice: product.compareAtPrice ?? '',
    costPrice: product.costPrice ?? '',
    currency: product.currency || 'LRD',
    tax: product.tax ?? '',
    stockQuantity: String(product.stockQuantity ?? 0),
    lowStockThreshold: String(product.lowStockThreshold ?? 5),
    weight: product.weight ?? '',
    weightUnit: product.weightUnit || 'kg',
    size: product.size || '',
    unit: product.unit || '',
    featured: Boolean(product.featured),
    active: product.active !== false,
    status: product.status || 'draft',
    thumbnailUrl: product.thumbnailUrl || '',
    seoTitle: product.seoTitle || '',
    seoDescription: product.seoDescription || '',
    images: product.images || [],
    variants: product.variants || [],
  };
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || null,
    sku: form.sku.trim() || null,
    barcode: form.barcode.trim() || null,
    shortDescription: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    categoryId: form.categoryId || null,
    subcategory: form.subcategory.trim() || null,
    brand: form.brand.trim() || null,
    price: form.price === '' ? null : Number(form.price),
    compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
    costPrice: form.costPrice === '' ? null : Number(form.costPrice),
    currency: form.currency || 'LRD',
    tax: form.tax === '' ? null : Number(form.tax),
    stockQuantity: Number(form.stockQuantity || 0),
    lowStockThreshold: Number(form.lowStockThreshold || 5),
    weight: form.weight === '' ? null : Number(form.weight),
    weightUnit: form.weightUnit || null,
    size: form.size.trim() || null,
    unit: form.unit.trim() || null,
    featured: Boolean(form.featured),
    active: Boolean(form.active),
    status: form.status,
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    images: (form.images || []).map((image, index) => ({
      url: image.url,
      altText: image.altText || null,
      sortOrder: image.sortOrder ?? index,
      isPrimary: Boolean(image.isPrimary),
    })),
    variants: (form.variants || []).map((variant, index) => ({
      id: variant.id || null,
      name: variant.name,
      sku: variant.sku || null,
      size: variant.size || null,
      unit: variant.unit || null,
      price: variant.price === '' || variant.price == null ? null : Number(variant.price),
      compareAtPrice:
        variant.compareAtPrice === '' || variant.compareAtPrice == null
          ? null
          : Number(variant.compareAtPrice),
      costPrice:
        variant.costPrice === '' || variant.costPrice == null ? null : Number(variant.costPrice),
      stockQuantity: Number(variant.stockQuantity || 0),
      weight: variant.weight === '' || variant.weight == null ? null : Number(variant.weight),
      weightUnit: variant.weightUnit || null,
      active: variant.active !== false,
      sortOrder: variant.sortOrder ?? index,
    })),
  };
}

/**
 * Create / edit product with tabbed editor and publish preview.
 */
export function AdminProductEditorPage() {
  const { productId } = useParams();
  const isNew = !productId || productId === 'new';
  const navigate = useNavigate();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(emptyForm);
  const [imageUrl, setImageUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const productQuery = useQuery({
    queryKey: ['admin', 'product', productId],
    enabled: !isNew,
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/products/${productId}`);
      return payload.data.product;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/categories');
      return payload.data.categories;
    },
  });

  useEffect(() => {
    if (productQuery.data) {
      setForm(productToForm(productQuery.data));
    }
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isNew) {
        return apiClient.post('/admin/products', payload);
      }
      return apiClient.patch(`/admin/products/${productId}`, payload);
    },
    onSuccess: (response) => {
      notify.success(isNew ? 'Product created' : 'Product saved');
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      if (isNew) {
        navigate(`/admin/products/${response.data.product.id}`, { replace: true });
      }
    },
    onError: (error) => {
      if (error.details?.fieldErrors) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.details.fieldErrors).map(([key, messages]) => [
              key,
              Array.isArray(messages) ? messages[0] : String(messages),
            ])
          )
        );
      }
      notify.error(error.message || 'Save failed');
    },
  });

  const categoryName = useMemo(() => {
    const match = (categoriesQuery.data || []).find((category) => category.id === form.categoryId);
    return match?.name || 'Uncategorized';
  }, [categoriesQuery.data, form.categoryId]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addImage() {
    const url = imageUrl.trim();
    if (!url) return;
    setForm((current) => ({
      ...current,
      images: [
        ...current.images,
        {
          url,
          altText: current.name || '',
          sortOrder: current.images.length,
          isPrimary: current.images.length === 0,
        },
      ],
      thumbnailUrl: current.thumbnailUrl || url,
    }));
    setImageUrl('');
  }

  function removeImage(index) {
    setForm((current) => {
      const images = current.images.filter((_, i) => i !== index);
      if (images.length && !images.some((image) => image.isPrimary)) {
        images[0] = { ...images[0], isPrimary: true };
      }
      return {
        ...current,
        images,
        thumbnailUrl: images.find((image) => image.isPrimary)?.url || images[0]?.url || '',
      };
    });
  }

  function setPrimaryImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, i) => ({ ...image, isPrimary: i === index })),
      thumbnailUrl: current.images[index]?.url || current.thumbnailUrl,
    }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          name: `Variant ${current.variants.length + 1}`,
          sku: '',
          size: '',
          unit: '',
          price: current.price || '',
          compareAtPrice: '',
          costPrice: '',
          stockQuantity: 0,
          weight: '',
          weightUnit: current.weightUnit || 'kg',
          active: true,
          sortOrder: current.variants.length,
        },
      ],
    }));
  }

  function updateVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, [key]: value } : variant
      ),
    }));
  }

  function removeVariant(index) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
  }

  function handleSave(statusOverride) {
    const payload = formToPayload({
      ...form,
      status: statusOverride || form.status,
    });
    saveMutation.mutate(payload);
  }

  if (!isNew && productQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isNew && productQuery.isError) {
    return (
      <ErrorState
        title="Unable to load product"
        description={productQuery.error.message}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link to="/admin/products" className="hover:underline">
              Products
            </Link>
            <span aria-hidden="true"> / </span>
            {isNew ? 'New' : 'Edit'}
          </p>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {isNew ? 'New product' : form.name || 'Edit product'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave('draft')}
            loading={saveMutation.isPending}
          >
            Save draft
          </Button>
          <Button onClick={() => handleSave('published')} loading={saveMutation.isPending}>
            Publish
          </Button>
        </div>
      </div>

      <Tabs className="mt-4" tabs={TABS} activeId={tab} onChange={setTab} />

      <div
        className="mt-4 space-y-4"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'general' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              error={fieldErrors.name}
              onChange={(event) => setField('name', event.target.value)}
            />
            <Input
              label="Slug"
              hint="Leave blank to auto-generate from name"
              value={form.slug}
              error={fieldErrors.slug}
              onChange={(event) => setField('slug', event.target.value)}
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(event) => setField('sku', event.target.value)}
            />
            <Input
              label="Barcode"
              value={form.barcode}
              onChange={(event) => setField('barcode', event.target.value)}
            />
            <Select
              label="Category"
              value={form.categoryId}
              error={fieldErrors.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
              options={[
                { value: '', label: 'Select category' },
                ...(categoriesQuery.data || []).map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
            <Input
              label="Subcategory"
              value={form.subcategory}
              onChange={(event) => setField('subcategory', event.target.value)}
            />
            <Input
              label="Brand"
              value={form.brand}
              onChange={(event) => setField('brand', event.target.value)}
            />
            <Input
              label="Size"
              value={form.size}
              onChange={(event) => setField('size', event.target.value)}
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(event) => setField('unit', event.target.value)}
            />
          </div>
        ) : null}

        {tab === 'description' ? (
          <div className="space-y-3">
            <Textarea
              label="Short description"
              rows={3}
              value={form.shortDescription}
              onChange={(event) => setField('shortDescription', event.target.value)}
            />
            <Textarea
              label="Full description"
              rows={10}
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
        ) : null}

        {tab === 'media' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Binary uploads arrive with the media provider phase. Add image URLs for now.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[16rem] flex-1">
                <Input
                  label="Image URL"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={addImage}>
                  Add image
                </Button>
              </div>
            </div>
            <Input
              label="Thumbnail URL"
              value={form.thumbnailUrl}
              onChange={(event) => setField('thumbnailUrl', event.target.value)}
              hint="Defaults to the primary gallery image"
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {form.images.map((image, index) => (
                <li key={`${image.url}-${index}`} className="rounded-md border border-border p-2">
                  <img
                    src={image.url}
                    alt={image.altText || ''}
                    className="h-32 w-full object-cover"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPrimaryImage(index)}>
                      {image.isPrimary ? 'Primary' : 'Make primary'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeImage(index)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === 'pricing' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              error={fieldErrors.price}
              onChange={(event) => setField('price', event.target.value)}
            />
            <Input
              label="Compare-at price"
              type="number"
              min="0"
              step="0.01"
              value={form.compareAtPrice}
              onChange={(event) => setField('compareAtPrice', event.target.value)}
            />
            <Input
              label="Cost price"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(event) => setField('costPrice', event.target.value)}
            />
            <Input
              label="Tax amount"
              type="number"
              min="0"
              step="0.01"
              value={form.tax}
              onChange={(event) => setField('tax', event.target.value)}
            />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(event) => setField('currency', event.target.value)}
              options={[
                { value: 'LRD', label: 'LRD' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </div>
        ) : null}

        {tab === 'inventory' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Stock quantity"
              type="number"
              min="0"
              step="1"
              value={form.stockQuantity}
              onChange={(event) => setField('stockQuantity', event.target.value)}
              hint="Prefer Inventory → Adjust for audited stock changes"
            />
            <Input
              label="Low stock threshold"
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={(event) => setField('lowStockThreshold', event.target.value)}
            />
          </div>
        ) : null}

        {tab === 'variants' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted">
                Optional size/pack variants with their own price and stock.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
                Add variant
              </Button>
            </div>
            {form.variants.length === 0 ? (
              <p className="text-sm text-muted">No variants yet.</p>
            ) : (
              <ul className="space-y-3">
                {form.variants.map((variant, index) => (
                  <li
                    key={variant.id || index}
                    className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-4"
                  >
                    <Input
                      label="Name"
                      value={variant.name}
                      onChange={(event) => updateVariant(index, 'name', event.target.value)}
                    />
                    <Input
                      label="SKU"
                      value={variant.sku || ''}
                      onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                    />
                    <Input
                      label="Price"
                      type="number"
                      value={variant.price ?? ''}
                      onChange={(event) => updateVariant(index, 'price', event.target.value)}
                    />
                    <Input
                      label="Stock"
                      type="number"
                      value={variant.stockQuantity ?? 0}
                      onChange={(event) =>
                        updateVariant(index, 'stockQuantity', event.target.value)
                      }
                    />
                    <Input
                      label="Size"
                      value={variant.size || ''}
                      onChange={(event) => updateVariant(index, 'size', event.target.value)}
                    />
                    <Input
                      label="Unit"
                      value={variant.unit || ''}
                      onChange={(event) => updateVariant(index, 'unit', event.target.value)}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'shipping' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Weight"
              type="number"
              min="0"
              step="0.001"
              value={form.weight}
              onChange={(event) => setField('weight', event.target.value)}
            />
            <Select
              label="Weight unit"
              value={form.weightUnit}
              onChange={(event) => setField('weightUnit', event.target.value)}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'g', label: 'g' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </div>
        ) : null}

        {tab === 'seo' ? (
          <div className="space-y-3">
            <Input
              label="SEO title"
              value={form.seoTitle}
              onChange={(event) => setField('seoTitle', event.target.value)}
            />
            <Textarea
              label="SEO description"
              rows={4}
              value={form.seoDescription}
              onChange={(event) => setField('seoDescription', event.target.value)}
            />
          </div>
        ) : null}

        {tab === 'visibility' ? (
          <div className="space-y-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setField('status', event.target.value)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Switch
              label="Active"
              checked={form.active}
              onChange={(value) => setField('active', value)}
            />
            <Switch
              label="Featured"
              checked={form.featured}
              onChange={(value) => setField('featured', value)}
            />
          </div>
        ) : null}
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Publish preview"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                handleSave('published');
              }}
              loading={saveMutation.isPending}
            >
              Publish now
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            {form.thumbnailUrl || form.images[0]?.url ? (
              <img
                src={form.thumbnailUrl || form.images[0]?.url}
                alt=""
                className="size-20 rounded object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded bg-off-white text-muted">
                No image
              </div>
            )}
            <div>
              <p className="font-medium text-charcoal">{form.name || 'Untitled product'}</p>
              <p className="text-muted">{categoryName}</p>
              <div className="mt-1">
                <PriceDisplay
                  amount={form.price === '' ? null : Number(form.price)}
                  compareAt={form.compareAtPrice === '' ? null : Number(form.compareAtPrice)}
                  currency={form.currency}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant={form.status === 'published' ? 'success' : 'warning'}>
                  {form.status}
                </Badge>
                {form.featured ? <Badge variant="accent">Featured</Badge> : null}
              </div>
            </div>
          </div>
          <p className="text-muted">{form.shortDescription || 'No short description.'}</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Stock: {form.stockQuantity || 0}</li>
            <li>Variants: {form.variants.length}</li>
            <li>Images: {form.images.length}</li>
            <li>Slug: {form.slug || '(auto)'}</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
