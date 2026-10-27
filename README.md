# Triority

Pick **three things** each day that would make you feel productive. Tick all three and the day is won, and your streak grows. Miss a day and a monthly _savior_ can keep the streak alive.

Live at **[triority.vercel.app](https://triority.vercel.app)**.

Triority is a small installable web app (PWA) with a handmade sketchbook look: cream paper, black ink, hand-drawn circles and a crochet sunflower that grows as you finish your tasks.

- No account needed. Everything is stored on the device (IndexedDB) and works fully offline.
- **Back up and restore** from Extras as a JSON file. Restoring can merge with what's on the device or replace it, and every file is validated before anything changes.
- The app asks the browser for persistent storage and nudges for a fresh backup every couple of weeks.

## Stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| UI         | React 19, TypeScript (strict), Vite                        |
| Routing    | React Router 7                                             |
| Styling    | Tailwind CSS 4, colours as CSS variables                   |
| Animation  | Motion (`LazyMotion` + `m`), SVG stroke animations         |
| Fonts      | Caveat Brush and Lexend, self-hosted                       |
| State      | Zustand                                                    |
| Data       | Dexie (IndexedDB) + `useLiveQuery`                         |
| Validation | Zod (`zod/mini`)                                           |
| Dates      | `date-fns`, every day keyed as a local `yyyy-MM-dd` string |
| PWA        | `vite-plugin-pwa` (Workbox), app-shell precache            |
| Tests      | Vitest + Testing Library, Playwright                       |
| Hosting    | Vercel                                                     |

## Project layout

```
src/
  domain/        pure logic: dates, entries, streak + savior rules, backups, schemas
  data/          EntriesRepository interface
    local/       Dexie implementation
  features/      daily question, celebration, task rows, growing sunflower
  screens/       Tasks, Affirm, Cal, Extras
  components/    glass nav, sheets, dialogs, hand-drawn SVG art
e2e/             Playwright flows
scripts/         image, icon and font asset builds, bundle size check
```

UI code never imports Dexie directly; it talks to `EntriesRepository` (an ESLint rule enforces this). That keeps the door open for a synced implementation later without touching the screens. A server-backed version (Supabase, with row level security and server-side streak checks) lives on the `feat/accounts` branch.

## Running locally

Requires Node 20+. No environment variables are needed.

```bash
npm install
npm run dev
```

### Scripts

| Command                 | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                                 |
| `npm run build`         | Type-check, build, and fail if first-load JS exceeds 160 KB gz       |
| `npm test`              | Unit and component tests                                             |
| `npm run test:e2e`      | Playwright flows (builds and serves the app)                         |
| `npm run lint`          | ESLint                                                               |
| `npm run typecheck`     | TypeScript only                                                      |
| `npm run assets:images` | Export the sunflower as AVIF/WebP at 256/512/1024 px                 |
| `npm run assets:icons`  | Generate PWA icons, plus tab-sized favicons cropped to the sunflower |
| `npm run assets:fonts`  | Subset the title font to the characters the app uses                 |

### Art assets

Source art lives in `assets-src/` (`sunflower_crochet_hd.png`, `triority_icon.png`). Run `npm run assets:images` and `npm run assets:icons` after changing either; the generated files in `public/` are committed. The full-size PNGs are never served. Home-screen icons use the full design; browser-tab favicons (16/32/48 px) use just the sunflower so they stay readable.

## Your data

- Stored in this browser's IndexedDB. Nothing is sent anywhere: no accounts, analytics or trackers.
- **Back up now** downloads `triority-backup-<date>.json`. **Restore from backup** checks the file (format, version, task limits, no duplicate or future days) and then either merges or replaces. Streaks are recomputed rather than trusted from the file, and a backup can never add saviors.
- Browsers may clear site data under storage pressure, and Safari may clear it after a week without a visit unless the app is installed. Installing the app and keeping a recent backup protects against both.

## Streak rules

- A day is **won** when it has exactly three tasks and all three are ticked. Ticks are only accepted on the day itself.
- The streak counts consecutive won days. Today counts once it is won; until then the streak shows the run through yesterday.
- One **savior** is earned each month (on the 1st, or the first open after it), up to two banked.
- A savior covers one missed day: it keeps the streak going but does not add to it. The app always asks before using one.
- If more days were missed than saviors are available, or the offer is declined, the streak starts over. Your best streak is kept.
- All logic works on stored date keys, so DST changes and travel never double-count or skip a day.

## Deployment

The app deploys to Vercel as a static Vite build. `vercel.json` sets the SPA rewrite, long-lived caching for hashed assets, and security headers: a strict same-origin CSP, HSTS, `nosniff`, referrer and permissions policies, and `frame-ancestors 'none'`.

## Licence

MIT
