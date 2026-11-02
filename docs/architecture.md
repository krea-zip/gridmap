# Application structure

The application uses SvelteKit for the UI and Supabase Auth/Postgres for shared
persistence. The UI can be prerendered and served from a CDN; database authorization
is enforced by Postgres, not hidden buttons or frontend email checks.

| Layer          | Location                             | Responsibility                                                                    |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Routes         | `src/routes`                         | Pages, layouts, server loads and form actions                                     |
| Planner shell  | `src/routes/(planner)`               | The four-column grid layout; the page is the board                                |
| Office         | `src/routes/admin`                   | The academic office: server-rendered, Supabase only                               |
| UI             | `src/lib/components`                 | Planner, board, catalogue, details, sidebar and office components                 |
| Planner domain | `src/lib/planner`                    | The plan store, its rules and suggested path, calendar, grades, shared context    |
| Curriculum     | `src/lib/curriculum`, `src/lib/data` | The runtime catalogue (`data.ts`), snapshot types, compiler, office preview       |
| Features       | `src/lib/features`                   | Auth, plans (saves, sharing, imports), reviews, and the office's draft model      |
| Server         | `src/lib/server`                     | Request-scoped Supabase client; office access checks, review and publishing       |
| Infrastructure | `src/lib/infrastructure/supabase`    | The browser's Supabase client and schema contract                                 |
| UI helpers     | `src/lib/ui`                         | Motion, drag, focus, breakpoints and display settings                             |
| Database       | `supabase/migrations`                | Versioned tables, constraints, grants and RLS policies                            |
| Verification   | `tests`                              | Vitest unit tests (rules, office, storage, database) and Playwright browser tests |

Components share state through `createContext`: the planner's `usePlan()`
(`$lib/planner/context`), the board's `useBoard()` and the office's `useOffice()`.
Nothing passes the plan down by prop.

Feature repositories are the only place that query feature tables. Components
render state and invoke actions. Cloud state ignores stale responses after a panel
closes or the signed-in account changes. Authentication has no review-specific
eligibility logic; the review repository checks that separately.

Browser storage keys remain stable so existing users retain their plans. Local
storage errors are surfaced. Saved copies detach from live reactive data. A backup
recovers a corrupt primary autosave, and writing a recovered plan preserves that
backup.

Keep curriculum rules independent of storage. Add schema changes as new migrations,
update the typed contract and repository, then test database permissions alongside
the feature behavior. Avoid adding table queries directly to route components.

See [backend setup](backend.md) for deployment configuration and limitations.
