# Supabase backend

## What lives where

- **Supabase** holds the curriculum (courses, programmes, rules, lecturers, descriptions), its published releases, and the academic office's shared draft and history.
- **The website** ships a copy of the current release: before each build, `npm run curriculum:pull` writes it to `src/lib/data/curriculum.json` and `course-descriptions.json`. Without Supabase settings the build uses the committed copy.
- **Each student's browser** keeps their plan (`kcal-plan` in local storage). A shared plan travels inside its link.

## Connect a project

1. Create a Supabase project.
2. Apply the files in `supabase/migrations/` in filename order, with the SQL editor or the Supabase CLI. Never rerun one that's already applied.
3. Copy `.env.example` to `.env` and fill it in. Set the same values in Vercel's environment settings and redeploy.
   - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public; the build reads the current release with them.
   - `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`: server only, for the academic office.
   - `VERCEL_DEPLOY_HOOK` (optional): publishing asks Vercel to rebuild the site.

## The academic office (`/admin`)

The office is the one place the curriculum is edited. It signs in with one shared password (`ADMIN_PASSWORD`) and a name, which goes into the history; the server keeps the sign-in in a signed, http-only cookie for a week (`src/lib/server/officeAuth.ts`). Changing the password signs everyone out. A wrong password waits a second before answering. Anyone with the password can do everything: there are no per-person accounts or roles.

Once signed in, the server talks to Supabase with `SUPABASE_SECRET_KEY`. The office functions (`office_save`, `office_publish`, `office_deployment`) accept only that key; students and visitors can't call them (`tests/office-database.test.mjs`).

The whole curriculum is one draft document (`src/lib/features/office/model.ts`). Staff edit it in the browser and save it whole (`POST /api/admin/workspace`, with the revision they started from, so nobody overwrites anyone). On `/admin/changes` they publish it: `office_publish` builds the public release in the database, so office notes never leave it, then the deploy hook rebuilds the site, which pulls the new release. "Student preview" opens the planner with `?admin-preview=1` and the unsaved draft, in that tab only.

`office_staff` and `office_submissions`, from the earlier per-person sign-in, are no longer used and are left in place so nothing in them is lost.

## Development checks

```sh
npm run check        # types and a11y (svelte-check)
npm run lint         # formatting (prettier)
npm test             # vitest: planner rules, office, storage, database
npm run build
npm run test:browser # playwright
```

CI (`.github/workflows/check.yml`) runs check, lint and test on every push. Database tests run the actual migrations in PGlite.

The schema contract is in `src/lib/infrastructure/supabase/database.types.ts`. After applying migrations, regenerate it with the Supabase CLI:

```sh
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/infrastructure/supabase/database.types.ts
```
