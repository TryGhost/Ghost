# Builder canvas

The renderer currently implements default Ghost routing. `inspectCanvasRouting`
checks the installed YAML configuration, rather than inferring support from theme
names, scraped markup or a successful response. The supported profile has an empty
`routes` map, one `/` collection with `/{slug}/` permalinks and the default index
fallback, and the default tag/author taxonomies. Comments, mapping order and
equivalent index-template forms do not change compatibility. Custom routes,
collections, filters, ordering, templates and taxonomies remain unsupported;
this check does not implement them. Parsing accepts one YAML document, rejects
duplicate keys and unsupported tags, and bounds input to 256 KiB.

The editor reads `/settings/routes/yaml/` through the existing Admin framework
before mounting the workspace/preview. Every entry requires a fresh response;
cached configuration cannot admit the editor while that request is pending.
The entry check then pins its result and disables its query for that mounted
editor, so unrelated cache updates cannot dispose a session with retained work.
Unsupported or unavailable routing
shows an explanation and an Open site preview link instead of certifying default
rendering. The fixture worker independently checks its pinned routing snapshot
before rendering or adopting an edit/refresh. A blocked canvas issues no render
work and exposes compatibility details through probe/console diagnostics.
`canvas.html?theme=source&routing=custom` exercises the unsupported path without
adding a debug selector to the canvas. Configuration refresh ownership remains
separate editor work.

## Active-site editor

The normal Design Builder route uses `ThemeCanvasExperience` to load the active
theme archive, installed design settings, public renderer configuration and one
published Post from the current site. `SiteCanvasDriver` owns one `ThemeWorkspace`
and renderer; the canvas connects to that workspace without owning its lifetime.
React effect reconnection, iframe delivery, camera changes and unrelated query
cache updates do not create or dispose that shared source. The normal theme route
has no embedded chat, provider configuration or model-runtime dependency.

Home, Post, Page, Tag and Author each have desktop/mobile live compositions and
separate fixed-device representations. Template pairs form rows below the tallest
accepted composition. Readable screen-space headers reflow within the viewport
when fitting very tall pages, independently of live frame geometry. Group navigation
reveals a native-scale frame while a manual text draft is active. Empty sites render Home and explicitly mark each missing published context unavailable.
Page, Tag and Author frames have bounded published-content pickers; template-group
navigation keeps the wider board accessible. Native `ghost_canvas_list_preview_content`
and `ghost_canvas_select_preview_content` expose the same choices with kind, resource
ID and revision/data-generation checks. Resource selection reloads its published
record and validates every bound route before acceptance; failures retain prior
bindings, source and history. Initial discovery errors leave other groups usable
and appear on the unavailable frame; explicit picker reload can retry discovery.
Direct source-proven literal commits and atomic patches validate every bound page
before source adoption. The compact Preview Post picker discovers published content
on request with explicit bounded paging. Native `ghost_canvas_list_posts` and
`ghost_canvas_select_post` use the same discovery and selection action. Selection
reloads the published resource, validates all bound templates through the workspace mutation
lane, and changes both Post sizes together. It preserves source revision, dirty
state, checkpoints, camera, mounted frames and manual values; render-input generation
advances and old inspection handles retire. Failed or cancelled selection keeps the
accepted binding. An empty site can explicitly load later-published content. Settings
and other content observations remain session inputs; there is no background sync.

The 404 group renders a theme-authored `error-404.hbs`, `error-4xx.hbs` or
`error.hbs` in Ghost's normal precedence at both sizes. It binds a deliberately
missing two-segment URL under the configured site path. Candidate validation
requires that exact URL to return 404 with HTML content; a successful ordinary
page, redirect or plain-text error fallback rejects adoption. All ordinary bound
pages still require 200. Adding/removing error templates updates this context
within source validation, Undo/Redo and publication, without changing published
content or introducing a synthetic error document. If no authored error template
exists, the group explains that state and mounts no preview. Native editor state
reports `render.errorPreview` with the active template, URL and expected status;
existing inspection/source/patch/reveal tools address the same live error frames.

Content pickers also list root custom and slug-specific template variations from
the current accepted theme. Published `slug` and `custom_template` fields determine
eligibility using Ghost's default hierarchy: slug-specific first, assigned custom
entry template next, then Page/Post or taxonomy/index fallbacks. The picker shows
the resolved active template and the title a variation choice will preview. Empty
choices explain that the current bounded content page has no match; paging is
explicit. Dotted/Unicode root names remain valid, while paths outside the theme root
are rejected. Choosing a variation selects real eligible content; it never forces
a file onto a different route or changes publication content assignments.

