# Known Issues — Punted to Enhancement Plan 2

This file documents type-alignment gaps introduced during Enhancement Plan 1 Task 4
(aligning `lib/supabase/types.ts` with the generated `database.types.ts`).

The generated schema makes many columns `| null` that the hand-written types treated
as non-null. Rather than cascade-fix 22+ errors across callers, minimal casts and
`LegacyServerRow` shims were applied. Plan 2 will address these with proper
null-coalescing at each read site.

---

## `lib/supabase/queries.ts`

- Added `LegacyServerRow` type alias (preserves pre-migration-003 non-null column shapes)
- Applied `as unknown as LegacyServerRow[]` cast at every `.from("servers").select("*")` boundary
- Applied `as unknown as LegacyServerRow` cast in `getServerById` and `getRandomServer`
- `transformServer()` accepts `LegacyServerRow` instead of generated `ServerRow`

Columns needing proper null-handling in `transformServer` when Plan 2 removes the shim:
`vote_count`, `weekly_votes`, `players_online`, `players_max`, `rating_avg`,
`rating_count`, `view_count`, `click_count`, `is_premium`, `status`, `ranking_score`,
`query_port`, `monthly_votes`, `votifier_enabled`, `votifier_port`, `verified`,
`featured`, `created_at`, `updated_at`

---

## `app/admin/submissions/page.tsx` (3 sites — lines 60, 112, 146)

- Cast: `(supabase as unknown as any).from("server_submissions")`
- Reason: `server_submissions` table is not in the generated `database.types.ts`
- Action needed in Plan 2: investigate whether this table exists in Supabase (migration
  may be missing) or add it to the schema. If the table exists, regenerate types and
  add it to `lib/supabase/types.ts` re-exports. If not, the admin flow needs updating.

---

## `components/SubmitServerModal.tsx` (1 site — line 131)

- Cast: `(supabase as unknown as any).from("server_submissions")`
- Same root cause as above — `server_submissions` not in generated types.
