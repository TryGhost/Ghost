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
this option disabled. Canvas text/image editors wait for the parent to acknowledge
committed document readiness through the authenticated command port. An active
canvas text draft survives Tab, focus changes, camera actions, Back and reopening
its retained document. Within that iframe, trusted Escape cancels the draft even
after focus moves to another element; a pending explicit commit must finish first.
Rejected canvas commits preserve the text. Existing non-canvas blur behavior stays
unchanged. Document replacement, restoration and destruction clear activity;
these cleanup signals do not preserve draft text across document replacement.

Each iframe load has its own navigation check. Consecutive loads cannot reuse
the accepted document's bridge receipt to hide an unbridged navigation. Restoring
the accepted document, replacing it or destroying its surface cancels the old
checks. Expected native form navigation keeps its existing restoration behavior
without reporting a bypass. This guard does not preserve draft text across a
restored document.

The board retains activity per frame and keeps an opened draft at scale one or
greater while camera controls are used. Back restores the saved overview and
reports the retained draft outside the frame. Browser evidence uses the actual
inline runtime. The fixture harness now commits literal template text through its
real renderer worker and refreshes all four fixed device previews. It admits one
retained manual text draft across the board, with Resume/Cancel actions when
another frame is opened. This ownership lasts while its source document is
retained; source-replacement/conflict persistence and shared controller ownership
remain milestone work.

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
over this standalone harness. Its theme edits are local fixture drafts that reset
on reload; it exposes no active-site mutation or publication.

Single-click selects source context; double-click opens an eligible literal text
child. Enter commits, Escape cancels, and camera/focus actions preserve text.
Dynamic, mixed, nested and unsupported namespace output remains selectable with
source context instead of being replaced with hardcoded text. Generated markers
use a fresh parent-owned attribute separate from authored `data-edit`, including
helper/content aliases. This is ordinary theme-source correspondence, not a
security boundary against scripts deliberately manipulating preview markers.
The source panel is read-only; settings and general source mutations remain later
work. A worker edit checks its source revision and accepts candidate source only
after Home and Post both render successfully. Already submitted commits wait for
their real outcome; Cancel does not claim to undo an accepted write.

The harness starts with an experimental captured composition overview. Each
device remains mounted at its declared width and height; opening a frame reveals
that same live document. Back restores the overview camera. Switching to device
viewports or refreshing captures does not replace those documents.

`captureOverview` uses the authenticated layout bridge and document-coordinate
region screenshots. A sequence prepares one authenticated, scriptless source
snapshot and reuses that inert document for every serial tile, instead of cloning
the changing theme DOM again. The result records its snapshot identity as well as
its backing frame/revision/document and capture identity, and rejects changes in
document/runtime instance, local-edit generation, viewport, scroll, or extent.
Session disposal, abort, replacement, restoration and destruction remove the
snapshot and refuse later regions; overlapping region requests are rejected.
Fonts settle within the surface's bounded timeout before stable capture begins.
The provisional per-frame aggregate budget is eight 2,048px-high images, 32 million
pixels, and 12 MiB of encoded image characters; existing per-image limits remain.
Coverage is geometric, independently of fidelity warnings. Uncaptured content
keeps its full document bounds and an explicit omission message. Unreadable external images
are still replaced, captures reconstruct layout in inert documents, and neither
animations, sticky/fixed behavior, nor below-fold lazy loading are established
by a successful capture. The harness reports warnings and elapsed capture time.

The stable sequence freezes supported active CSS animation properties at their
observed computed values through an owned stylesheet. It suppresses copied CSS
animations/transitions, including completed animations that would restart on
reconstruction. It leaves the live animation unchanged. Animated pseudo-elements,
video, SVG animation and known GIF/blob backgrounds (including pseudo backgrounds)
produce an explicit unavailable-composition error; fixed device previews remain
available. Inline-important animation declarations are also refused where the
snapshot cannot reliably override them. Renderer-added transition styles are
removed from originally unstyled capture nodes when they are the only declaration,
so basic author `[style]` selectors retain their source behavior.

This establishes one DOM source and the tested motion/resource classes, not a
universal frozen-pixel certificate. Unknown animated resource formats, transforms,
pseudo reconstruction, sticky/fixed layout, late resources and source-correspondence
geometry still need the Stage A compatibility evidence. A theme-script mutation
without a new render revision can leave the captured instant different from the
live page; current source correspondence and bounded refresh remain future work.
No captured-region source mapping is supplied by this slice.

