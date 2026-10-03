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
responses and the complete Core Casper 5.7.0 or Source 1.0.2 fixture. Casper is
the default; `?theme=source` chooses Source. The comparison links start separate
page loads, not shared-draft theme switches. These are repository fixture versions,
not claims about the latest theme releases. The worker serializes fixture jobs
because the renderer's helper state is shared.

Each fixture embeds its matching CSS, JavaScript, theme imagery and (for Source)
fonts into four opaque-origin previews: desktop at 1440 × 900 CSS pixels and
mobile at 390 × 844 CSS pixels. jQuery, publication imagery and Ghost card resources
still use external URLs; theme assets never come from the active site's theme.
The harness uses Admin's CSS lane and a standalone Shade provider.

The recorded dataset contains 25 first-page posts out of 34 and one representative
Post. Exact Casper responses retain their recorded bytes. Source's bounded
first-page feed requests slice that dataset and recompute pagination for the
requested limit; its default Home displays twelve cards. The existing related-post
recording also supplies Source's `authors` include. Unknown filters, second pages,
larger limits, foreign site/key and extra query parameters fail instead of calling
the live site or inventing content. The member-only representative's paywall remains
part of the recorded evidence; this is not a full publication dataset.

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

The development harness also feature-detects top-document
`document.modelContext.registerTool` and registers three read-only Stage A probes:
`ghost_canvas_probe_get_editor_state`, `ghost_canvas_probe_inspect_frame`, and
`ghost_canvas_probe_capture_frame`. State discovers immutable workspace/frame
handles and current device representation/revision handles. Inspection and capture
require those explicit targets; selection and focus never retarget a read.
Only fixed devices are addressed. Surface replacement, stale revisions, changed
document/layout, cancellation, and out-of-bounds regions return explicit errors.
Capture uses existing per-image limits and admits one concurrent probe capture;
it preserves board state and device scroll.

Registration uses the current WebMCP draft's abort-signal lifetime and is owned by
the harness rather than individual frames. Presentation changes do not register
again. Unsupported or failing APIs leave manual navigation available. The capture
result includes an experimental PNG data URL, lineage, coverage, and fidelity
warnings; it explicitly reports native image consumption as unverified. Mocked
API and host-browser evidence verify this adapter and opaque preview boundary,
not native Codex discovery/read/image consumption or the actual Admin embedding.
Those remain required before choosing the production adapter location. The probe
is not the shared draft controller and exposes no mutation or publication tools.

The expanded comparison uses four additional opaque-origin iframes, one per
device. Switching among captured compositions, expanded compositions, and device
viewports retains all eight documents; opening a frame always reveals its original
fixed device. Expanded geometry is limited to eight observations, 1,500ms of
measurement time, and a 16,000px viewport height. A failed measurement leaves the
fixed device available; nonconverging and capped results report their observed
extent and limits. The diagnostic rows and header tooltips distinguish the
expanded surface's actual CSS viewport from its configured device dimensions.
These are initial observations, not ongoing layout monitoring or proof that late
imagery, fonts, animations, or lazy content have settled. Geometry convergence
does not establish device fidelity. Actual browser cases demonstrate continuing
`vh`/`svh`/`dvh` growth, a height-media-query visual difference despite convergence,
and a 100,000px document truncated by the composition-height budget while its
device remains unchanged.

These are overview experiments. Broader Source/Casper visual fidelity, sticky/fixed and lazy-content
fidelity, source selection and direct editing, full capture fidelity, native
WebMCP, controlled refresh, and performance measurements remain feasibility work.
Measure all eight retained surfaces and capture work when profiling this
comparison. The harness is not a shipped theme editor or evidence that Stage A
has passed; no final overview technique has been chosen.

## Validation

From `apps/admin`:

```sh
pnpm exec vitest run src/builder/canvas --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/dev/webmcp-probe.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/dev/fixture.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/measure-expanded-composition.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/canvas-board.component.test.tsx src/builder/workspaces/theme/preview/preview-canvas-input.acceptance.test.tsx src/builder/workspaces/theme/preview/preview-layout.acceptance.test.tsx src/builder/workspaces/theme/preview/screenshot.acceptance.test.tsx --maxWorkers=1
pnpm typecheck
```

The unit cases cover camera bounds, pointer anchoring, selection/open/return,
drag thresholds, document DOM preservation, contiguous capture coverage, budgets,
and stale/cancelled capture rejection, expanded measurement bounds and stale/
cancelled results, and a bridge that never answers. Browser cases cover independent
composition/device layout and fidelity differences, label collisions,
keyboard focus and native scrolling, the opt-in sandbox input boundary, and
below-fold capture pixels with viewport-height media queries and unchanged device
scroll, addressed read-only capture without changing focus, and the top-document
registration boundary. Full
repository validation uses `pnpm check`; see the [testing guide](../../../../../docs/contributing/testing.md).
