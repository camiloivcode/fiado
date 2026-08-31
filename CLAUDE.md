# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Fiado" — a credit-ledger dashboard for a small shop: track what each customer owes
(`fiado` = credit purchase, `abono` = payment), close the cash register daily, and see
trends/reports. Single shop, single user, no auth. Spec: `docs/superpowers/specs/2026-08-31-frontend-backend-split-design.md`.

Monorepo, two independent npm packages, no root `package.json`:

```
backend/    Express + node:sqlite, REST API, port 4000
frontend/   React + Vite + React Router, port 5173 (dev) / 8080 (nginx in Docker)
```

## Commands

Backend (run from `backend/`):
- `npm start` — run the API (`node server.js`, port 4000, or `$PORT`)
- `npm test` — `node test.js`: plain `node:assert`, no framework. Single file — spins up
  Express on an ephemeral port and hits it with `fetch`, plus pure-function tests for
  `logic.js`. There is no way to run a single test in isolation; it's one linear script.

Frontend (run from `frontend/`):
- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the build on port 8080 (mirrors the Docker/nginx setup)
- No frontend test suite exists (deliberate — see the spec's Testing section).

Docker: `docker compose up` builds and runs both services (`api` on 4000, `web` on 8080).
`VITE_API_URL` is baked in at build time via compose `args:`.

## Backend architecture

- `db.js` — opens `node:sqlite` at `${DATA_DIR:-./data}/fiado.db`, creates the schema if
  missing, exports a `queries` object of prepared statements shared by all routes.
  `DATA_DIR` is what isolates test runs (`test.js` sets it to a fresh temp dir) and what
  Docker mounts as a named volume for persistence.
- `logic.js` — pure functions only, no I/O: amount validation/parsing, peso formatting,
  balance arithmetic, day-bucketing for charts. **Balances are never stored** — every
  `saldo` is `Σ fiado − Σ abono` computed from `movimientos` on each request
  (`saldoCliente`/`totalFiado`).
  - `diaLocal()` buckets a UTC timestamp into a Bogotá-local calendar day. The
    UTC-5 offset is hardcoded (`OFFSET_HORAS_BOGOTA`) with a `ponytail:` comment marking
    it as the spot to parametrize if this ever deploys outside that timezone.
- `routes/*.js` — one file per resource (`clientes`, `movimientos`, `caja`, `resumen`,
  `reportes`), mounted under `/api/*` in `server.js`. `server.js` exports `crearApp()`
  (used directly by `test.js`, no server binding needed) and only calls `.listen()` when
  `NODE_ENV !== 'test'`.
- Errors are always `{ error: "mensaje claro" }` — 400 for validation, 404 for missing
  resources, 500 only on a genuine DB failure.
- `ids` are `crypto.randomUUID()`, generated wherever a row is created.

## Frontend architecture

- `src/api.js` — the only place that calls `fetch`. Base URL is
  `import.meta.env.VITE_API_URL` (falls back to `http://localhost:4000`); every method
  already includes its own `/api/...` path. Parses `{ error }` from failed responses and
  throws a plain `Error` with that message — callers catch it and hand it to the shared
  toast (`components/Toast.jsx`, `useToast()`).
- No global state library — 5 pages, state fits in `useState` + a `cargar()` fetch-on-
  mount/after-mutation pattern repeated in every page component.
- `components/Layout.jsx` renders the shell (sidebar nav ≥1024px, bottom nav below) and
  a JS-measured sliding active-nav indicator (`useLayoutEffect` + `offsetTop/Left`,
  recalculated on route change and window resize — not CSS-only).
- `components/Contador.jsx` — animated count-up used for every displayed money/number
  (`requestAnimationFrame`, eased, skipped when `prefers-reduced-motion` is set).
- `components/ConfirmDialog.jsx` — the only pattern for destructive confirmations; never
  use the native `confirm()`/`alert()`.
- `components/TrendChart.jsx` — hand-rolled SVG line chart (no charting library). Draw-in
  reveal is a `clip-path` sweep on a wrapping `<g>`, not `stroke-dasharray`, because the
  abono line already uses `stroke-dasharray` for its dashed pattern (CVD-safe secondary
  encoding — see `docs`/dataviz skill if touching chart colors).
- `src/styles/global.css` is the entire design system: CSS custom properties for color/
  radius/shadow/easing, no CSS-in-JS, no Tailwind. Light theme only — dark mode was
  deliberately removed. Sidebar breakpoint is 1024px; the Resumen two-column grid needs a
  separate, wider breakpoint (1280px, `minmax()`) or a client name + balance in "Top
  deudores" collides — don't reuse the 1024px breakpoint for that grid.
- Icons are `lucide-react` throughout — don't reintroduce emoji icons or add a second
  icon library.

## Verification workflow (important)

When running the app locally to verify changes, **do not assume ports 4000/5173 are
free or belong to you** — other sessions/terminals on this machine may already have the
backend running against the real `backend/data/fiado.db` with real data. Check
`netstat`/running processes before killing anything on those ports. For throwaway
verification, prefer an isolated instance: a different port and a scratch `DATA_DIR`
(e.g. `PORT=4099 DATA_DIR=/tmp/fiado-verify npm start`), so seeding/deleting test data
can't touch anyone's real database.