The harness opts into `captureLoadedImages` on its preview surfaces. Stable
snapshot sessions also freeze already loaded readable images within these budgets;
ordinary one-shot screenshots keep their existing opt-in behavior. At snapshot
time it freezes already loaded, browser-readable `img` pixels into bounded PNG
bitmaps without fetching or changing the live image. This includes draft/data
images, decoded blobs even after URL revocation, and remote images whose original
load already permitted pixel reads through CORS. It freezes the chosen picture
source and reports that animation is represented at one instant. The clone is
built in a document without a window so copying the DOM cannot refetch images.
Raster dimensions retain the image's aspect ratio and enough resolution for its
untransformed displayed CSS size, including density-corrected responsive sources.
An inert SVG wrapper retains the original intrinsic dimensions when the bitmap
needs more raster pixels; empty SVG omissions preserve those dimensions too.
CSS sizing inputs stay unchanged, including flex allocation, borders, padding,
and transforms. Transform rendering itself remains part of broader fidelity work.
Completed failures with unknown dimensions keep the browser's missing-image/alt
layout, including distinct missing, empty, and failed responsive-source behavior.
Pending lazy images retain blank intrinsic dimensions. No original source is retried.
Other previews leave this option disabled.

The provisional per-snapshot limits are 16 attempts, 4,096px per image dimension,
four million pixels per image and sixteen million attempted pixels in total,
1 MiB of encoded image characters per image and 2 MiB in total, including any SVG
wrapper and additionally bounded
by remaining space in the existing 4 MiB snapshot-document limit. Over-budget or
unloaded images receive explicit omission warnings. Below-fold lazy imagery stays
unloaded; snapshotting does not scroll or prefetch to manufacture coverage.
Warnings describe the snapshot's image state, not proof of every requested region.

Existing draft asset resolution preserves real `img` and CSS-background pixels.
Remote images loaded without readable pixels, external CSS backgrounds and SVG
images still use the existing omission path. There is no image proxy, credentialed
fetch, CORS bypass, or sandbox relaxation. Real browser pixel tests prove the
supported classes and unchanged viewports; they do not establish fidelity for
the stock themes' inaccessible publication covers or all animated/lazy content.

The development harness also feature-detects top-document
`document.modelContext.registerTool` and registers three read-only Stage A probes:
`ghost_canvas_probe_get_editor_state`, `ghost_canvas_probe_inspect_frame`, and
`ghost_canvas_probe_capture_frame`. State discovers immutable workspace/frame
handles and current device representation/revision handles. Inspection and capture
require those explicit targets; selection and focus never retarget a read.
Only fixed devices are addressed. Surface replacement, stale revisions, changed
document/runtime instance/layout, cancellation, and out-of-bounds regions return explicit errors.
Protocol `canvas-fixture-probe-2` certifies only the addressed backing render.
Inspection and capture refuse active local drafts, successfully modified DOM that
has not been rerendered, and transient inline-edit notices. They preserve draft text,
camera and scroll rather than silently selecting another surface. Clean reads
after cancellation require any notice to clear; accepted edits require an explicitly
discovered fresh render. Each read compares runtime instance and local-edit generation
before and after its work, including a draft that starts and cancels during the read.
Document restoration creates a new instance even when it reuses a render ID;
callbacks from the old instance cannot complete a restored editor. Restoration
revokes the old callback's signal. Ordinary replacement can be initiated by the
accepted callback itself, so result delivery is instance-pinned without aborting
that transaction. Legacy raw surface inspection and screenshots remain raw reads;
they do not acquire revision certification from this policy.
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
fidelity, editing beyond eligible literal text, full capture fidelity, native
WebMCP, controlled refresh, and performance measurements remain feasibility work.
Measure all eight retained surfaces and capture work when profiling this
comparison. The harness is not a shipped theme editor or evidence that Stage A
has passed; no final overview technique has been chosen.

## Validation

From `apps/admin`:

```sh
pnpm exec vitest run src/builder/canvas --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/capture-snapshot.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/dev/webmcp-probe.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/dev/fixture.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/workspaces/theme/preview/preview-images.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/measure-expanded-composition.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/canvas-board.component.test.tsx src/builder/workspaces/theme/preview/preview-canvas-input.acceptance.test.tsx src/builder/workspaces/theme/preview/preview-layout.acceptance.test.tsx src/builder/workspaces/theme/preview/screenshot.acceptance.test.tsx --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/canvas/canvas-inline-draft.component.test.tsx --maxWorkers=1
pnpm exec vitest run src/builder/workspaces/theme/preview/preview-navigation-loads.test.ts --maxWorkers=1
pnpm exec vitest run -c vitest.acceptance.config.ts src/builder/workspaces/theme/preview/preview-navigation.acceptance.test.tsx --maxWorkers=1
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
registration boundary, draft/notice refusal, in-flight draft cancellation and
restored callback isolation. Full
repository validation uses `pnpm check`; see the [testing guide](../../../../../docs/contributing/testing.md).
