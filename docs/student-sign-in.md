# Google sign-in on Supabase + Vercel

The code is implemented locally. Deploy it after applying the migration and enabling Google below. No additional backend service or package is needed.

## What visitors can do

Guests can browse public courses and faculty details, arrange courses, see clashes and credits, keep their working draft in the current browser, and export a PDF or text. Existing browser saves remain accessible.

A verified Google identity with an exact `krea.ac.in` email domain can save private named plans to Supabase, load them on another device, create read-only share links, disable those links, and copy a shared snapshot into their own saved plans. A personal Google account gets “Use another account”. The Google domain hint improves the account picker; the API and database enforce access independently.

The working board autosaves locally. Account saves are explicit snapshots: editing a board does not overwrite a saved version on another device. Loading an account save first backs up the current board locally. Signing in never loads an account plan over the current draft. Signing out hides account saves; the current browser draft stays on that device.

Public descriptions and public faculty information remain public. This change does not introduce a separate campus-confidential faculty dataset. Do not add confidential contact/office-hour data to the published curriculum, which is shipped publicly.

## 1. Apply the new Supabase migration

In your existing Supabase project's **SQL Editor**, run:

`supabase/migrations/202611040001_student_sharing.sql`

Or use your linked Supabase CLI project with `supabase db push` after checking the pending migrations. Do not rerun migrations already applied. The new migration depends on `202610290001_course_reviews.sql` (verified Google identity/domain checks) and `202610310001_private_plans.sql` (private saved plans). For a new project apply all migrations in filename order.

The migration tightens `plans` row-level security, adds `plan_shares`, and adds a token lookup function. Anonymous visitors cannot list shares or access private plans. The public lookup returns only a sanitised snapshot and its creation time. Grades, email, failed attempts, and arbitrary extra fields are stripped in the database. Share names are generic to avoid publishing a private saved-plan title.

The allowed domain is stored in `private.review_settings` and initially contains only `krea.ac.in`. If Krea uses another official student domain, update that allowlist deliberately in SQL; the browser's domain hint alone does not grant access.

## 2. Set up Google OAuth

In **Google Cloud → Google Auth Platform**:

1. Select or create the project for kcal. Set its branding and support email.
2. Configure the audience. Use **External** if you are not administering Krea's Google Workspace; while testing, add your Krea email as a test user. Use Internal only for a project owned by the appropriate Workspace organisation. Publish the app before opening access to all intended students.
3. Use the basic `openid`, email and profile scopes.
4. Create an OAuth client of type **Web application**. Add your production site origin under authorised JavaScript origins, and `http://localhost:5173` if developing locally.
5. Under **Authorised redirect URIs**, add the Supabase callback:

   ```text
   https://kyqqpuchodpgbvaytuxd.supabase.co/auth/v1/callback
   ```

   This is the public project URL in this checkout. If deploying against a different Supabase project, use the callback displayed in that project's Google provider settings.

6. Copy the client ID and client secret to **Supabase → Authentication → Sign In / Providers → Google**, enable Google and save. Keep the client secret in Supabase; it is not a public Vercel environment variable.

[Official Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## 3. Allow the website callback in Supabase

In **Supabase → Authentication → URL Configuration**:

- **Site URL:** your real production origin, for example `https://YOUR-SITE.vercel.app`.
- **Redirect URLs:** `https://YOUR-SITE.vercel.app/auth/callback` and `http://localhost:5173/auth/callback`.
- Add `http://127.0.0.1:4173/auth/callback` only if manually testing OAuth with the Playwright development server.
- If using a custom domain, add that domain's exact `/auth/callback` URL too. For previews, prefer a stable preview hostname and allow its exact callback.

There are two different callbacks: Google redirects to Supabase's `/auth/v1/callback`; Supabase redirects to kcal's `/auth/callback`. The code uses PKCE with cookies. A same-tab session-storage value restores a shared-link destination after OAuth.

[Official redirect URL settings](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Check Vercel environment variables and deploy

In **Vercel → your project → Settings → Environment Variables**, set these for the intended environments:

| Variable                          | Value                                               |
| --------------------------------- | --------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`             | `https://kyqqpuchodpgbvaytuxd.supabase.co`          |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key from that same Supabase project |
| `PUBLIC_SITE_URL`                 | Your production origin, if using a custom domain    |

Keep the existing `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD` and optional `VERCEL_DEPLOY_HOOK` for the academic office. Student routes use the publishable key plus the user's session and RLS; they do not use the secret key. The Google client secret belongs only in Supabase's Google provider settings.

Redeploy Vercel after changing environment variables. For local development use `.env.local` (gitignored); restart the development server after changes.

## 5. Test the real provider after deployment

1. As a guest, place a course and note its trimester. Open Settings → Log in with Google.
2. Choose a Krea account. Confirm the same course/trimester and any grades survive the return.
3. Save “Plan A”. Sign in on another browser/device and load it from Settings.
4. Create a share link. Open it in a private window: it should be read-only, with no email or grades. Confirm the visitor's draft is unchanged.
5. Sign in as another Krea user, choose “Copy to my plans”, and find that private copy in Settings.
6. Disable the original link. Reload it in the private window: it should say unavailable. Previously copied plans cannot be recalled.
7. Sign in with a personal Google account: it should show “Use another account” and deny private plan/share operations.
8. Try Save as PDF as a guest. The separate printable page has a “Print / save as PDF” button; choose Save as PDF in the browser print dialog. Grades and email are excluded.

Automated browser tests mock account/API responses; database tests execute the real migration in PGlite. They do not replace this real Google consent/callback check.

Old `#plan=...` links still open read-only previews. Those historical links contain the snapshot itself and cannot be revoked. All newly created links use the revocable Supabase-backed flow.
