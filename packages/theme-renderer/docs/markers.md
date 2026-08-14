# Source markers (slice 3, editor spike)

Opt-in render mode that stamps rendered HTML elements with
`data-edit="<file>:<line>:<column>"` so a click in a preview maps back to the
exact theme-source location. **Off by default — the default render path stays
byte-identical** (guarded by the parity suites: `test/integration/parity.test.ts`,
`fixture-parity.test.ts`, `test/browser/worker-render.test.ts`).

## API

```ts
const renderer = await createRenderer({siteUrl, contentApiKey, theme});

// default: no markers, byte-identical to slice-2 output
await renderer.render(request);

// editor preview: marked render, same renderer instance
const response = await renderer.render(request, {markers: true});
```

- `markers` is a **per-render** option (`RenderRequestOptions`) — the editor
  toggles preview modes on one renderer. Internally the renderer holds two
  `TemplateEngine`s: the default engine, and a marker engine built lazily on
  the first `markers: true` render. Marker emission is a compile-time source
  transform and compiled templates/partials are cached per engine, so the two
  variants never share caches — a markers render cannot pollute the parity
  path (asserted by `test/integration/markers-render.test.ts`).
- Renders on one renderer are **serialized** (an internal per-renderer
  mutex): the two engines share module-singleton seam state (deps +
  handlebars binding), so interleaved renders would cross-bind them —
  template-helper partials (navigation/pagination) would resolve against
  whichever engine was bound last. Callers may fire `render()` without
  awaiting; calls queue. Collapsing the dual engines so renders can overlap
  is the slice-5 item in `docs/review-backlog.md`.
- `renderer.getEngine('default' | 'markers')` exposes the per-mode engines as
  an invalidation handle (e.g. `resetCache()`); `'markers'` builds the marker
  engine on first call.
- `injectEditMarkers(source, filename)` (the pure transform) and
  `parseEditMarker(value)` / `EDIT_MARKER_ATTRIBUTE` are exported from the
  package root for consumers of marked render output (`src/engine/markers.ts`).
  The editor-side edit tools live on the **`./editor` subpath export** (see
  below); the scanner primitives (`src/engine/source-scanner.ts`) are
  internal and not exported.

## Marker payload

`data-edit="partials/post-card.hbs:4:1"`

- **file** — the theme-relative resolver path, exactly as the virtual fs names
  it (`index.hbs`, `default.hbs`, `partials/icons/search.hbs`). This is the
  key an editor uses to look up (and rewrite) the theme file.
- **line / column** — 1-based position of the open tag's `<` in the
  **original, untransformed** source, i.e. a direct seek target. Positions are
  computed against the pre-transform source, so earlier insertions never skew
  later positions; insertions never add or remove lines.
- Repeated elements rendered from one source location (each loop iteration of
  `partials/post-card.hbs`) all carry the **same** marker — correct, since
  they originate from the same source tag.
