# Triority

Pick **three things** each day that would make you feel productive. Tick all three and the day is won, and your streak grows. Miss a day and a monthly _savior_ can keep the streak alive.

Triority is a small installable web app (PWA) with a handmade sketchbook look: cream paper, black ink, hand-drawn circles and a crochet sunflower that grows as you finish your tasks.

- Works fully offline as a guest; data stays in the browser (IndexedDB).
- Optional account to keep history across devices. Guest history is moved into the account on first sign-in.
- Streaks are computed by pure TypeScript functions on the client and by Postgres functions on the server, so signed-in streaks cannot be edited from the browser.

## Stack

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| UI           | React 19, TypeScript (strict), Vite                           |
| Routing      | React Router 7                                                |
| Styling      | Tailwind CSS 4, colours as CSS variables                      |
| Animation    | Motion (`LazyMotion` + `m`), SVG stroke animations            |
| Fonts        | Caveat Brush and Lexend, self-hosted via `@fontsource`        |
| State        | Zustand                                                       |
| Guest data   | Dexie (IndexedDB) + `useLiveQuery`                            |
| Account data | Supabase (Postgres + Auth) through TanStack Query             |
| Validation   | Zod (`zod/mini`) on the client, constraints and checks in SQL |
| Dates        | `date-fns`, every day keyed as a local `yyyy-MM-dd` string    |
| PWA          | `vite-plugin-pwa` (Workbox), app-shell precache               |
| Tests        | Vitest + Testing Library, Playwright, SQL behaviour tests     |
| Hosting      | Vercel + Supabase                                             |

## Project layout

```
src/
  domain/        pure logic: dates, entries, streak + savior rules, schemas
  data/          EntriesRepository interface
    local/       Dexie implementation (guests)
    remote/      Supabase implementation (lazy-loaded, signed-in users)
  features/      daily question, celebration, task rows, growing sunflower
  screens/       Tasks, Affirm, Cal, Extras, Auth
  components/    glass nav, sheets, dialogs, hand-drawn SVG art
supabase/
  migrations/    schema, row level security, streak functions
  tests/         SQL behaviour tests (run against any Postgres)
e2e/             Playwright flows
scripts/         image export, icon move, bundle size check
```

UI code never imports Dexie or Supabase directly; it talks to `EntriesRepository` (an ESLint rule enforces this).

## Running locally

Requires Node 20+.

```bash
npm install
cp .env.example .env   # optional: only needed for accounts
npm run dev
```

The app runs as a guest without any environment variables.

### Scripts

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                           |
| `npm run build`         | Type-check, build, and fail if first-load JS exceeds 160 KB gz |
| `npm test`              | Unit and component tests                                       |
| `npm run test:e2e`      | Playwright flow (builds and serves the app)                    |
| `npm run lint`          | ESLint                                                         |
| `npm run typecheck`     | TypeScript only                                                |
| `npm run assets:images` | Export the sunflower as AVIF/WebP at 256/512/1024 px           |
| `npm run assets:icons`  | Generate PWA icons and favicons from the app icon              |

### Art assets

Source art lives in `assets-src/` (`sunflower_crochet_hd.png`, `triority_icon.png`). Run `npm run assets:images` and `npm run assets:icons` after changing either; the generated files in `public/` are committed. The full-size PNGs are never served.

## Environment variables

| Name                      | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `VITE_SUPABASE_URL`       | Supabase project URL                      |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anon (public) key                |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for sign-up |

Only the anon key ever goes to the client. The service-role key is not used anywhere in this project.

## Supabase setup

1. Create a project and apply the migrations, either with the CLI:

   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```

   or by pasting `supabase/migrations/*.sql` into the SQL editor in order.

2. In **Authentication → Providers**, enable Email (with "Confirm email" on) and Google.
3. In **Authentication → Attack Protection**, enable CAPTCHA with Turnstile and add the secret key. Keep the default rate limits on.
4. In **Authentication → URL Configuration**, set the site URL and add `<site>/auth` as a redirect URL.
5. Update the `connect-src` entry of the Content Security Policy in `vercel.json` to your project URL.

### Database tests

The SQL tests run against any local Postgres (14+), using a small stand-in for Supabase's `auth` schema:

```bash
createdb triority_test
cd supabase/tests
psql -d triority_test -v ON_ERROR_STOP=1 \
  -f local_auth_stub.sql -f ../migrations/20261022000000_init.sql -f streak_rules.sql
```

## Streak rules

- A day is **won** when it has exactly three tasks and all three are ticked. Ticks are only accepted on the day itself.
- The streak counts consecutive won days. Today counts once it is won; until then the streak shows the run through yesterday.
- One **savior** is earned each month (on the 1st, or the first open after it), up to two banked.
- A savior covers one missed day: it keeps the streak going but does not add to it. The app always asks before using one.
- If more days were missed than saviors are available, or the offer is declined, the streak starts over. Your best streak is kept.
- All logic works on stored date keys, so DST changes and travel never double-count or skip a day.

## Deployment

The app deploys to Vercel as a static Vite build. `vercel.json` sets the SPA rewrite, long-lived caching for hashed assets, and security headers (CSP, HSTS, `nosniff`, referrer and permissions policies, `frame-ancestors 'none'`).

## Licence

MIT
