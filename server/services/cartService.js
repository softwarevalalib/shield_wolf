import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';
import { getSettingByKey } from './storefrontService.js';

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Recalculate cart totals from the database.
 * Never trusts client-provided prices or line totals.
 */
export async function quoteCart(rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return emptyQuote();
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const [business, taxSetting] = await Promise.all([
    getSettingByKey('business_settings', 'general'),
    getSettingByKey('business_settings', 'tax'),
  ]);
  const settings = business?.value || {};
  const tax = taxSetting?.value || {};
  const currency = settings.currency || 'LRD';
  const taxEnabled = Boolean(
    tax.tax_enabled !== undefined ? tax.tax_enabled : settings.tax_enabled
  );
  const taxRate = Number(
    tax.tax_rate !== undefined && tax.tax_rate !== null ? tax.tax_rate : settings.tax_rate || 0
  );

  const lines = [];
  const removed = [];

  for (const raw of rawItems) {
    const productId = raw.productId || raw.product_id;
    const variantId = raw.variantId || raw.variant_id || null;
    const quantity = Math.max(0, Math.floor(Number(raw.quantity) || 0));

    if (!productId || quantity <= 0) {
      removed.push({ productId, variantId, reason: 'invalid_item' });
      continue;
    }

    const productResult = await db.query(
      toDriverSql(
        driver,
        `SELECT id, name, slug, price, compare_at_price, currency, thumbnail_url, size,
                stock_quantity, active, status, deleted_at
         FROM products
         WHERE id = ?
         LIMIT 1`
      ),
      [productId]
    );
    const product = productResult.rows?.[0];

    if (!product || product.deleted_at || !product.active || product.status !== 'published') {
      removed.push({ productId, variantId, reason: 'unavailable' });
      continue;
    }

    let variant = null;
    if (variantId) {
      const variantResult = await db.query(
        toDriverSql(
          driver,
          `SELECT id, name, size, price, compare_at_price, stock_quantity, active, deleted_at
           FROM product_variants
           WHERE id = ? AND product_id = ?
           LIMIT 1`
        ),
        [variantId, productId]
      );
      variant = variantResult.rows?.[0] || null;
      if (!variant || variant.deleted_at || !variant.active) {
        removed.push({ productId, variantId, reason: 'variant_unavailable' });
        continue;
      }
    }

    const unitPrice = money(variant?.price != null ? variant.price : product.price);
    const compareAt = money(
      variant?.compare_at_price != null ? variant.compare_at_price : product.compare_at_price
    );
    const stock = Number(variant?.stock_quantity ?? product.stock_quantity ?? 0);
    const availableQty = Math.max(0, stock);
    const clampedQty = Math.min(quantity, availableQty > 0 ? availableQty : quantity);
    const available = availableQty > 0;

    if (!available || unitPrice == null) {
      lines.push({
        productId: product.id,
        variantId: variant?.id || null,
        name: variant ? `${product.name} — ${variant.name}` : product.name,
        slug: product.slug,
        imageUrl: product.thumbnail_url,
        size: variant?.size || product.size || null,
        quantity: clampedQty || quantity,
        unitPrice: null,
        lineTotal: null,
        currency: product.currency || currency,
        available: false,
        stockQuantity: availableQty,
        reason: unitPrice == null ? 'price_unavailable' : 'out_of_stock',
      });
      continue;
    }

    const finalQty = Math.min(quantity, availableQty);
    lines.push({
      productId: product.id,
      variantId: variant?.id || null,
      name: variant ? `${product.name} — ${variant.name}` : product.name,
      slug: product.slug,
      imageUrl: product.thumbnail_url,
      size: variant?.size || product.size || null,
      quantity: finalQty,
      unitPrice,
      compareAtPrice: compareAt,
      lineTotal: money(unitPrice * finalQty),
      currency: product.currency || currency,
      available: true,
      stockQuantity: availableQty,
      adjusted: finalQty !== quantity,
    });
  }

  const pricedLines = lines.filter((line) => line.available && line.lineTotal != null);
  const subtotal = money(pricedLines.reduce((sum, line) => sum + line.lineTotal, 0)) || 0;

  // Discounts and delivery fees are finalized at checkout (Phase 9).
  const discountAmount = 0;
  const deliveryFee = null;
  const taxAmount = taxEnabled && taxRate > 0 ? money(subtotal * (taxRate / 100)) : 0;
  const grandTotal = money(subtotal - discountAmount + (taxAmount || 0));

  return {
    currency,
    lines,
    removed,
    summary: {
      itemCount: pricedLines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      discountAmount,
      deliveryFee,
      deliveryNote: 'Delivery fee is calculated at checkout based on your area.',
      taxAmount,
      taxEnabled,
      grandTotal,
      // Explicit: client must not treat this as final checkout total.
      isEstimate: true,
    },
  };
}

function emptyQuote() {
  return {
    currency: 'LRD',
    lines: [],
    removed: [],
    summary: {
      itemCount: 0,
      subtotal: 0,
      discountAmount: 0,
      deliveryFee: null,
      deliveryNote: 'Delivery fee is calculated at checkout based on your area.',
      taxAmount: 0,
      taxEnabled: false,
      grandTotal: 0,
      isEstimate: true,
    },
  };
}
