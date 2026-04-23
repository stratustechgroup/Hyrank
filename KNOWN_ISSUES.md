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

---

## Addendum (code-quality reviewer feedback, 2026-04-22)

### `as unknown as any` should be typed casts

The Task 9.3 escape hatch says "cast to `Database["public"]["Tables"][T]["Row"]`" — but
the implementer used `as unknown as any` for unblock speed. Plan 2 Task 0 should replace:

- `app/admin/submissions/page.tsx:61, 93, 114, 149` — 4 sites
- `components/SubmitServerModal.tsx:132` — 1 site

…with one of:
- `as unknown as Database["public"]["Tables"]["server_submissions"]["Row"]` (after we add the table type)
- A proper generic helper in `lib/supabase/queries.ts` that wraps the `.from()` call

### `app/admin/submissions/page.tsx:93` — `servers`-table insert cast

This one is NOT about `server_submissions` — it's an insert payload type mismatch on
the real `servers` table. Plan 2 should fix it with a typed `TablesInsert<"servers">`
payload rather than bypassing via `any`.

### `searchServers` sanitizer coverage gap

`sanitizePostgRESTValue` in `lib/supabase/queries.ts` strips `,():` but leaves `%` and
`_`, which are PostgREST `ilike` wildcards. User query `%admin%` matches broadly
(unexpected search behavior, not a vulnerability). Plan 2 enhancement — prepend `\\`
to `%` and `_` in the sanitized pattern, OR switch to the PostgREST filter builder
and drop the raw-string `.or()` interpolation entirely.

### Stylistic cleanup

- `app/admin/submissions/page.tsx:61, 93, 114, 149` — leading whitespace is inconsistent
  with surrounding indentation. Cosmetic; fix when Plan 2 retypes those sites anyway.
- `app/api/servers/[id]/vote/route.ts:435` (GET handler) — `.or(...)` interpolates
  `ipHash` (hex) and `userId` (UUID), both safe, but stylistically inconsistent with
  the sanitized POST path. Consider migrating the cooldown-check GET into the Edge
  Function path in Plan 3.
