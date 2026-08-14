/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode UI bar, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * Edit-mode session — the orchestrator behind the chunk's mount() contract.
 *
 * Boot: fetch the active theme name → download + extract its zip → scrape
 * instance config off the live document → boot the renderer (worker-first,
 * main-thread fallback) → render the current route with {markers: true} →
 * swap the live document in place → wire click-to-edit. The theme zip is
 * re-downloaded on EVERY entry into edit mode — accepted cost for this slice
 * (theme zips are small and the download doubles as the freshness source for
 * the draft key and the publish-time lost-update check).
 *
 * Edit loop: click a [data-edit] element → parse its marker → the element
 * itself becomes contentEditable (in-place editing; Enter or the floating
 * panel's Save commits, Escape cancels and restores the element) →
 * applyThemeTextEdit (anchor-verified) on a CANDIDATE theme → setTheme +
 * re-render the candidate → only when that whole pipeline succeeds does the
 * session commit (snapshot/editCount/draft store) and keep the candidate; any
 * failure restores the element, re-points the renderer at the last-good theme
 * and surfaces the error without counting the edit. Clicking another element
 * while an inline edit is open COMMITS the pending edit (never silently
 * discards it).
 *
 * Image swap (slice 5): a click on a marked <img> opens the Replace-image
 * panel instead of the text editor (an <img> is void — it has no text child).
 * Replace image → file picker → POST /images/upload/ → applyThemeAttributeEdit
 * swaps src to the returned URL and DELETES srcset/sizes (deleting an absent
 * attribute is a no-op, so both are cleared unconditionally — a stale srcset
 * would keep showing the old responsive candidates). The candidate then runs
 * through the exact same commit pipeline as text edits (render-verify before
 * count); an upload failure or applier rejection surfaces without dirtying.
 *
 * Publish: two-step confirm in the bar (first click arms, second publishes) →
 * lost-update check (re-download the server's copy and compare its content
 * hash against the boot-time base — on mismatch the publish aborts; there is
 * deliberately NO force/overwrite option in this slice) → packThemeArchive
 * (rootPrefix preserved; the zip FILENAME must be `<themeName>.zip` — it
 * determines the installed name) → POST /themes/upload/ → surface 422s
 * readably (gscan reports and server ValidationErrors are labelled
 * differently). Default themes (casper/source) cannot be overwritten: the
 * session prompts for a new theme name, uploads under that name with
 * `?copy_settings_from=<activeTheme>` (custom settings carry over) and then
 * activates the copy. After a successful publish the just-published snapshot
 * IS the new base: the draft key is recomputed from it and the old entry
 * cleared, so post-publish edits survive exit/re-enter.
 *
 * Chat agent (slice 5): the bar's chat drawer feeds natural-language requests
 * into runAgentTask — a browser-side, BYOK-keyed tool-calling loop
 * (agent/loop.js) whose tools are session-scoped closures over the SAME
 * commit pipeline: edits accumulate on a candidate theme, preview()
 * render-verifies without committing (a failure returns the error text to
 * the model for self-correction), commit() lands the batch through
 * commitCandidate as ONE logical edit. The agent can never publish — that
 * stays the bar's explicit human flow — and its tools never touch the Admin
 * API. While a task runs, HUMAN edit surfaces (click-to-edit, commit,
 * image swap, publish) are refused with a visible status: one writer at a
 * time, so neither side clobbers the other's uncommitted work. The provider
 * seam (agent/provider.js, OpenAI-first) and key store (agent/key-store.js,
 * sessionStorage BYOK) are both injectable deps.
 *
 * Exit restores the original pre-swap document and reports through onExit so
 * the toolbar shell can reset (a fatal boot failure exits the same way).
 */
import {ROOT_ID} from '../constants';
import {parseEditMarker} from '@tryghost/theme-renderer/markers';
import {applyThemeAttributeEdits, applyThemeTextEdit} from '@tryghost/theme-renderer/editor';
import {extractThemeArchive, isDefaultThemeName, packThemeArchive} from '@tryghost/theme-renderer/editor/archive';
import {scrapeContentApiKey, scrapeInstanceConfig} from '@tryghost/theme-renderer/editor/instance-config';
import {buildSystemPrompt, runAgentLoop} from './agent/loop';
import {createDocumentSwapper} from './swap';
import {createEditModeUi, OVERLAY_HOST_ID} from './ui';
import {createKeyStore} from './agent/key-store';
import {createOpenAiProvider} from './agent/provider';
import {attachEditInteractions} from './interactions';
import {createMemoryDraftStore, computeThemeContentHash, draftKey} from './draft-store';
import {startRenderClient, resolveWorkerUrl} from './render-client';
import {
    activateTheme,
    downloadThemeArchive,
    fetchActiveThemeName,
    uploadImage,
    uploadThemeArchive,
    ThemeUploadError
} from './theme-api';

/**
 * Default file-picker seam: a hidden `<input type="file" accept="image/*">`
 * clicked programmatically. Resolves the picked File, or null on cancel
 * (the `cancel` event fires in every modern browser; if it ever doesn't,
 * the input is orphaned but invisible and removed with the document swap).
 *
 * @param {Document} doc
 * @returns {Promise<File|null>}
 */
export function pickImageFile(doc) {
    return new Promise((resolve) => {
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        const finish = (file) => {
            input.remove();
            resolve(file);
        };

        input.addEventListener('change', () => finish(input.files?.[0] ?? null), {once: true});
        input.addEventListener('cancel', () => finish(null), {once: true});

        doc.body.appendChild(input);
        input.click();
    });
}

/**
 * The site root the renderer should treat as `siteUrl`: the admin URL minus
 * its trailing `ghost/` segment. Same-origin is already guaranteed by the
 * loader (canShowEditMode), so this preserves any subdirectory install
 * (`https://site.com/blog/ghost/` → `https://site.com/blog/`).
 */
export function deriveSiteUrl(adminUrl) {
    return adminUrl.endsWith('ghost/') ? adminUrl.slice(0, -'ghost/'.length) : adminUrl;
}

/**
 * ThemeFiles for the renderer: the text sources the compile pipeline reads
 * (.hbs templates/partials + .json for package.json/locales). CSS/JS assets
 * stay in the snapshot for publish but are served by the live site, not the
 * renderer.
 */
export function buildRenderTheme(snapshot) {
    const files = {};

    for (const [path, file] of Object.entries(snapshot.files)) {
        if (file.content !== null && /\.(hbs|json)$/.test(path)) {
            files[path] = file.content;
        }
    }

    return files;
}

function toRect(element) {
    const rect = element.getBoundingClientRect();
    return {top: rect.top, left: rect.left, width: rect.width, height: rect.height};
}

/**
 * The initial value offered in the inline editor: the element's rendered
 * text, collapsed to one line (the applier rejects newlines by contract).
 */
export function initialEditValue(element) {
    return (element.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * The Content API key from config, ignoring junk values: a helper that
 * stringifies a missing key ends up sending the LITERAL 'null' (the
 * ghost_head fix drops the attribute instead, but old cached pages linger).
 */
export function sanitizeContentApiKey(rawKey) {
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (!key || key === 'null' || key === 'undefined') {
        return null;
    }

    return key;
}

/**
 * Save-as name validation for the default-theme publish path. Mirrors what
 * the server will accept as a zip filename: non-empty, lowercase, no spaces,
 * and not one of the protected default theme names.
 *
 * @returns {string|null} a user-readable rejection, or null when valid
 */
export function validateNewThemeName(name) {
    const trimmed = (name ?? '').trim();

    if (!trimmed) {
        return 'Theme name cannot be empty.';
    }
    if (/\s/.test(trimmed)) {
        return 'Theme name cannot contain spaces.';
    }
    if (trimmed !== trimmed.toLowerCase()) {
        return 'Theme name must be lowercase.';
    }
    if (isDefaultThemeName(trimmed)) {
        return `"${trimmed}" is a default theme name — pick a different one.`;
    }

    return null;
}

/**
 * sessionStorage off a window, tolerating access throws (private modes).
 * sessionStorage (not localStorage) is the BYOK key's home on purpose: it is
 * still readable by any script on the site's origin, but it does not PERSIST
 * — the key is gone when the tab closes (see agent/key-store.js).
 */
function safeSessionStorage(win) {
    try {
        return win.sessionStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * True when the marked element at `position` sits inside a `<picture>`
 * element in the ORIGINAL theme source. Swapping such an img's src is honest
 * but incomplete — sibling `<source srcset>` tags keep serving the old image
 * on matching screens — so the session warns while still committing.
 * Heuristic scan (not the full source scanner): the nearest `<picture` before
 * the position whose `</picture` has not closed yet.
 */
export function isInsidePicture(source, {line, column}) {
    const lines = source.split('\n');
    if (line < 1 || line > lines.length || column < 1) {
        return false;
    }
    let offset = 0;
    for (let i = 0; i < line - 1; i += 1) {
        offset += lines[i].length + 1;
    }
    offset += column - 1;

    const lower = source.toLowerCase();
    const open = lower.lastIndexOf('<picture', offset);
    if (open === -1) {
        return false;
    }
    const close = lower.indexOf('</picture', open);
    return close === -1 || close > offset;
}

/**
 * Parse-validates .json theme files (package.json, locales) before they are
 * staged/committed — the renderer only re-reads some of them lazily, so a
 * broken JSON file could otherwise pass render-verify and only explode at
 * publish (or on the live site).
 *
 * @returns {string|null} a readable rejection, or null when fine (non-.json
 *   paths are always fine)
 */
export function validateJsonFile(path, content) {
    if (!/\.json$/.test(path)) {
        return null;
    }
    try {
        JSON.parse(content);
        return null;
    } catch (error) {
        return `"${path}" is not valid JSON after this edit: ${error.message}`;
    }
}

/**
 * The changed-files fragment of the publish arm message: every path this
 * session has committed (human + agent), alphabetical, capped for the bar.
 */
export function formatChangedFiles(paths, {max = 5} = {}) {
    const sorted = [...paths].sort();
    const shown = sorted.slice(0, max);
    const more = sorted.length - shown.length;
    return shown.join(', ') + (more > 0 ? ` (+${more} more)` : '');
}

// Module-level so drafts survive exit/re-enter within one page view — the
// in-memory store's documented lifetime. Server-backed persistence replaces
// this singleton via the DraftStore seam.
const sessionDraftStore = createMemoryDraftStore();

/**
 * Total-edit-size sanity cap per agent task: the sum of old_string +
 * new_string lengths across accepted edit_theme_file calls. Generous for
 * theme tweaks, small enough that a runaway model can't balloon the
 * in-memory draft (or the eventual publish zip) unnoticed.
 */
export const MAX_AGENT_EDIT_CHARS = 200000;

/**
 * @param {Object} options
 * @param {Object} options.config — toolbar config (adminUrl, key, scriptUrl, …)
 * @param {(info?: {reason: string, message?: string}) => void} [options.onExit]
 *   — invoked exactly once, after cleanup, whenever the session ends: the
 *   user's Exit, an unmount from the shell, or a fatal boot failure
 *   (`{reason: 'boot_failure'}`). Lets the loader/toolbar reset so edit mode
 *   can be re-entered with a fresh session.
 * @param {Object} [options.deps] — test seams; every external effect is injectable
 * @returns {{start(): Promise<void>, destroy(): void}}
 */
export function createEditSession({config, onExit, deps = {}}) {
    const {
        doc = document,
        win = window,
        fetchImpl = (...args) => fetch(...args),
        draftStore = sessionDraftStore,
        promptFn = (message, defaultValue) => win.prompt(message, defaultValue),
        pickFile = () => pickImageFile(doc),
        startClient = startRenderClient,
        uiFactory = createEditModeUi,
        attachInteractions = attachEditInteractions,
        keyStore = createKeyStore({storage: safeSessionStorage(win)}),
        providerFactory = createOpenAiProvider,
        agentLoop = runAgentLoop
    } = deps;

    const adminUrl = config.adminUrl;
    const siteUrl = deriveSiteUrl(adminUrl);

    let ui = null;
    let client = null;
    let swapper = null;
    let interactions = null;
    let destroyed = false;

    let themeName = null;
    let snapshot = null;
    let renderTheme = null;
    let lastRenderedTheme = null; // exact theme object the renderer last rendered OK
    let baseHash = null; // content hash of the base the session booted from (or last published)
    let storeKey = null;
    let editCount = 0;
    let changedFiles = new Set(); // cumulative committed paths since the base (human + agent)
    let activeEdit = null; // {element, marker, initialValue, originalHtml, keyHandler}
    let activeImageEdit = null; // {element, marker}
    let replacingImage = false;
    let publishArmed = false;
    let publishing = false;
    let agentRunning = false;
    let chat = {
        open: false,
        busy: false,
        hasKey: Boolean(keyStore.getKey()),
        messages: [],
        resultText: null
    };

    async function renderAndSwap() {
        const result = await client.render(win.location.href, {markers: true});

        // destroy() may have run while the render was in flight — swapping
        // now would leave the page stuck on the preview after exit
        if (destroyed) {
            return;
        }

        swapper.swap(result.html);

        if (result.status !== 200) {
            ui.update({statusText: `Preview rendered with status ${result.status}`, statusIsError: true});
        }
    }

    /**
     * Makes the clicked element itself editable (in-place editing — no input
     * box): `contenteditable="plaintext-only"` where supported so typing and
     * pastes stay plain text, falling back to `"true"` (the commit flattens
     * to textContent either way, matching the applier's plain-text contract).
     * Enter commits, Escape cancels; both are also on the floating panel.
     */
    function beginInlineEdit(element, marker) {
        const keyHandler = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                commitEdit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeEditor();
            }
        };

        activeEdit = {
            element,
            marker,
            initialValue: initialEditValue(element),
            originalHtml: element.innerHTML,
            keyHandler
        };

        element.setAttribute('contenteditable', 'plaintext-only');
        if (!element.isContentEditable) {
            element.setAttribute('contenteditable', 'true');
        }
        element.addEventListener('keydown', keyHandler);
        element.focus();

        try {
            // Select the text (the old input-box behavior): a replacement is
            // one keystroke, a tweak is one click.
            const selection = win.getSelection();
            const range = doc.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch {
            // selection is a nicety — environments without Range support
            // still get a focused editable element
        }
    }

    /**
     * Ends the in-place edit: detaches the key handler, drops
     * contenteditable, and restores the element's pre-edit DOM. The restore
     * keeps the preview in sync with the draft in every non-success path
     * (cancel, applier rejection, failed render); on a successful commit the
     * whole document is re-swapped from the re-render right after, so the
     * momentary restore is invisible.
     */
    function endInlineEdit() {
        if (!activeEdit) {
            return;
        }
        const {element, originalHtml, keyHandler} = activeEdit;
        element.removeEventListener('keydown', keyHandler);
        element.removeAttribute('contenteditable');
        if (element.innerHTML !== originalHtml) {
            element.innerHTML = originalHtml;
        }
    }

    function closeEditor(patch = {}) {
        endInlineEdit();
        activeEdit = null;
        activeImageEdit = null;
        ui.update({editor: null, imageEditor: null, highlight: null, ...patch});
    }

    function disarmPublish(patch = {}) {
        if (publishArmed) {
            publishArmed = false;
            ui.update({publishArmed: false, ...patch});
        }
    }

    /**
     * The render-verify half of the pipeline, shared by commitCandidate and
     * the agent's preview() tool: point the renderer at the candidate and
     * re-render/swap. On failure the renderer is re-pointed at the last-good
     * theme so the next attempt starts from a working state; the error is
     * RETURNED (not thrown) so both callers can route it — the UI status
     * line, or the model's tool result.
     *
     * @returns {Promise<{ok: true}|{ok: false, error: string}>}
     */
    async function renderCandidate(candidateTheme) {
        try {
            await client.setTheme(candidateTheme);
            await renderAndSwap();
        } catch (error) {
            lastRenderedTheme = null;
            if (destroyed) {
                return {ok: false, error: 'The edit session has ended'};
            }
            // Revert the renderer to the last-good theme; the failed
            // candidate is the caller's to drop or fix.
            try {
                await client.setTheme(renderTheme);
            } catch {
                // the revert is best-effort — the original error is the story
            }
            return {ok: false, error: error.message};
        }

        if (destroyed) {
            return {ok: false, error: 'The edit session has ended'};
        }

        lastRenderedTheme = candidateTheme;
        return {ok: true};
    }

    /**
     * The shared commit pipeline behind every applier (text edits, image
     * swaps, and the agent's commit() tool): render-verify the candidate,
     * and only when the whole pipeline succeeds mutate session state
     * (snapshot/editCount/draft store). Any failure re-points the renderer
     * at the last-good theme and surfaces the error without counting the
     * edit. One call counts as ONE edit in the dirty count regardless of how
     * many files changed (`changedPaths`) — an agent batch is one logical
     * edit, exactly like one inline text edit.
     *
     * @returns {Promise<{ok: true}|{ok: false, error: string}>}
     */
    async function commitCandidate(candidateTheme, changedPaths) {
        // .json files bypass most of render-verify (the renderer reads some
        // of them lazily) — parse-validate them before anything is staged.
        for (const path of changedPaths) {
            const jsonError = validateJsonFile(path, candidateTheme[path]);
            if (jsonError) {
                closeEditor({status: 'ready', statusText: `Edit failed: ${jsonError}`, statusIsError: true});
                return {ok: false, error: jsonError};
            }
        }

        closeEditor({status: 'loading', statusText: 'Rendering…', statusIsError: false});
        disarmPublish();

        // The agent's commit() usually follows a successful preview() of the
        // EXACT same candidate object — that render already verified it and
        // is showing it; re-rendering would be a wasted double render.
        const rendered = candidateTheme === lastRenderedTheme
            ? {ok: true}
            : await renderCandidate(candidateTheme);

        if (!rendered.ok) {
            if (!destroyed) {
                ui.update({status: 'ready', statusText: `Edit failed: ${rendered.error}`, statusIsError: true});
            }
            return rendered;
        }

        // Success — NOW mutate session state.
        renderTheme = candidateTheme;
        for (const path of changedPaths) {
            if (snapshot.files[path]) {
                snapshot.files[path].content = candidateTheme[path];
            }
            changedFiles.add(path);
        }
        editCount += 1;
        await draftStore.set(storeKey, {files: renderTheme, editCount});

        if (destroyed) {
            return {ok: false, error: 'The edit session has ended'};
        }
        ui.update({status: 'ready', statusText: '', dirtyCount: editCount, statusIsError: false});
        return {ok: true};
    }

    /**
     * Human edit surfaces are refused while an agent task runs: the task's
     * candidate accumulates against a renderTheme it read at start, so a
     * concurrent human commit would be silently clobbered by the task's next
     * commit (and vice versa). One writer at a time; the refusal is visible.
     *
     * @returns {boolean} true when the caller must bail out
     */
    function refusedWhileAgentRunning() {
        if (!agentRunning) {
            return false;
        }
        ui.update({statusText: 'A chat agent task is running — wait for it to finish before editing or publishing.', statusIsError: true});
        return true;
    }

    async function commitEdit() {
        if (!activeEdit) {
            return;
        }
        if (refusedWhileAgentRunning()) {
            return;
        }

        const {element, marker, initialValue} = activeEdit;
        // The element IS the editor — the new text is whatever the user left
        // in it, collapsed to one line (the applier rejects newlines).
        const newText = initialEditValue(element);

        // An untouched commit (click-away without typing, Enter on the
        // unchanged value) is a close, not an edit.
        if (newText === initialValue) {
            closeEditor();
            return;
        }

        // Ordering: the candidate theme is only committed to session state
        // AFTER it has compiled and rendered. The applier's own rejections
        // ({{ injection, newlines, stale markers) land in the catch below.
        let candidateTheme;
        try {
            candidateTheme = applyThemeTextEdit(renderTheme, marker, newText, {tagName: element.tagName});
        } catch (error) {
            closeEditor({statusText: `Could not apply the edit: ${error.message}`, statusIsError: true});
            return;
        }

        await commitCandidate(candidateTheme, [marker.file]);
    }

    async function replaceImage() {
        if (!activeImageEdit || replacingImage) {
            return;
        }
        if (refusedWhileAgentRunning()) {
            return;
        }
        replacingImage = true;

        try {
            const {element, marker} = activeImageEdit;

            const file = await pickFile();
            if (destroyed || !file) {
                return; // cancelled — the panel stays open for another try
            }

            ui.update({status: 'loading', statusText: 'Uploading image…', statusIsError: false});
            disarmPublish();

            let imageUrl;
            try {
                ({url: imageUrl} = await uploadImage(file, {adminUrl, fetchImpl}));
            } catch (error) {
                if (destroyed) {
                    return;
                }
                // Nothing was applied — the panel closes, the error shows,
                // and the dirty count is untouched.
                closeEditor({status: 'ready', statusText: error.message, statusIsError: true});
                return;
            }

            if (destroyed) {
                return;
            }

            // The swap, as ONE batch on the anchored tag: src → uploaded URL
            // (required); srcset/sizes DELETED (a no-op when absent, so both
            // are cleared unconditionally — a stale srcset would keep serving
            // the old responsive candidates). The deletes are `optional`: if
            // one sits inside a handlebars block on the tag (editing one
            // branch of a conditional is refused), the successful src swap is
            // KEPT and a warning shows instead of discarding the upload.
            let candidateTheme;
            let skippedEdits;
            try {
                ({theme: candidateTheme, skipped: skippedEdits} = applyThemeAttributeEdits(renderTheme, marker, [
                    {name: 'src', value: imageUrl},
                    {name: 'srcset', value: null, optional: true},
                    {name: 'sizes', value: null, optional: true}
                ], {tagName: element.tagName}));
            } catch (error) {
                closeEditor({status: 'ready', statusText: `Could not apply the image swap: ${error.message}`, statusIsError: true});
                return;
            }

            const warnings = [];
            if (isInsidePicture(renderTheme[marker.file] ?? '', marker)) {
                warnings.push('this image is inside a <picture> element — the theme may still show the old image on some screens');
            }
            if (skippedEdits.length > 0) {
                const names = skippedEdits.map(skippedEdit => skippedEdit.name).join('/');
                warnings.push(`${names} could not be cleared (inside a handlebars block on the tag) — the theme may still show the old image on some screens`);
            }

            const committed = await commitCandidate(candidateTheme, [marker.file]);
            if (committed.ok && warnings.length > 0 && !destroyed) {
                ui.update({statusText: `Image replaced, but: ${warnings.join('; ')}`, statusIsError: false});
            }
        } finally {
            replacingImage = false;
        }
    }

    async function publish() {
        if (editCount === 0 || publishing) {
            return;
        }
        if (refusedWhileAgentRunning()) {
            return;
        }

        // Two-step confirm inside the bar: first click arms, second commits.
        // The arm step lists WHICH files the publish will overwrite —
        // cumulative committed paths, human and agent alike. (No per-file
        // diff in this slice; that follow-up is recorded in the README.)
        if (!publishArmed) {
            publishArmed = true;
            const fileList = changedFiles.size > 0 ? ` — changed files: ${formatChangedFiles(changedFiles)}` : '';
            ui.update({
                publishArmed: true,
                statusText: `Publishing overwrites "${themeName}" for all visitors${fileList} — click "Confirm publish" to continue.`,
                statusIsError: false
            });
            return;
        }

        publishArmed = false;
        publishing = true;
        ui.update({publishArmed: false, status: 'publishing', statusText: '', statusIsError: false});

        try {
            // Lost-update check: the base this session booted from must still
            // be what the server serves. No force option in this slice — the
            // user exits, re-enters (drafts survive keyed by base) and
            // re-applies against the fresh base.
            const serverArchive = await downloadThemeArchive(adminUrl, themeName, fetchImpl);
            if (destroyed) {
                return;
            }
            const serverSnapshot = await extractThemeArchive(serverArchive);
            const serverHash = computeThemeContentHash(buildRenderTheme(serverSnapshot));

            if (serverHash !== baseHash) {
                ui.update({
                    status: 'ready',
                    statusText: 'Not published — the theme changed on the server since you started editing. Exit and re-enter edit mode to load the latest version.',
                    statusIsError: true
                });
                return;
            }

            // Default themes cannot be overwritten (the server rejects
            // casper.zip/source.zip) — publish as a copy under a new name,
            // carrying the active theme's custom settings over, then activate.
            let uploadName = themeName;
            let copySettingsFrom;

            if (isDefaultThemeName(themeName)) {
                const entered = promptFn(
                    `"${themeName}" is a default theme and cannot be overwritten.\n\n` +
                    'Enter a name to publish your edited copy as (lowercase, no spaces):',
                    `${themeName}-edited`
                );

                if (entered === null) {
                    ui.update({status: 'ready', statusText: 'Publish cancelled.', statusIsError: false});
                    return;
                }

                const nameError = validateNewThemeName(entered);
                if (nameError) {
                    ui.update({status: 'ready', statusText: `Not published — ${nameError}`, statusIsError: true});
                    return;
                }

                uploadName = entered.trim();
                copySettingsFrom = themeName;
            }

            const blob = await packThemeArchive(snapshot);
            const uploadedTheme = await uploadThemeArchive(adminUrl, {themeName: uploadName, blob, copySettingsFrom}, fetchImpl);
            if (destroyed) {
                return;
            }

            if (copySettingsFrom) {
                // Uploading under a NEW name installs but does not activate.
                await activateTheme(adminUrl, uploadedTheme.name, fetchImpl);
                if (destroyed) {
                    return;
                }
            }

            // The just-published snapshot IS the new base: re-key the draft
            // store against it so post-publish edits survive exit/re-enter,
            // and clear the (now published) old draft.
            const previousKey = storeKey;
            themeName = uploadedTheme.name;
            baseHash = computeThemeContentHash(buildRenderTheme(snapshot));
            storeKey = draftKey({siteUrl, themeName, baseHash});
            editCount = 0;
            changedFiles = new Set(); // the published snapshot IS the new base
            await draftStore.clear(previousKey);

            if (destroyed) {
                return;
            }
            ui.update({
                status: 'ready',
                themeName,
                dirtyCount: 0,
                statusText: `Published — "${uploadedTheme.name}" is live.`,
                statusIsError: false
            });
        } catch (error) {
            if (destroyed) {
                return;
            }
            ui.update({
                status: 'ready',
                statusText: error instanceof ThemeUploadError ? error.message : `Publish failed: ${error.message}`,
                statusIsError: true
            });
        } finally {
            publishing = false;
        }
    }

    function updateChat(patch) {
        chat = {...chat, ...patch};
        ui.update({chat});
    }

    function pushChatMessage(role, text) {
        updateChat({messages: [...chat.messages, {role, text}]});
    }

    function toggleChat() {
        updateChat({open: !chat.open, hasKey: Boolean(keyStore.getKey())});
    }

    function saveApiKey(value) {
        try {
            keyStore.setKey(value);
        } catch (error) {
            pushChatMessage('error', error.message);
            return;
        }
        updateChat({hasKey: true});
    }

    function clearApiKey() {
        keyStore.clearKey();
        updateChat({hasKey: false});
    }

    function saveModel(value) {
        // Empty clears back to the provider default; runAgentTask reads the
        // stored model on every task, so this takes effect immediately.
        keyStore.setModel(value);
    }

    /**
     * Slice-5 chat agent entry point: run one natural-language task through
     * the browser-side tool-calling loop (agent/loop.js), with tools that
     * are closures over THIS session's state and pipeline:
     *
     * - list/read/edit operate on a candidate copy of the current draft
     *   theme (edit = exact-unique-match string replace, capped by
     *   MAX_AGENT_EDIT_CHARS per task);
     * - preview() render-verifies the candidate via renderCandidate without
     *   committing (a failure hands the render error back to the model);
     * - commit() lands ALL staged edits through commitCandidate as ONE
     *   logical edit batch (one dirty-count increment, draft store updated).
     *
     * Safety: the toolkit has no publish tool and never calls the Admin API;
     * uncommitted staged edits die with the task (a lingering preview is
     * re-pointed at the committed draft). Provider-level failures (network,
     * bad key) end the task and surface in the chat; tool-level failures are
     * fed back to the model for self-correction.
     *
     * @param {string} prompt
     * @param {{onProgress?: (event: {type: string, text: string}) => void}} [taskOptions]
     * @returns {Promise<{status: string, text: string|null, error?: string, commits: number, filesChanged: string[], resultText?: string}>}
     */
    async function runAgentTask(prompt, {onProgress} = {}) {
        const request = (prompt ?? '').trim();

        // Every refusal is VISIBLE: an error line lands in the chat
        // transcript, and `refused: true` tells the UI the prompt never ran
        // (so the drawer keeps/restores the typed input).
        const refuse = (error) => {
            if (ui && !destroyed) {
                pushChatMessage('error', error);
            }
            return {status: 'error', error, refused: true, commits: 0, filesChanged: []};
        };

        if (!request) {
            return refuse('Empty prompt');
        }
        if (agentRunning) {
            return refuse('A chat task is already running');
        }
        if (publishing) {
            return refuse('Publishing is in progress — wait for it to finish');
        }
        if (!client || !renderTheme) {
            return refuse('Edit mode is still starting — try again in a moment');
        }

        const apiKey = keyStore.getKey();
        if (!apiKey) {
            updateChat({open: true, hasKey: false});
            return refuse('No API key set');
        }

        // Boundary: a pending inline edit must not survive into the task —
        // the gate (refusedWhileAgentRunning) blocks new human edits while
        // the task runs, and the pending one is COMMITTED first (never
        // silently discarded), exactly like clicking another element.
        if (activeEdit) {
            await commitEdit();
        }
        if (activeEdit || activeImageEdit) {
            closeEditor();
        }

        agentRunning = true;
        disarmPublish();
        pushChatMessage('user', request);
        updateChat({busy: true, resultText: null});

        // Candidate accumulation state for this task. Edits stage on a copy
        // of the last-committed draft; nothing touches session state (dirty
        // count, snapshot, draft store) until the commit tool runs the
        // shared pipeline.
        let candidate = {...renderTheme};
        let changedPaths = new Set();
        let totalEditChars = 0;
        let commitCount = 0;
        const committedPaths = new Set();
        let previewIsShowingCandidate = false;

        const toolkit = {
            listThemeFiles() {
                const lines = Object.entries(candidate)
                    .map(([path, content]) => `${path} (${content.length} chars)`);
                return {ok: true, output: lines.join('\n')};
            },
            readThemeFile({path}) {
                const content = candidate[path];
                if (typeof content !== 'string') {
                    return {ok: false, output: `Error: "${path}" is not an editable text file of this theme — call list_theme_files for the editable set.`};
                }
                return {ok: true, output: content};
            },
            editThemeFile({path, old_string: oldString, new_string: newString}) {
                const content = candidate[path];
                if (typeof content !== 'string') {
                    return {ok: false, output: `Error: "${path}" is not an editable text file of this theme — call list_theme_files for the editable set.`};
                }
                if (typeof oldString !== 'string' || typeof newString !== 'string') {
                    return {ok: false, output: 'Error: old_string and new_string must both be strings.'};
                }
                if (oldString.length === 0) {
                    return {ok: false, output: 'Error: old_string cannot be empty.'};
                }
                if (oldString === newString) {
                    return {ok: false, output: 'Error: old_string and new_string are identical — nothing to change.'};
                }
                if (totalEditChars + oldString.length + newString.length > MAX_AGENT_EDIT_CHARS) {
                    return {ok: false, output: `Error: this task's total edit size cap (${MAX_AGENT_EDIT_CHARS} characters) would be exceeded — make smaller, targeted edits.`};
                }

                const first = content.indexOf(oldString);
                if (first === -1) {
                    return {ok: false, output: `Error: old_string was not found in "${path}" — read the file again; the current draft may differ from what you expect.`};
                }
                if (content.indexOf(oldString, first + oldString.length) !== -1) {
                    return {ok: false, output: `Error: old_string matches more than one place in "${path}" — include more surrounding context so it matches exactly once.`};
                }

                // Splice at the found offset — String.replace would interpret
                // `$&`/`` $` ``/`$'` patterns in new_string instead of
                // inserting it verbatim.
                const edited = content.slice(0, first) + newString + content.slice(first + oldString.length);

                const jsonError = validateJsonFile(path, edited);
                if (jsonError) {
                    return {ok: false, output: `Error: ${jsonError}`};
                }

                candidate = {...candidate, [path]: edited};
                changedPaths.add(path);
                totalEditChars += oldString.length + newString.length;
                return {ok: true, output: `Staged an edit to ${path}. Call preview() to render-verify, then commit().`};
            },
            async preview() {
                const result = await renderCandidate(candidate);
                if (!result.ok) {
                    previewIsShowingCandidate = false;
                    return {ok: false, output: `Error: the staged draft failed to render: ${result.error}`};
                }
                previewIsShowingCandidate = changedPaths.size > 0;
                return {ok: true, output: `Preview rendered OK (${changedPaths.size} staged file(s)). Not committed yet.`};
            },
            async commit({summary} = {}) {
                if (changedPaths.size === 0) {
                    return {ok: false, output: 'Error: nothing to commit — stage edits with edit_theme_file first.'};
                }

                const result = await commitCandidate(candidate, [...changedPaths]);
                if (!result.ok) {
                    return {ok: false, output: `Error: commit failed — the draft did not render: ${result.error}`};
                }

                commitCount += 1;
                for (const path of changedPaths) {
                    committedPaths.add(path);
                }
                const committedCount = changedPaths.size;
                changedPaths = new Set();
                previewIsShowingCandidate = false;
                candidate = {...renderTheme};
                return {ok: true, output: `Committed ${committedCount} file(s) as one draft edit${summary ? ` — ${summary}` : ''}. Rendered OK.`};
            }
        };

        const progress = (event) => {
            onProgress?.(event);
            if (event.type === 'tool' && !destroyed) {
                pushChatMessage('progress', event.text);
            }
        };

        let outcome;
        try {
            const provider = providerFactory({
                apiKey,
                model: keyStore.getModel() ?? undefined,
                fetchImpl
            });
            outcome = await agentLoop({
                provider,
                prompt: request,
                toolkit,
                systemPrompt: buildSystemPrompt({themeName}),
                onProgress: progress,
                shouldAbort: () => destroyed
            });
        } catch (error) {
            outcome = {status: 'error', text: null, error: error.message};
        }

        // A preview left showing uncommitted staged edits must not outlive
        // the task — re-point the renderer at the committed draft.
        if (!destroyed && previewIsShowingCandidate) {
            try {
                await client.setTheme(renderTheme);
                await renderAndSwap();
                lastRenderedTheme = renderTheme;
            } catch {
                // best-effort — the committed draft is unchanged either way
            }
        }

        let resultText;
        if (commitCount > 0) {
            const fileCount = committedPaths.size;
            resultText = `${fileCount} file${fileCount === 1 ? '' : 's'} changed — rendered OK (${commitCount} edit batch${commitCount === 1 ? '' : 'es'})`;
        } else {
            resultText = 'No changes committed';
        }
        if (changedPaths.size > 0) {
            resultText += ` — ${changedPaths.size} staged edit(s) discarded`;
        }
        if (outcome.status === 'max_iterations') {
            resultText += ' — stopped at the iteration cap';
        } else if (outcome.status === 'error') {
            resultText += ` — ${outcome.error}`;
        }

        agentRunning = false;

        if (!destroyed) {
            if (outcome.text) {
                pushChatMessage('assistant', outcome.text);
            }
            if (outcome.status === 'error') {
                pushChatMessage('error', outcome.error);
            }
            updateChat({busy: false, resultText});
        }

        return {
            status: outcome.status,
            text: outcome.text ?? null,
            error: outcome.error,
            commits: commitCount,
            filesChanged: [...committedPaths],
            resultText
        };
    }

    function handleHover(element) {
        if (activeEdit || activeImageEdit) {
            return; // keep the highlight pinned to the element being edited
        }
        ui.update({highlight: element ? toRect(element) : null});
    }

    function handleSelect(element) {
        // One writer at a time: while an agent task runs, click-to-edit is
        // refused with a visible status instead of racing the task's commits.
        if (refusedWhileAgentRunning()) {
            return;
        }

        // A pending inline edit is COMMITTED when another element is clicked
        // — never silently discarded. The commit re-renders and re-swaps the
        // document, so the clicked element is stale by then; the user clicks
        // again in the fresh preview to edit it.
        if (activeEdit) {
            if (activeEdit.element === element) {
                return;
            }
            commitEdit();
            return;
        }

        // The image panel has nothing pending (replacing is explicit) — a
        // click elsewhere just closes it and falls through to the new target.
        if (activeImageEdit) {
            if (activeImageEdit.element === element) {
                return;
            }
            closeEditor();
        }

        const marker = parseEditMarker(element.getAttribute('data-edit'));

        if (!marker) {
            return;
        }

        disarmPublish();

        // A marked <img> gets the Replace-image panel: it is a void element,
        // so there is no text child for the inline text editor to edit.
        if (element.tagName.toLowerCase() === 'img') {
            activeImageEdit = {element, marker};
            ui.update({
                highlight: toRect(element),
                imageEditor: {rect: toRect(element)},
                statusText: '',
                statusIsError: false
            });
            return;
        }

        beginInlineEdit(element, marker);
        ui.update({
            highlight: toRect(element),
            editor: {rect: toRect(element)},
            statusText: '',
            statusIsError: false
        });
    }

    function destroy(exitInfo) {
        if (destroyed) {
            return;
        }
        destroyed = true;

        interactions?.detach();
        swapper?.restore();
        client?.destroy();
        ui?.destroy();

        try {
            onExit?.(exitInfo);
        } catch {
            // the shell's callback must never break teardown
        }
    }

    async function start() {
        ui = uiFactory({
            doc,
            handlers: {
                onExit: () => destroy(),
                onPublish: () => publish(),
                onCommitEdit: () => commitEdit(),
                onCancelEdit: () => closeEditor(),
                onReplaceImage: () => replaceImage(),
                onToggleChat: () => toggleChat(),
                onSendPrompt: text => runAgentTask(text),
                onSaveApiKey: value => saveApiKey(value),
                onSaveModel: value => saveModel(value),
                onClearApiKey: () => clearApiKey()
            }
        });
        ui.update({chat});

        try {
            themeName = await fetchActiveThemeName(adminUrl, fetchImpl);
            if (destroyed) {
                return;
            }
            ui.update({themeName, statusText: `Downloading "${themeName}"…`});

            const archive = await downloadThemeArchive(adminUrl, themeName, fetchImpl);
            if (destroyed) {
                return;
            }
            snapshot = await extractThemeArchive(archive);
            if (destroyed) {
                return;
            }

            const baseTheme = buildRenderTheme(snapshot);
            baseHash = computeThemeContentHash(baseTheme);
            storeKey = draftKey({siteUrl, themeName, baseHash});

            const draft = await draftStore.get(storeKey);
            if (destroyed) {
                return;
            }
            renderTheme = draft?.files ?? baseTheme;
            editCount = draft?.editCount ?? 0;
            if (draft) {
                for (const [path, content] of Object.entries(draft.files)) {
                    if (snapshot.files[path]) {
                        snapshot.files[path].content = content;
                    }
                    // seed the changed-files list (publish arm step) with the
                    // paths this draft already differs from the base in
                    if (content !== baseTheme[path]) {
                        changedFiles.add(path);
                    }
                }
            }

            const pageHtml = doc.documentElement.outerHTML;
            const contentApiKey = sanitizeContentApiKey(config.key) || scrapeContentApiKey(pageHtml);

            if (!contentApiKey) {
                throw new Error('No Content API key available (config.key empty and no data-key script tag on the page)');
            }

            ui.update({statusText: 'Starting renderer…'});
            client = await startClient({
                siteUrl,
                contentApiKey,
                config: scrapeInstanceConfig(pageHtml).config,
                theme: renderTheme,
                workerUrl: config.scriptUrl ? resolveWorkerUrl(config.scriptUrl) : ''
            });

            if (destroyed) {
                client.destroy();
                return;
            }

            swapper = createDocumentSwapper({
                doc,
                win,
                // The admin auth iframe is deliberately NOT preserved: moving
                // an iframe between parents discards its browsing context (it
                // would reload anyway), and the session doesn't need it — it
                // stays in the detached original body and returns on restore.
                preserveSelectors: [`#${ROOT_ID}`, `#${OVERLAY_HOST_ID}`]
            });

            await renderAndSwap();
            if (destroyed) {
                return;
            }

            interactions = attachInteractions({
                doc,
                ignoreSelectors: [`#${ROOT_ID}`, `#${OVERLAY_HOST_ID}`],
                onHover: handleHover,
                onSelect: handleSelect
            });

            ui.update({
                status: 'ready',
                dirtyCount: editCount,
                statusText: client.mode === 'main'
                    ? 'Click any text to edit (rendering on the main thread — worker unavailable).'
                    : 'Click any text to edit.',
                statusIsError: false
            });
        } catch (error) {
            if (destroyed) {
                return;
            }
            // A session that failed to boot cannot function — tear down and
            // report through onExit so the toolbar can offer a clean retry.
            destroy({reason: 'boot_failure', message: error.message});
        }
    }

    return {start, destroy, runAgentTask};
}
