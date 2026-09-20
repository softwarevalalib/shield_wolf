# Database seeders

```bash
npm run db:seed
npm run db:reset   # SQLite only: wipe + migrate + seed
```

Seeds structural bootstrap data:

- Roles & permissions (RBAC)
- Expense categories
- Product categories (no product prices)
- Business / site settings defaults (admin-editable)
- Development admin user (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)

Product prices, stock, and promotions are **not** hardcoded here for production use — manage via admin in later phases.
