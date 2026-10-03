# Builder canvas

`CanvasBoard` positions caller-owned live frames in world coordinates and changes
only the world container's CSS transform for pan/zoom. Frame dimensions, documents
and preview lifetimes remain the caller's responsibility. Every frame accepts
input directly; there is no opened-frame state, inert overview or permanent
pointer overlay. Single-clicking a header selects without moving the camera.
Double-click or Enter fits that frame on the board without resizing its document.
Headers stay in screen coordinates and stagger horizontally outside page content.

Drag empty board space or scroll to pan. Ctrl/Command-scroll zooms at the pointer.
The authenticated `canvasNavigation` bridge relays zoom, Escape and inline draft
activity. Its additional `canvasPanning` option relays ordinary wheel input from
live compositions; fixed devices retain native page scrolling. Locally scrollable
editor controls consume their own scrolling first. Existing non-canvas previews
leave these options disabled. Space-drag across iframe boundaries remains work
for a later interaction slice.

Double-click source-proven literal text directly in a ready live frame to edit.
The board fits only when the target needs a readable scale/position; editing already
visible text at a readable zoom preserves the camera. Camera controls maintain a
minimum scale of one while a text draft is active. Inline text survives Tab, focus
transfers and camera actions while its document is retained. Commit and Cancel are
explicit; cancellation during a submitted commit reports its actual outcome.
Existing non-canvas blur behavior remains unchanged.

Canvas text creation waits for parent admission over its authenticated document
port. A surface can supply an `admitInlineTextEdit` callback to reserve editor-wide
ownership synchronously before the runtime creates the editor. The runtime checks
its original literal node, marker, base text, visibility and mode again after
admission. Pending requests are bounded, cancelled with the editor and retired
with the document. Other canvas
callers admit by default; the fixture harness supplies the single-owner policy.
Every board selection intent retires pending admission while preserving an
already-created draft. The harness records accepted keyboard admission times and
checks originating input times on iframe selection and Escape, so delayed older
receipts cannot cancel a newer edit. This policy does not preserve drafts across source replacement.
Canvas selection/admission messages carry the originating trusted input's
cross-document performance time. A newer selection fences older requests before
ownership reservation and ignores delayed selection receipts; fresh keyboard
activation remains eligible. An obsolete approval cannot strand ownership.

Each iframe load has its own navigation check. Consecutive loads cannot reuse the
accepted bridge receipt to conceal unbridged navigation. Replacement, restoration
and destruction retire old checks; expected native form navigation preserves its
existing restoration behavior. Canvas links/forms select instead of navigating.

## Development harness

Run `pnpm dev`, then open `http://localhost:5174/__admin-dev__/canvas.html`.
Casper 5.7.0 is the default fixture; `?theme=source` selects Source 1.0.2. These are
repository fixture versions. Reloading with another fixture resets local edits.
The harness is a development Vite entry without Ember boot
assets and exposes no active-site mutation or publication.

One worker renders recorded Home/Post content and complete fixture theme assets.
Its jobs serialize because renderer helper state is shared. Home/Post each have
1440 × 900 and 390 × 844 configured device variants. Four live composition iframes
are displayed by default; four separate fixed-height device iframes remain mounted
for addressed inspection. No automatic screenshot drives the canvas. Switching the
harness's Full page/Device views retains all eight documents. Switching views is
unavailable while a manual draft is retained; Resume/Cancel remain available.
Per-frame fallback and source-replacement recovery are still milestone work.

Composition height uses the authenticated layout bridge, limited to eight
observations, 1,500ms and 16,000 CSS pixels. Actual composition viewport dimensions
can differ from configured device dimensions: viewport-height CSS, fixed/sticky
behavior and lazy loading require separate device checks. Height caps, instability
and failures have compact actionable notices. Measurement currently runs after
load/accepted document delivery; ongoing late-resource layout observation remains
work. Settling alone does not establish device fidelity or full lazy-content loading.

The harness commits eligible literal text through the real fixture worker, accepting
source only after Home and Post both render successfully, then updating all eight
documents. Generated markers are separate from authored/helper attributes.
Dynamic, mixed, nested and unsupported-namespace text stays selectable with source
context instead of becoming hardcoded content. Inline image replacement is disabled
in this literal-text harness; images remain selectable without a picker or upload.
Other preview consumers retain their existing image-edit behavior. Shared literals
update every use.
One manual draft can be retained across the board, with Resume/Cancel. Shared
controller ownership, source-replacement preservation and conflict recovery remain
future slices.

The recorded dataset has 25 first-page posts out of 34 and one member-only Post;
its paywall remains part of the evidence. Casper retains recorded responses.
Source's bounded first-page requests slice the dataset and recompute pagination;
its default Home shows twelve cards. Existing related-post data includes Source's
authors. Unknown filters/pages, larger limits, foreign site/key and additional
query parameters fail instead of fetching or inventing content. External publication
imagery, jQuery and Ghost card resources retain their existing URLs.

## Diagnostics and addressed inspection

Diagnostics occupy no canvas UI panel. Bounded composition summaries, fixture
revision and site-tool status are returned in `CanvasProbe.state().diagnostics`
and emitted as structured `[Ghost canvas]` console debug records. Visible UI retains
only actionable failures, source selection and draft recovery. The read-only source
context clears after an accepted replacement.

The top-level harness feature-detects `document.modelContext.registerTool` and
registers `ghost_canvas_probe_get_editor_state`, `ghost_canvas_probe_inspect_frame`
and `ghost_canvas_probe_capture_frame`. Registrations belong to the harness,
not individual previews. Camera and presentation changes do not register again;
unsupported APIs leave manual editing available.

Protocol `canvas-fixture-probe-2` addresses explicit immutable fixed-device
workspace/frame/representation handles and expected revision. It never uses
current selection to retarget a read. Current document/runtime instance and
local-edit generations are checked before/after reads. Local drafts, modified DOM
and transient edit notices refuse certified reads without changing user view or
text. Restoration creates a new runtime instance and retires prior callbacks.
Ordinary raw preview inspection/screenshots remain uncertified raw reads.

Explicit screenshots retain their bounded image, pixel and encoded-size budgets,
coverage metadata and omission warnings. Stable sequences use one scriptless
snapshot with lifecycle cleanup; opt-in readable loaded-image freezing preserves
supported intrinsic geometry. Inaccessible resources may be omitted, and capture
failure does not remove live canvas imagery or disable editing. There is no image
proxy, credentialed capture fetch, CORS bypass or sandbox relaxation.

Probe captures admit one concurrent request and preserve device scroll/camera.
PNG data URL results are experimental. Mocked API and host Chromium checks do not
prove native Codex discovery, model-visible image delivery or actual Admin embedding.
Those integration gates, the shared controller and complete milestone validation
remain required; this harness alone does not establish Stage A completion.
