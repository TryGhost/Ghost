# Builder canvas

`CanvasBoard` presents caller-owned frames in world coordinates. Its camera
changes only the CSS transform of the world layer; frame widths, heights,
documents, and preview surface lifetimes remain the caller's responsibility.
Frame labels and controls stay in screen coordinates.

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

This initial slice shows device viewport crops. Full-page composition choices,
source selection and direct editing, capture fidelity, native WebMCP, and
performance measurements remain feasibility work. The harness is not a shipped
theme editor or evidence that those gates have passed.

## Validation

From `apps/admin`:

```sh
pnpm exec vitest run src/builder/canvas --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/canvas-board.component.test.tsx src/builder/workspaces/theme/preview/preview-canvas-input.acceptance.test.tsx --maxWorkers=1
pnpm typecheck
```

The unit cases cover camera bounds, pointer anchoring, selection/open/return,
drag thresholds, and document DOM preservation. Browser cases cover keyboard
focus and native scrolling, plus the opt-in sandbox input boundary. Full
repository validation uses `pnpm check`; see the [testing guide](../../../../../docs/contributing/testing.md).
