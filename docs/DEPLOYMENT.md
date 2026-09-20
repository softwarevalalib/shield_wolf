# Shield Wolf — Production Deployment Guide

This app is a **single Vercel project** (Vite frontend + `/api` serverless backend) with **Neon PostgreSQL** as the production database.

```
Browser  →  Vercel (static React + /api/* functions)  →  Neon Postgres
```

Neon does **not** host the Node API. The API ships with the frontend repo via Vercel serverless routes.

---

## Prerequisites

- GitHub repo: `softwarevalalib/shield_wolf` (or your fork)
- [Vercel](https://vercel.com) account linked to that GitHub repo
- [Neon](https://console.neon.tech) account
- Node.js 20+ locally (for migrate/seed against Neon)
- A strong random `JWT_SECRET` (32+ characters)

---

## 1. Neon database

### 1.1 Create project

1. Open [Neon Console](https://console.neon.tech) → **New Project**
2. Name: `shield-wolf` (or similar)
3. Region: pick closest to your users (e.g. US East)
4. Create project

### 1.2 Copy connection string

1. Neon → your project → **Dashboard** / **Connection details**
2. Choose the **pooled** connection (recommended for Vercel serverless)
3. Copy the URL. It should look like:

```text
postgresql://USER:PASSWORD@ep-xxxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Use **pooled** (`-pooler`) for Vercel. Direct (non-pooler) is fine for one-off local migrate/seed if needed.

### 1.3 Migrate & seed (from your machine)

From the project root (with Neon URL — do **not** commit it):

```bash
# Install deps once
npm install

# Apply schema
DB_DRIVER=postgres DATABASE_URL='postgresql://...?sslmode=require' npm run db:migrate

# Seed roles, categories, settings
# Dev admin is skipped in production unless ALLOW_PROD_SEED_ADMIN=true
DB_DRIVER=postgres DATABASE_URL='postgresql://...?sslmode=require' \
  NODE_ENV=production \
  ALLOW_PROD_SEED_ADMIN=true \
  SEED_ADMIN_EMAIL='you@yourdomain.com' \
  SEED_ADMIN_PASSWORD='YourStrongPasswordHere!' \
  npm run db:seed

# Optional: demo catalog for a populated storefront
DB_DRIVER=postgres DATABASE_URL='postgresql://...?sslmode=require' \
  npm run db:seed:demo
```

After first admin seed, set `ALLOW_PROD_SEED_ADMIN=false` (or omit it) and **change the admin password** in production.

Verify migrations:

```bash
DB_DRIVER=postgres DATABASE_URL='...' npm run db:migrate:status
```

---

## 2. Vercel project

### 2.1 Import repository

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**
2. Import `softwarevalalib/shield_wolf`
3. Framework preset: **Vite** (or leave auto — `vercel.json` already sets this)
4. Confirm:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
   - **Root Directory:** `.` (repo root)

Do **not** create a second Vercel project for “backend only” — `/api` is part of this deploy.

### 2.2 Environment variables

Vercel → Project → **Settings** → **Environment Variables**.  
Add for **Production** (and Preview if you want preview DBs):

| Variable | Example / notes |
| -------- | --------------- |
| `NODE_ENV` | `production` |
| `DB_DRIVER` | `postgres` |
| `DATABASE_URL` | Neon **pooled** URL with `sslmode=require` |
| `JWT_SECRET` | Long random secret (not the example value) |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_ADMIN_EXPIRES_IN` | `8h` |
| `APP_URL` | `https://YOUR_PROJECT.vercel.app` (or custom domain) |
| `API_URL` | `https://YOUR_PROJECT.vercel.app/api` |
| `CORS_ORIGIN` | Same origin as `APP_URL` (no trailing slash) |
| `VITE_APP_URL` | Same as `APP_URL` |
| `VITE_API_URL` | `/api` |
| `SESSION_COOKIE_SECURE` | `true` |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `PAYMENT_PROVIDER` | `manual` |
| `EMAIL_PROVIDER` | `console` (until SMTP is configured) |
| `MEDIA_PROVIDER` | `local` or `vercel_blob` / `cloudinary` when ready |
| `ALLOW_PROD_SEED_ADMIN` | `false` |

Optional but useful:

- `MTN_MOMO_NUMBER`, `ORANGE_MONEY_NUMBER`
- `EMAIL_FROM`, SMTP_* when email is live
- `BLOB_READ_WRITE_TOKEN` if using Vercel Blob

**Important:** `VITE_*` vars are baked in at **build** time. Set them before the first production build, then redeploy if you change them.

Generate a secret locally:

```bash
openssl rand -base64 48
```

### 2.3 Deploy

1. Click **Deploy** (or push to `main` if Git integration is on)
2. Wait for build + serverless function upload
3. Open the deployment URL

---

## 3. Post-deploy checks

### 3.1 Health

```bash
curl -s https://YOUR_PROJECT.vercel.app/api/health | python3 -m json.tool
```

Expect:

- `success: true`
- `data.status: "ok"`
- `data.database.connected: true`
- `data.database.driver: "postgres"` (or similar)
- `data.phase: 31`

### 3.2 Env shape (local shell with prod values)

```bash
# Load production values into your shell temporarily, then:
npm run env:check
```

### 3.3 Smoke suite

```bash
npm run qa:smoke -- --base=https://YOUR_PROJECT.vercel.app
```

### 3.4 Manual walkthrough

- [ ] Homepage / shop / product detail load
- [ ] Cart → checkout (guest or logged-in)
- [ ] Customer register / login
- [ ] Admin login at `/admin/login`
- [ ] `/api/settings/public` returns categories / featured products
- [ ] No SQLite / localhost URLs in production responses

---

## 4. Custom domain (optional)

1. Vercel → Project → **Settings** → **Domains** → add `www.yourdomain.com`
2. Follow DNS instructions (A/CNAME)
3. Update env vars to the final HTTPS origin:
   - `APP_URL`
   - `API_URL`
   - `CORS_ORIGIN`
   - `VITE_APP_URL`
4. **Redeploy** so Vite rebuild picks up `VITE_*` changes

---

## 5. Ongoing operations

| Task | How |
| ---- | --- |
| Ship code | Push to `main` → Vercel auto-deploys |
| Schema change | Write migration → `DB_DRIVER=postgres DATABASE_URL=... npm run db:migrate` against Neon |
| Demo data refresh | `npm run db:seed:demo` against Neon (careful in live shops) |
| Rotate JWT | New `JWT_SECRET` in Vercel → redeploy (logs everyone out) |
| Neon branching | Use Neon branches for preview DBs; point Preview env `DATABASE_URL` at the branch |

Never run `npm run db:reset` against Neon — it refuses Postgres by design.

---

## 6. Architecture reminder

| Piece | Where it runs |
| ----- | ------------- |
| React UI (`/src`, built to `dist`) | Vercel CDN / static |
| API (`/api/*` + `/server/*`) | Vercel Serverless Functions |
| Database | Neon PostgreSQL |
| Local SQLite | Dev only (`DB_DRIVER=sqlite`) — not production |

`vercel.json` already configures:

- SPA fallback to `index.html`
- `/api` function routing
- Security headers
- Function `maxDuration: 30`, memory `1024`

---

## 7. Troubleshooting

| Symptom | Likely fix |
| ------- | ---------- |
| `/api/health` → DB not connected | Wrong/missing `DATABASE_URL`; use pooled URL + `sslmode=require` |
| Empty shop / missing CMS | Migrations or seed not run on Neon |
| CORS errors | `CORS_ORIGIN` / `APP_URL` must match the browser origin exactly |
| Login works locally, fails on Vercel | Weak/`change-me` `JWT_SECRET`, or Preview vs Production env mismatch |
| `VITE_*` ignored | Changed after build — redeploy |
| 404 on client routes | Ensure `vercel.json` rewrites are present (already in repo) |
| `vite: command not found` on Vercel | Build tools were skipped as `devDependencies`. Repo sets `installCommand: npm install --include=dev` and keeps `vite` in `dependencies`. Redeploy after pulling latest `main`. |

---

## Quick checklist

1. Neon project + pooled `DATABASE_URL`
2. `npm run db:migrate` (+ seed) against Neon
3. Vercel import of this repo
4. Production env vars set (see table above)
5. Deploy
6. `GET /api/health` OK
7. `npm run qa:smoke -- --base=https://…`
8. Admin login + catalog smoke test
9. Revoke any PATs / secrets that were shared in chat or screenshots