Native `list_posts`/`list_preview_content` return `templates` and `activeTemplate`.
Selection accepts optional `expectedTemplate`, rereads the resource and rejects a
changed assignment before adoption. A same-ID resource whose slug/custom assignment
changed re-renders with a new input generation. Theme source/history remain intact.
These session bindings do not background-sync external content changes.

The route uses the existing theme publication review/transport and built-in-theme
copy flow. Manual Publish and native `ghost_canvas_open_publication_review` open
the same review, pinned to an explicit accepted source revision. The review lists
changed files/settings since the initial or last published baseline, the target
theme/copy and excluded pending text/settings. Summaries return at most 100 file
and setting names with totals; the compact dialog displays the first 20 of each.
Only human confirmation publishes. Source changes require renewed review; the
workspace rechecks the revision inside its mutation lane before transport and
holds that lane through publication/adoption. Pending manual work does not block
review and uses the existing text/settings retention during successful delivery.
After built-in publication, labels/state and history restores retain the new
copy's identity. Dirty source, retained manual text and an in-flight write/publication
guard navigation; initial read-only loading does not. Successful server publication
is reported as successful even if its subsequent preview refresh fails, with an
actionable reload notice. Workspace disposal belongs to route exit, which also
invalidates relevant Admin queries after server mutations.

The production preview probe uses the actual `ThemeWorkspace` identity and reports
`fixture: false`. Its registered native tools read and atomically patch the same loaded draft used
by the UI. The editor owns up to 20 in-memory source/settings checkpoints, with
compact Undo/Redo controls and native checkpoint restoration. New accepted changes
after undo discard the redo branch; identical changes add no checkpoint. Restores
check the current revision inside the workspace queue, validate every bound page
and deliver templates/assets/settings while preserving the active publication
identity. Failed restores retain accepted source, validity and history position.
History does not survive reload. The canvas retains manual text while an agent
patch or history restore replaces source. Resume reconnects the draft only when its
authored literal remains uniquely compatible; changed, removed or ambiguous targets
offer copy/cancel recovery without overwriting accepted source. Typed text remains
separate from accepted source until manually committed. If the private bridge cannot
capture the complete draft, the old live preview stays available for copying before
explicit cancellation displays the accepted theme. UI and tools share this workspace
rather than adding an independent model-owned theme draft.

The compact settings action opens writable global/custom design settings on request.
Color, font/text, boolean and choice controls use the workspace's descriptors and
visibility rules. Apply sends only changed values through the same atomic patch,
required-page validation, live delivery and checkpoint history as native tools.
Image settings remain read-only in this version. Staged form values survive dismissal,
agent replacement and viewport changes; the icon marks unapplied values. A changed
source revision requires explicit Reload before applying, preserving entered values
until that choice. Pending settings participate in the departure guard and native
`settingsDraft` metadata; publication review discloses their exclusion. They remain separate from accepted theme settings.
The narrow header retains settings and exposes Undo/Redo in its existing view menu.

`CanvasBoard` positions caller-owned live frames in world coordinates and changes
only the world container's CSS transform for pan/zoom. Frame dimensions, documents
and preview lifetimes remain the caller's responsibility. Every frame accepts
input directly; there is no opened-frame state, inert overview or permanent
pointer overlay. Single-clicking a header selects without moving the camera.
Double-click or Enter fits that frame on the board without resizing its document.
Headers stay in screen coordinates and stagger horizontally outside page content.

Drag empty board space, Space-drag or scroll to pan. Ctrl/Command-scroll zooms at the pointer.
The authenticated `canvasNavigation` bridge relays zoom, Escape and inline draft
activity. Its additional `canvasPanning` option relays ordinary wheel input from
live compositions; fixed devices retain native page scrolling. Locally scrollable
editor controls consume their own scrolling first. Existing non-canvas previews
leave these options disabled. Space arms a temporary pointer shield over the board;
pointer capture keeps deliberate drags moving across frames and board boundaries.
If a drag begins inside a frame before the shield is hittable, that runtime captures
and relays it through its current private document port. Pan gestures never select,
scroll or replace documents. Releasing Space or pressing Escape stops movement;
capture prevents a cancelled parent gesture from clicking through on pointerup.
Lost capture, focus loss, control focus and document retirement cancel ownership.
Held-key repeats cannot re-arm a cancelled gesture; release Space before starting again.
Space remains ordinary text/input inside editors, controls and dialogs. Enter
retains keyboard selection/editing. No permanent pointer overlay covers the frames.

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
receipts cannot cancel a newer edit. The shared canvas controller preserves created
drafts across source replacement and owns their recovery.
Canvas selection/admission messages carry the originating trusted input's
cross-document performance time. A newer selection fences older requests before
ownership reservation and ignores delayed selection receipts; fresh keyboard
activation remains eligible. An obsolete approval cannot strand ownership.
Selection enables a compact template-source control in the header. Source context
opens only on request, keeping board geometry and native hit targets stable
between the clicks of a double-click. The source popover closes when selection
changes or an accepted refresh replaces the document.

