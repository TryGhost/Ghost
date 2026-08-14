# Editor-loop demo harness (slice 3 — THROWAWAY)

A minimal, human-runnable proof of the edit loop from the spec:

> click element in preview → resolve to theme source location → apply a text
> edit to the in-memory theme → worker re-renders → preview updates

This is a **throwaway UI harness** for the slice-3 editor spike. It is not a
workspace app, not wired into CI, and excluded from the package's build, lint
and publish surface (`files` only ships `build/`; `tsconfig.json` only
includes `src/`; lint runs on `src/` and `test/`). It will be deleted when
slice 4 lands the real editor surface in the admin toolbar. The automated,
CI-run proof of the same loop is `test/browser/editor-loop.test.ts`.

## Run it

```bash
cd packages/theme-renderer
pnpm exec vite demo
```

(`vite` is already in the package's dependency graph via vitest — no new
deps. If `pnpm exec` can't find it: `npx vite demo`.)

Open the printed URL. The page:

1. renders Casper's home route **with `data-edit` markers** inside a real Web
   Worker, from the recorded fixtures in `test/browser/fixtures/` — fully
   hermetic, no Ghost instance needed;
2. shows the HTML in an iframe (`srcdoc`), with a hover outline on every
   element carrying a marker;
3. on click, walks up to the nearest `data-edit` ancestor, shows its
   `{file, line, column}`, and prompts for replacement text;
4. applies the edit to the in-memory theme (`applyThemeTextEdit`, anchored to
   the clicked tag name), posts the edited theme to the worker — which builds
   a **fresh renderer** (the supported slice-3 path) — and swaps the iframe
   content with the re-render. Round-trip time is shown in the status bar.

## Notes and limits

- **Styling:** the iframe gets a `<base href>` pointing at the recorded site
  URL (`test/browser/fixtures/instance.json`). With a local Ghost dev
  instance running there, Casper's CSS loads; without one the preview is
  unstyled HTML. The loop works either way.
- **What's editable:** only the element's immediate text child — plain text
  and inline mustaches up to the first nested tag or `{{#block}}` boundary
  (full limits in `src/editor/text-edit.ts`). Clicking anything else gets a
  clear refusal. Elements without a `data-edit` ancestor (helper-emitted
  HTML: `{{ghost_head}}` output, post content, navigation) are not editable
  in this slice.
- **Repeated elements:** all post cards render from one source location in
  `partials/post-card.hbs`, so editing one card's excerpt edits **all** of
  them. That is correct — they share a single source position.
- Edits live in page memory only; reload to reset.
