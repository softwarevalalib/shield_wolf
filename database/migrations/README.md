# Database migrations

Migrations are JavaScript modules: `NNN_name.js` exporting `up(db, driver)`.

```bash
npm run db:migrate
npm run db:migrate:status
```

- Production / staging: set `DB_DRIVER=postgres` and `DATABASE_URL` (Neon).
- Local: set `DB_DRIVER=sqlite` and optionally install `better-sqlite3`.

Do **not** sync SQLite and PostgreSQL automatically. Apply migrations in each environment.