Each iframe load has its own navigation check. Consecutive loads cannot reuse the
accepted bridge receipt to conceal unbridged navigation. Replacement, restoration
and destruction retire old checks; expected native form navigation preserves its
existing restoration behavior. Canvas links/forms select instead of navigating.
Restoration also preserves the canvas's current interaction mode, including mode
changes since initial delivery. Initial canvas readiness waits for font loading
within the existing document timeout before bounded height measurement starts.
The authenticated load receipt remains immediate and separate from font readiness,
so slow fonts cannot masquerade as navigation or conceal a subsequent load.

Canvas selections include a `data.occurrence` handle for the exact native-hit-tested
element. `id` and `data.marker` retain source-marker compatibility; they cannot
distinguish repeated partials. Pass `{occurrence}` to the live surface's
`inspectElement` to inspect that clicked use. Handles belong to one runtime, stay
with a node when it moves within the document, and expire on detachment, document
replacement/restoration or registry eviction. The registry retains at most 1,024
selected nodes and never recycles handles. A stale handle fails explicitly;
ambiguous marker-only canvas inspection also fails rather than returning the first
card. Replacement does not restore canvas selection from a source marker. Fresh
source/occurrence restoration belongs to controller recovery work. Existing
single-preview and Artifact marker behavior is unchanged. Occurrence handles do
not mutate theme DOM or address scriptless screenshots; explicit screenshot
targets keep their separate selector/marker contract.

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
Each frame has a screen-space control for switching to its own fixed viewport;
other frames retain their presentation. A switch clears that frame's source
selection and does not transfer a draft or inspection handle. Presentation changes
are disabled while a draft is retained. Compatible drafts resume after accepted
source replacement; changed targets offer explicit text recovery.

Composition height uses the authenticated layout bridge, limited to 16
observations, 5,000ms and 16,000 CSS pixels. Live canvas document loading allows
15,000ms for theme resources/fonts. These are failure bounds, not speed targets.
Actual composition viewport dimensions
can differ from configured device dimensions: viewport-height CSS, fixed/sticky
behavior and lazy loading require separate device checks. Height caps, instability
and failures flag the affected frame's fixed-viewport control without resizing the
canvas. Screen-reader status describes the fallback. Opt-in authenticated-port notifications observe later image/font loads,
DOM/style changes and document/body resizing, including arbitrary theme attributes
that control CSS selectors. Ordered samples fence obsolete notifications; identical
attribute writes, identical DOM replacements and the runtime's own mode/tab-stop
and hover-outline changes do not restart settling. Each pass resets to the configured viewport to reveal shrinkage,
then settles within the same round/time/height limits. Changes during an expanding
pass recheck that viewport floor. These passes retain documents and the camera;
a pending admission or retained text draft defers resizing until it is released.
Preflight layout reads protect the current viewport even before the parent has
reserved a pending admission. A local edit generation change interrupts and
retries settling without marking the rendered document as failed. Interrupted
passes restore the previous settled height. After initial settling, pointer hover
or keyboard focus inside the frame defers further passes until interaction leaves;
this prevents measurement resizes from moving targets between clicks. Initial
preview readiness waits for both settling and acknowledgment of interaction mode.
An authenticated focus-loss geometry hint resumes deferred work when focus moves
directly between opaque frames, where parent focus events do not fire.
A failed or limited
pass stops automatic resizing for that delivered document and offers its fixed
viewport fallback. Accepted source replacement starts new bounded observation.
Settling alone does not establish device fidelity or full lazy-content loading.

