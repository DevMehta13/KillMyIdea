# Backup & Recovery Strategy

## Automatic Backups

Supabase free tier includes **daily automatic backups** with 7-day retention.

**Access:** Supabase Dashboard → Settings → Database → Backups

## Manual Backup

Before any production migration:

1. Go to Supabase Dashboard → Settings → Database → Backups
2. Create a manual backup point
3. Run the migration
4. Verify the migration succeeded

## Recovery

1. Go to Supabase Dashboard → Settings → Database → Backups
2. Select the restore point
3. Follow the Supabase restore wizard

## Migration Safety

All migrations in `supabase/migrations/` are:
- Sequential (numbered 001-005+)
- Idempotent (`IF NOT EXISTS` / `IF EXISTS` guards)
- Forward-only (no rollback scripts — restore from backup if needed)

## Credit Reconciliation

If credit balance issues occur:

```sql
-- Verify a user's balance matches transaction history
SELECT
  p.credit_balance as current_balance,
  SUM(ct.amount) as computed_balance
FROM profiles p
LEFT JOIN credit_transactions ct ON ct.user_id = p.id
WHERE p.id = 'USER_ID'
GROUP BY p.credit_balance;
```

## Data Export

For manual data export, use Supabase Dashboard → Table Editor → Export CSV, or connect via `psql`:

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -c "COPY (SELECT * FROM ideas) TO STDOUT CSV HEADER"
```
