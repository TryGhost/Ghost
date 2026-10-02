# Builder canvas

`CanvasBoard` presents caller-owned frames in world coordinates. Its camera
changes only the CSS transform of the world layer; frame widths, heights,
documents, and preview surface lifetimes remain the caller's responsibility.
Frame labels and controls stay in screen coordinates. Labels stagger when their
screen bounds overlap, including fitted compositions with very different lengths.
An optional configured `viewport` distinguishes a frame's device bounds from
its overview composition bounds. Opening it uses the device bounds and supplies
`opened` to the caller without remounting its content.

Click a header to select without moving the camera. Double-click it or press
Enter to open the fixed device viewport at a readable scale. Back and Escape
restore the previous overview and keyboard focus. Drag empty board space or
scroll over the overview to pan. Ctrl/Command-scroll zooms at the pointer.
Ordinary scroll inside an opened device belongs to that page.

The optional `canvasNavigation` setting on `IframePreviewDocumentSurface` relays
Ctrl/Command-scroll and Escape through the existing sandbox bridge. Only the
active, committed document can supply bounded input. Existing previews leave
this option disabled. An active inline editor handles its own Escape.

## Development harness

Run the normal development environment with `pnpm dev`, then open
`http://localhost:5174/__admin-dev__/canvas.html`.

The harness renders Home and Post in one real worker using recorded Content API
responses and the complete Core Casper 5.7.0 fixture. It embeds the matching
theme assets into four opaque-origin preview surfaces: desktop at 1440 × 900 CSS
pixels and mobile at 390 × 844 CSS pixels. jQuery and publication imagery still
use the fixture's external URLs; theme assets never come from the active site's
theme. The harness uses Admin's CSS lane and a standalone Shade provider.

`canvas.html` is served only by development Vite and is not a production build
entry. Its Ember boot assets are omitted so the regular Admin app cannot mount
over this standalone harness. It exposes no theme mutations or publication.

The harness starts with an experimental captured composition overview. Each
device remains mounted at its declared width and height; opening a frame reveals
that same live document. Back restores the overview camera. Switching to device
viewports or refreshing captures does not replace those documents.

`captureOverview` uses the authenticated layout bridge and document-coordinate
region screenshots. A sequence retains its backing frame/revision/document and
capture identity, and rejects changes in document, viewport, scroll, or extent.
The provisional per-frame aggregate budget is eight 2,048px-high images, 32 million
pixels, and 12 MiB of encoded image characters; existing per-image limits remain.
Coverage is geometric, independently of fidelity warnings. Uncaptured content
keeps its full document bounds and an explicit omission message. External images
are still replaced, captures reconstruct layout in inert documents, and neither
animations, sticky/fixed behavior, nor below-fold lazy loading are established
by a successful capture. The harness reports warnings and elapsed capture time.

This is one overview experiment. Expanded-height comparison, Source/adversarial
fixture evidence, source selection and direct editing, full capture fidelity,
native WebMCP, and performance measurements remain feasibility work. The harness
is not a shipped theme editor or evidence that Stage A has passed.

## Validation

From `apps/admin`:

```sh
pnpm exec vitest run src/builder/canvas --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/canvas-board.component.test.tsx src/builder/workspaces/theme/preview/preview-canvas-input.acceptance.test.tsx src/builder/workspaces/theme/preview/preview-layout.acceptance.test.tsx src/builder/workspaces/theme/preview/screenshot.acceptance.test.tsx --maxWorkers=1
pnpm typecheck
```

The unit cases cover camera bounds, pointer anchoring, selection/open/return,
drag thresholds, document DOM preservation, contiguous capture coverage, budgets,
and stale/cancelled capture rejection. Browser cases cover label collisions,
keyboard focus and native scrolling, the opt-in sandbox input boundary, and
below-fold capture pixels with viewport-height media queries and unchanged device
scroll. Full
repository validation uses `pnpm check`; see the [testing guide](../../../../../docs/contributing/testing.md).