The worker owns one `ThemeWorkspace` per fixture, including its complete asset set;
iframe delivery does not own source. `CanvasThemePreview` validates Home and Post
against one captured data generation before adoption. `applyThemePatch` stages
bounded file writes/deletions and settings together, checking the complete final
file set rather than validating intermediate template states. A Post-only failure
preserves accepted source/settings. No-op patches reuse accepted render evidence.
The harness's controlled `onApplyThemePatch` callback exercises delivery to all eight
live documents, including changed assets, without adding controls to the canvas.
It refuses work while text admission or another operation is pending, retains manual
drafts through accepted changes, invalidates reads during work and preserves
documents after a known rejection or no-op.
This callback is a development/test seam; the active-site editor exposes native
mutation tools separately. The fixture tools remain read-only.

The harness commits eligible literal text through the real fixture worker, accepting
source only after Home and Post both render successfully, then updating all eight
documents. Generated markers are separate from authored/helper attributes.
Dynamic, mixed, nested and unsupported-namespace text stays selectable with source
context instead of becoming hardcoded content. Inline image replacement is disabled
in this literal-text harness; images remain selectable without a picker or upload.
Other preview consumers retain their existing image-edit behavior. Shared literals
update every use.
One manual draft can be retained across the board, with Resume/Cancel and the same
source-replacement preservation and conflict recovery as the real editor.

Refresh content switches one recorded Post title to a controlled longer title in
both Home and Post. Restore content returns to the original recording. The worker
renders both required pages from one snapshot before adopting the refresh. Source
revision stays unchanged, while a monotonic data generation and render key advance
even when returning to the original recording. Source edits retain the current
data snapshot and require its generation. A request for the already current
snapshot returns cached output without replacing documents.

Refresh replaces all eight documents while retaining the actual iframe elements,
surface objects, board selection and camera. It clears source/occurrence selection
and invalidates addressed reads immediately, before the worker returns. Text
admission requires its current surface's readiness and completion of all eight
deliveries. Another refresh also waits until all eight deliveries either
acknowledge readiness or report failure; healthy
surfaces remain editable when another delivery fails. A retained text draft disables refresh rather than discarding
it. A known
worker rejection preserves the displayed documents and restores reads under fresh
handles. Transport loss leaves reads stale and requires reloading the local
fixture because adoption is uncertain.

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
only actionable failures and draft recovery. The read-only source context opens
from the header control on request; selection does not resize the board. Escape
returns focus to that control; dismissal by another selection preserves the new
target's focus. The context closes after selection changes or an accepted replacement.
Refresh diagnostics separately record worker acceptance latency and readiness of
the four fixed devices, four live compositions and all eight documents. Failed
deliveries remain separate from readiness and permit a subsequent refresh retry. These are
delivery observations rather than screenshot timings or performance benchmarks.

Failed native frame entries retain their cause. Composition identity/viewport
mismatches expose compact expected/observed geometry and the measurement phase;
addressed reads return the same cause in `surface_failed` details. Healthy devices
remain independently usable. Failed entries require document replacement; an older
readiness read cannot clear their cause. Geometry details belong to native diagnostics, while the
canvas displays a short failure message and its existing fallback control.

The top-level editor feature-detects `document.modelContext.registerTool` and the
older native `navigator.modelContext` location. It registers
`ghost_canvas_probe_get_editor_state`, `ghost_canvas_probe_inspect_frame`,
`ghost_canvas_probe_inspect_element` and `ghost_canvas_probe_capture_frame`, plus
`ghost_canvas_read_theme` and
`ghost_canvas_validate_theme_patch`, `ghost_canvas_apply_theme_patch`, `ghost_canvas_history`, `ghost_canvas_list_posts`,
`ghost_canvas_select_post` and `ghost_canvas_open_publication_review` on the real editor.
`ghost_canvas_reveal_frame` selects and reveals a discovered frame ID at readable
scale through the board's existing action. It moves the shared camera and clears
element context only on explicit request, retaining manual text and staged settings.
It preserves source, responsive dimensions and the frame's current presentation;
unavailable frames and stale workspace/source addresses reject without navigation.
The result acknowledges the navigation request; read state for the resulting view.
Ordinary inspection and captures continue to leave the person's view unchanged.
Registrations belong to the
owning same-origin page, once per editor, never individual sandboxed previews.
Camera and presentation changes do not register again; unsupported APIs leave
manual editing available.

