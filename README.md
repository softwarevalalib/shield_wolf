# Shield Wolf E-Commerce & Delivery Management Platform

Production-ready e-commerce and business management platform for Shield Wolf
(charcoal, red palm oil, and expandable product lines) with delivery, payments,
inventory, finance, and administration.

## Stack

- **Frontend:** React.js + Vite + JavaScript + Tailwind CSS + React Router + TanStack Query
- **API:** Node.js serverless functions (Vercel-compatible)
- **Production DB:** Neon PostgreSQL
- **Local DB:** SQLite (optional, development only — no bidirectional sync)

## Phase status

| Phase | Scope                                 | Status                       |
| ----- | ------------------------------------- | ---------------------------- |
| 1     | Architecture + project initialization | Complete                     |
| 2     | Database + migrations + Neon          | Complete                     |
| 3     | Design system                         | Complete                     |
| 4     | Public layout + homepage              | Complete                     |
| 5     | Product catalog + categories          | Complete                     |
| 6     | Product detail + search/filter        | Complete                     |
| 7     | Cart                                  | Complete                     |
| 8     | Authentication                        | Complete                     |
| 9     | Checkout                              | Complete                     |
| 10    | Orders                                | Complete                     |
| 11    | Payments                              | Complete                     |
| 12    | Customer dashboard                    | Complete                     |
| 13    | Admin authentication + RBAC           | Complete                     |
| 14    | Admin layout + sidebar                | Complete                     |
| 15    | Product/category management           | Complete                     |
| 16    | Inventory                             | Complete                     |
| 17    | Order administration                  | Complete                     |
| 18    | Payment verification                  | Complete                     |
| 19    | Delivery management                   | Complete                     |
| 20    | Invoices + receipts                   | Complete                     |
| 21    | Financial dashboard                   | Complete                     |
| 22    | Expenses + transactions               | Complete                     |
| 23    | Reports                               | Complete                     |
| 24    | CMS + settings                        | Complete                     |
| 25    | Notifications                         | Complete                     |
| 26    | Security hardening                    | Complete                     |
| 27    | Accessibility audit                   | Complete                     |
| 28    | Performance optimization              | Complete                     |
| 29    | Automated testing                     | Complete                     |
| 30    | Vercel + Neon production deployment   | Complete                     |
| 31    | Production QA                         | Complete                     |

## Getting started

```bash
cp .env.example .env
npm install
# Local SQLite (recommended for Phase 2+ local work):
npm install better-sqlite3
npm run db:migrate
npm run db:seed
npm run dev
```

### Neon (production / staging)

1. Create a Neon project (this workspace uses project **shield-wolf**) and copy the
   pooled connection string from the Neon console.
2. Set in `.env` / Vercel:
   - `DB_DRIVER=postgres` (optional when `DATABASE_URL` is set — auto-detected)
   - `DATABASE_URL=postgresql://...?sslmode=require`
3. Run against that environment:
   - `DB_DRIVER=postgres DATABASE_URL=... npm run db:migrate`
   - `DB_DRIVER=postgres DATABASE_URL=... NODE_ENV=production npm run db:seed`
     (skips the dev admin unless `ALLOW_PROD_SEED_ADMIN=true`)

Never sync SQLite and Neon automatically — migrate each environment separately.

For API routes locally, use `npm run dev:api` / `npm run dev:all` (or `vercel dev`).
The Vite `dev` server proxies `/api` to port 3000.

## Deploy to Vercel

Full step-by-step guide (Neon + Vercel + env + smoke checks):

→ **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

Short version:

1. Create a Neon project and copy the **pooled** `DATABASE_URL` (`sslmode=require`).
2. Migrate/seed Neon from your machine (`DB_DRIVER=postgres DATABASE_URL=... npm run db:migrate`).
3. Import this Git repo in Vercel (framework: Vite; build: `npm run build`; output: `dist`).
   `vercel.json` already configures SPA rewrites, security headers, and `/api` functions.
4. Set production environment variables from `.env.example` / the deployment guide.
   Generate a strong `JWT_SECRET`. Point `APP_URL` / `CORS_ORIGIN` / `VITE_APP_URL` at the
   deployment URL (or custom domain). Set `VITE_API_URL=/api`.
5. Deploy. Confirm `GET /api/health` returns `status: ok`, `database.connected: true`,
   and `phase: 31`.
6. Run smoke checks:
   ```bash
   npm run qa:smoke -- --base=https://YOUR_DEPLOYMENT.vercel.app
   ```

**Note:** Neon hosts Postgres only. The Node API runs as **one** Vercel serverless
function (`api/index.js` + `/api/*` rewrite) that routes to handlers under `/handlers` — required for
the Hobby plan’s 12-function limit. You do not deploy a separate backend host to Neon.

Local pre-deploy gate:

```bash
npm run qa          # lint + test + build
npm run env:check   # requires production env vars in the shell / .env
```

## Scripts

| Command                     | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `npm run dev`               | Vite frontend only                                  |
| `npm run dev:api`           | Local API server (port 3000)                        |
| `npm run dev:all`           | Frontend + API together                             |
| `npm run build`             | Production build                                    |
| `npm run preview`           | Preview production build                            |
| `npm run lint`              | ESLint                                              |
| `npm run test`              | Vitest unit + API tests                             |
| `npm run qa`                | Lint + test + build gate                            |
| `npm run qa:smoke`          | Live API smoke + Phase 31 checklist                 |
| `npm run env:check`         | Validate production env shape (no secret printing)  |
| `npm run format`            | Prettier format                                     |
| `npm run db:migrate`        | Apply pending migrations                            |
| `npm run db:migrate:status` | Show migration status                               |
| `npm run db:seed`           | Seed roles, settings, categories, dev admin         |
| `npm run db:seed:demo`      | Seed demo catalog (products, zones, testimonials)   |
| `npm run db:reset`          | Wipe local SQLite, migrate, seed (refuses Postgres) |

## Environment

See `.env.example` for all required variables. Never commit `.env` or secrets.

## Architecture

```
/src          — React UI (components, pages, hooks, services, store)
/api          — Vercel serverless API route entrypoints
/server       — Controllers, services, repositories, middleware, validators
/database     — Migrations, seeders, schema, connection abstraction
```

Sensitive business logic lives on the server. The browser never trusts
prices, totals, delivery fees, or discounts.
