# Supabase backend

## Connect a project

1. Create a Supabase project.
2. Apply both files in `supabase/migrations/`, in filename order, using the SQL
   editor or the Supabase CLI. If the reviews migration is already applied, run
   only the new private-plans migration. Never rerun an applied migration.
3. Copy `.env.example` to `.env`. Set `PUBLIC_SUPABASE_URL` and
   `PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's URL and public publishable key.
   They are read at runtime, so one build serves every environment. Do not use a
   service-role or secret key here.
4. Configure Google sign-in using [the OAuth setup guide](course-reviews-setup.md).
   Add `https://YOUR_SITE/auth/callback` (and `http://localhost:5173/auth/callback`
   for development) to the Supabase redirect allow-list. Google returns there; the
   server exchanges the code for session cookies and sends the student back to the
   page they signed in from.
5. Set the same public environment values on your hosting provider and rebuild.

Without configuration, the planner and local saves work; cloud controls explain
that the backend is unavailable. No Supabase project is created by this repository.

## Persistence behavior

The board autosaves to this browser. Settings provides explicit private cloud
copies: save, load, update from the board, and delete. Loading a cloud copy replaces
this browser's board after confirmation. Subsequent edits are local until the user
updates the cloud copy. Older browser saves can be loaded and saved to the account.
Signing out clears the cloud list but keeps the current board in this browser.

`public.plans` stores an owner, name, versioned JSONB document, server timestamps,
and revision number. JSONB preserves complete planner snapshots without coupling
personal plans to a changing course catalogue. Ownership uses `auth.users(id)`;
account deletion cascades to plans. Row-level security and column permissions
protect reads and writes. Updates/deletes match the last observed revision; stale
writes fail visibly. The database validates names, document shape and size.

All authenticated accounts may save private plans. Public reviews retain their
separate verified Krea Google eligibility policy.

## The academic office (`/admin`)

The office is the one place the curriculum is edited. It is server-rendered:
`src/routes/admin/+layout.server.ts` reads the signed-in staff member, their role
(`office_staff`) and the shared draft (`office_workspace`) on the server, so every
office page arrives rendered. It needs Supabase; without it the office explains
that instead of opening.

The whole curriculum is one draft document (`src/lib/features/office/model.ts`).
Staff edit it in the browser and save it whole (`POST /api/admin/workspace`, with
the revision they started from, so nobody overwrites anyone). It then moves through
review on `/admin/changes`: send for approval, approve, publish. Those steps, staff
access, history and department requests are SvelteKit form actions backed by
`src/lib/server/office.ts`.

Publishing (`office_publish`) builds the public release in the database, so office
notes never leave it, and then calls the Vercel deploy hook (`VERCEL_DEPLOY_HOOK`).
The build pulls the current release (`npm run curriculum:pull`), so students see it
once the deploy finishes. "Student preview" opens the planner with
`?admin-preview=1` and the unsaved draft, in that tab only.

Roles: admin (everything, including staff access), publisher, reviewer, editor,
and department contributor (sends requests only). Row-level security enforces them;
the server checks give staff a clear message first.

To test the office on a Vercel preview, give the Preview environment the Supabase
variables and add `https://kcal-git-*-<team>.vercel.app/**` to Supabase Auth's
redirect URLs.

## Development checks

```sh
npm run check        # types and a11y (svelte-check)
npm run lint         # formatting (prettier)
npm test             # vitest: planner rules, office, storage, database
npm run build
npm run test:browser # playwright
```

CI (`.github/workflows/check.yml`) runs check, lint and test on every push.

Database tests run the actual migrations in PGlite, including ownership, anonymous
access, constraints, stale revisions and account deletion. Cloud browser tests use
mock HTTP responses to exercise the UI without credentials. They do not replace a
live Google OAuth and two-account Supabase smoke test before launch.

The schema contract is in `src/lib/infrastructure/supabase/database.types.ts`.
After applying future migrations, regenerate it with the Supabase CLI:

```sh
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/infrastructure/supabase/database.types.ts
```

Keep exported app aliases in separate files if replacing the contract with generated
types (currently `Json` and `PlanRow` are imported by the plan repository).

References: [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).