Theme reads require explicit workspace/current revision and expose bounded file
list/read/literal search and supported settings. List/settings reads page via
`offset`/`limit`; oversized loaded setting metadata reports `truncatedFields`.
File reads return numbered `content`: each line starts with `N:` and a space for
source reference. Remove those labels before writing a file, and read any remaining
pages when `truncated` is true; an excerpt cannot replace the complete source.
Literal search accepts an optional exact file `path`. CSS list/read metadata identifies
generated stylesheets and authored sources that require a build. Theme builds are
unavailable; prefer a directly linked authored override stylesheet and its template
reference in one patch. Changed generated CSS loses source-map comment directives
so it cannot point to stale mappings; its authored pipeline source is not rebuilt.
Atomic patches accept write, delete or one exact text replacement per file. Missing
or ambiguous originals reject the whole patch. `ghost_canvas_validate_theme_patch`
uses the same final-candidate and required-page validation without source adoption,
live delivery or history changes. Preflight does not reserve a revision; applying
still checks current source and data generation.
Preflight explicitly reports `validationScope: source-and-required-renderer-pages`
and `runtimeReadiness: not-checked`. Its `valid` result proves source and required
renderer output, not browser resource loading or expanded-composition readiness.
The renderer does not mount browser documents. Image/font changes and expanded
geometry are observed after adoption through the existing live delivery state;
inspect both representations before concluding that a design works. A lazy image
may change a composition after its first measurement. The retained layout observer
continues bounded measurement without replacing its fixed-device counterpart.
Patches additionally require the discovered data generation and share the UI
validation/adoption/delivery action. Native writes allow at most 32 settings with
string values up to 8,192 characters. Accepted patches return the actual source
revision/render key and pending delivery; state reports busy until delivery
completes. Invalid Home/Post output, stale source and work
cancelled before adoption preserve the accepted draft. Manual text stays retained
through accepted agent changes, with explicit resume or conflict recovery. Pending
admission and other source operations still fence concurrent writes. During an
agent candidate render, the displayed accepted documents remain selectable and can
start/continue a literal draft. The short capture/replacement boundary closes
admission and retires pending requests before capturing any editor they created.
Actual text commits serialize with source changes; rejected candidates preserve the
current selection/draft and accepted delivery retires obsolete element context.
A single canvas click on another source element selects it while retaining the active
text editor. Cancellation after
adoption does not misreport the actual outcome. Route exit retires callbacks.
There is no evaluation/shell tool, independent agent draft or publication bypass.

`ghost_canvas_history` lists bounded checkpoint metadata or restores an explicit
checkpoint at the current source revision/data generation through the same action
as Undo/Redo. It returns no snapshot payload or renderer credentials. Rediscover
frame readiness after acceptance before inspecting the restored output. Restoration
after built-in-theme publication retains the custom copy's identity; it changes the
editor draft and requires publication before customers see it.

Protocols `canvas-fixture-probe-3` (fixtures) and `canvas-editor-probe-1` (the real
workspace) address explicit immutable live workspace/frame/representation handles,
expected source revision and expected render key. Each frame has separate expanded
and fixed-device entries. State identifies an element selection's originating
representation/render/document and exposes its explicit `target` address.
`ghost_canvas_probe_inspect_element` takes that address plus the selected occurrence;
it inspects the clicked use through the existing surface without changing selection,
scroll, focus or camera. A prepared read stays addressed when the person selects
another frame. Occurrences cannot transfer between representations or counterparts.
Ordinary board selection clears obsolete element/source context while retaining text.
Page inspection can read either representation; responsive captures require a fixed
device target. Same-source data refresh retires old evidence; the source revision
alone cannot certify a current data snapshot. It never uses
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
prove native Codex discovery or model-visible image delivery. Real-route Chromium
acceptance tests exercise Admin embedding, native discovery, source reads, atomic
patches and addressed desktop/mobile captures against a fake API. Run that native
journey with `VITE_CANVAS_NATIVE_WEBMCP=1 pnpm --filter @tryghost/admin
test:acceptance src/builder/builder.acceptance.test.tsx -t "drives the real editor
through native WebMCP" --maxWorkers=1`; the browser config enables experimental
WebMCP for this explicit lane. This proves native browser execution, not external
Codex discovery in the built-in WebView or model-visible image consumption. The user has separately verified local desktop Codex discovery and shared-editor
WebMCP usage. This acceptance remains browser-level evidence rather than a claim
about the host's image-delivery format.

The real-site journey in `e2e/tests/admin/theme-canvas.test.ts` exercises installed
Source/Casper themes with real Home/Post/Page/Tag/Author contexts, uploaded
cover/Post/Tag imagery, a shared template design change, continued manual text during candidate rendering, Post switching, settings,
history and human-confirmed publication. It retains pending unpublished text and the
new theme-copy identity after Undo. Native captures record their omission warnings;
separate screenshots of live desktop/mobile devices show actual browser pixels.
These are local native Chromium and browser observations, not external Codex proof.