- `parseEditMarker` splits on the **last two** `:`-groups, so file names
  containing `:` would still parse (theme paths don't in practice).

## How it works

A lightweight HTML-open-tag scanner runs over each template/partial/layout
source **before** `handlebars.compile`, inside the engine's `onCompile` hook.
The scanning primitives live in `src/engine/source-scanner.ts` — shared with
the edit applier (`src/editor/text-edit.ts`), so both sides agree byte-for-byte
on what counts as a markable tag; `src/engine/markers.ts` owns the transform
itself — the filename the engine threads through compile
(spec design principle #3) is the marker's file component. The attribute is
inserted **immediately after the tag name**, which is always inside a single
static chunk — so open tags whose attribute lists span mustache boundaries
(`<html lang="{{@site.locale}}"{{#match …}}…{{/match}}>`, Casper's real
layout) work without parsing across chunks.

Chosen over a `handlebars.parse` AST walk: ContentStatement `value`s are
whitespace-stripped/unescaped copies of the source, so exact original
positions and cross-chunk tags are simpler and more robust in a raw scan that
treats mustaches as opaque regions.

The scanner understands:

- mustaches (`{{…}}`, `{{{…}}}`), hbs comments (`{{! }}`, `{{!-- --}}` incl.
  `}}` inside), the `{{!< layout}}` directive, raw blocks
  (`{{{{raw}}}}…{{{{/raw}}}}`);
- quoted attribute values (a `>` inside quotes doesn't end the tag), including
  quoted handlebars arguments *inside* quoted values
  (`srcset="{{img_url a size="s"}} 300w"` — Casper's responsive images);
- HTML comments, doctype, closing tags (all skipped);
- rawtext/RCDATA elements — `<script>`, `<style>`, `<textarea>`, `<title>`:
  the tags themselves are marked, their content is never scanned (a marker
  inside an inline script string like `document.write('<div>')` would corrupt
  the page);
- void and self-closing tags (marked like any open tag);
- pre-existing `data-edit` attributes in the tag (never double-marked);
- malformed open tags — when the quote/mustache-aware tag-end walk runs away
  to EOF (unbalanced attribute quote, `}}` inside a quoted helper argument,
  unterminated mustache in a quote), that tag gets **no marker** and the
  scanner recovers at the next `<`: one malformed tag never costs the rest of
  the file its markers.

Every compile path flows through the engine (`TemplateEngine.compile`):
templates, recursive `{{!< }}` layouts, theme partials (registered with their
resolver path by `cachePartials`), and — since this slice — the core helper
partials, which the seam's `hbs.registerPartial` now compiles via the engine
instead of its own `handlebars.compile` (closes the review-backlog "second
compile path" item). Core helper partials compile with **no filename** and so
naturally get no markers — correct, because they are package-embedded strings
(`src/helpers/tpl/partials.ts`), not theme-editable files.

## Functional-parity guarantee when ON

Markers change nothing except inserting `data-edit` attributes:
`markedHtml.replace(/ data-edit="[^"]*"/g, '') === unmarkedHtml` **byte for
byte** — asserted at engine level, over the recorded Casper fixtures in Node,
and inside a real Web Worker (the editor's runtime,
`test/browser/worker-render.test.ts`). Insertion after the tag name keeps the
HTML valid for attributes containing mustaches, and duplicate attributes
cannot arise (ours is the only insertion; theme-authored `data-edit` suppresses
it).

Reference numbers (recorded Casper home fixture): 282 markers —
`partials/post-card.hbs` 223 (25 cards × its tags), `default.hbs` 35,
`index.hbs` 8, `partials/icons/lock.hbs` 12, `partials/icons/search.hbs` 4.

## Punted edge cases (documented, deliberate)

| Case | Behavior | Rationale |
| --- | --- | --- |
| **Helper-emitted HTML** — `{{ghost_head}}`, `{{content}}`, `{{navigation}}`/`{{pagination}}` core partials, post `html` via triple-stache | no markers | The HTML doesn't exist in theme source; there is no source location to point at. Core helper partials compile with no filename; API-provided content passes through as data. A theme partial *overriding* a core partial (e.g. `partials/navigation.hbs`) IS marked — it registers with its resolver path. |
| **Dynamic tag names** — `<h{{level}}>` | tag skipped (rest of file still marked) | An inserted attribute would land between the static prefix and the mustache and merge with its output. |
| **Tags emitted from raw blocks** — `{{{{raw}}}}<div>…{{{{/raw}}}}` | skipped | Raw-block content is emitted verbatim by handlebars; marking it means changing page output semantics of an explicit "leave this alone" construct. |
| **Tags inside rawtext elements** — `<script>`/`<style>`/`<textarea>`/`<title>` content | skipped (the open tags themselves ARE marked) | Not tags to the HTML parser; insertion could corrupt inline JS/CSS. A `</script` hidden inside a mustache within a script body would end the skip early — theoretical, accepted. |
| **A `<` split across a mustache boundary** — e.g. a tag whose *name* is partly produced by a helper | skipped (same as dynamic tag names) | No stable static insertion point. |
| **Theme-authored `data-edit` attributes** | tag skipped | Never double-mark; the author's value wins. |
| **Compile-error positions with markers on** | handlebars reports positions in the *transformed* source | Editor-lane only; error line numbers still match (insertions never add lines), columns on marked lines may shift. |
| **`{{#each}}`/`{{#foreach}}` repetition** | every iteration carries the same marker | By design — see payload section. |

## What the editor loop consumes (slice-3 harness contract)

1. Render with `{markers: true}`; every markable element carries `data-edit`.
2. On click: walk up from the event target to the nearest element with a
   `data-edit` attribute; `parseEditMarker(el.getAttribute('data-edit'))` →
   `{file, line, column}`.
3. `file` is the exact key into the `theme` files object given to
   `createRenderer` (`ThemeFiles`); `line`/`column` (1-based) point at the
   `<` of the element's open tag in that file's current source.
4. Apply the text edit to the in-memory theme, build a fresh renderer from the
   edited files, re-render with `{markers: true}`. (Theme files are read at
   `createRenderer` time; editing the files object under a live renderer does
   NOT invalidate its compiled-template caches — `engine.resetCache()` clears
   templates/layouts but not already-registered partials. **New renderer per
   edit is the supported path** for this slice; incremental invalidation is a
   later optimization.)
5. Elements without a `data-edit` ancestor are helper-emitted (or punted) —
   the editor should treat them as not directly editable in this slice.

Implemented consumers of this contract:

- **`applyTextEdit` / `applyThemeTextEdit`** (`src/editor/text-edit.ts`,
  exported from the **`@tryghost/theme-renderer/editor` subpath**) — the
  loop's edit half: replaces an element's immediate text child at a marker
  position, **anchor-verified** (pass the clicked element's tag name; a
  mismatched position is a stale marker — bounded ±3-line re-locate on a
  unique candidate, loud failure otherwise; re-locate candidates are limited
  to tags the marker scanner would mark, so a stale marker can never land in
  commented-out or rawtext dead markup, and positions outside the file are
  refused outright). **newText is plain text by contract**: handlebars syntax
  (`{{`/`}}`) is rejected (template injection), newlines are rejected (edits
  must never shift the line numbers of other markers in the file), and
  `&`/`<` are HTML-escaped so the replacement always renders literally.
  Exact semantics and the deliberate limits (stops at nested tags and
  `{{#block}}` boundaries, tilde variants included; void/self-closing/rawtext
  refused) are documented in the module's doc block.
- **`test/browser/editor-loop.test.ts`** — the automated proof of the full
  loop in the editor's real runtime (Web Worker, Chromium): marked render →
  simulated click → edit → fresh renderer → re-render, untouched regions
  byte-identical; includes the repeated post-card case (one edit changes all
  cards).
- **`demo/`** — throwaway human-runnable harness (`pnpm exec vite demo`),
  excluded from build/lint/CI; see `demo/README.md`.
