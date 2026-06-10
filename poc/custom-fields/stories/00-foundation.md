# Story 0 — Foundation: data model + repository facade

**Goal:** a single async repository that every surface uses to read/write custom-field data, seeded from `custom-fields.seed.json` and persisted to localStorage. No UI yet.

**Status:** ✅ Done. Implemented in `poc/custom-fields/repo.js`; used by every later story.

## Why first

Every later story (admin define, member detail, signup, account) depends on this one module. Building it once, with the async shape the real backend will have, means the UI never has to change when storage is swapped.

## Minimal-footprint rule

Everything lives in **one file in this `poc/` folder** (e.g. `poc/custom-fields/repo.js`), framework-agnostic plain ESM, no dependencies. Apps consume it by importing `poc/custom-fields/repo` directly. The **only** change inside any app is an import line plus usage at the call site. No new folders, components, or utils inside the apps.

Throwaway path: delete `poc/custom-fields/` and remove the import lines. Swap path to real backend: replace the internals of this one file with API calls; call sites are untouched.

## Scope

- Single async repository module (Promise-returning) with this interface:
  - `listFields()` → definitions
  - `getField(id)` / `createField(def)` / `updateField(id, patch)` / `deleteField(id)`
  - `getForm(surface)` / `setForm(surface, placements[])` (placements with `required`, `placeholder`, `order`)
  - `getValues(memberId)` / `setValue(memberId, fieldId, value)`
- Seed-on-first-run from `custom-fields.seed.json`, then persist to localStorage under one shared key.
- A tiny key-derivation helper (`label` → `key`, snake_case, dedupe).
- Exported `TYPES` constant so the admin create UI has one source for the type dropdown. (Presets were dropped, see ROADMAP.)

## Tasks

- [ ] `poc/custom-fields/repo.js`: plain ESM, no deps, localStorage-backed, the interface above.
- [ ] Seed loader from `custom-fields.seed.json` (import the JSON directly).
- [ ] `label` → `key` derivation + uniqueness.
- [ ] Export `TYPES` constant.
- [ ] Manual sanity check from the browser console.

## Open

- Importing a path outside an app's root may hit Vite `server.fs.allow` / TS resolution. If so, adjust config minimally (still in the deletable lane) rather than copying the file into the app.
- Ember (Story 2) import path is resolved when we get there; does not block React surfaces.

## Done = demoable

Can create/list/update/delete a field and read/write a member value from the browser console, with changes surviving a reload.
