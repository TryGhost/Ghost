/* eslint ghost/ghost-custom/no-native-error: off */

/**
 * Edit-mode session — the orchestrator behind the chunk's mount() contract.
 *
 * Boot: fetch the active theme name → download + extract its zip → scrape
 * instance config off the live document → boot the renderer (worker-first,
 * main-thread fallback) → render the current route with {markers: true} →
 * swap the live document in place → wire click-to-edit.
 *
 * Edit loop: click a [data-edit] element → parse its marker → inline input →
 * applyThemeTextEdit (anchor-verified) → update the draft store → setTheme on
 * the render client (fresh renderer per edit, docs/markers.md) → re-render →
 * re-swap.
 *
 * Publish: confirm → packThemeArchive (rootPrefix preserved; the zip
 * FILENAME must be `<themeName>.zip` — it determines the installed name) →
 * POST /themes/upload/ → surface gscan 422s readably. Exit restores the
 * original pre-swap document.
 */
import {ROOT_ID} from '../constants';
import {parseEditMarker} from '@tryghost/theme-renderer';
import {applyThemeTextEdit} from '@tryghost/theme-renderer/editor';
import {extractThemeArchive, packThemeArchive} from '@tryghost/theme-renderer/editor/archive';
import {scrapeContentApiKey, scrapeInstanceConfig} from '@tryghost/theme-renderer/editor/instance-config';
import {createDocumentSwapper} from './swap';
import {createEditModeUi, OVERLAY_HOST_ID} from './ui';
import {attachEditInteractions} from './interactions';
import {createMemoryDraftStore, computeThemeContentHash, draftKey} from './draft-store';
import {startRenderClient, resolveWorkerUrl} from './render-client';
import {downloadThemeArchive, fetchActiveThemeName, uploadThemeArchive, ThemeUploadError} from './theme-api';

export const AUTH_FRAME_SELECTOR = 'iframe[data-frame="admin-auth"]';

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

// Module-level so drafts survive exit/re-enter within one page view — the
// in-memory store's documented lifetime. Server-backed persistence replaces
// this singleton via the DraftStore seam.
const sessionDraftStore = createMemoryDraftStore();

/**
 * @param {Object} options
 * @param {Object} options.config — toolbar config (adminUrl, key, scriptUrl, …)
 * @param {Object} [options.deps] — test seams; every external effect is injectable
 * @returns {{start(): Promise<void>, destroy(): void}}
 */
export function createEditSession({config, deps = {}}) {
    const {
        doc = document,
        win = window,
        fetchImpl = (...args) => fetch(...args),
        draftStore = sessionDraftStore,
        confirmFn = message => win.confirm(message),
        startClient = startRenderClient
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
    let storeKey = null;
    let editCount = 0;
    let activeEdit = null; // {element, marker}

    async function renderAndSwap() {
        const result = await client.render(win.location.href, {markers: true});
        swapper.swap(result.html);

        if (result.status !== 200) {
            ui.update({statusText: `Preview rendered with status ${result.status}`, statusIsError: true});
        }
    }

    function closeEditor(patch = {}) {
        activeEdit = null;
        ui.update({editor: null, highlight: null, ...patch});
    }

    async function commitEdit(value) {
        if (!activeEdit) {
            return;
        }

        const {element, marker} = activeEdit;
        const newText = value.replace(/\s+/g, ' ').trim();

        let nextTheme;
        try {
            nextTheme = applyThemeTextEdit(renderTheme, marker, newText, {tagName: element.tagName});
        } catch (error) {
            closeEditor({statusText: `Could not apply the edit: ${error.message}`, statusIsError: true});
            return;
        }

        renderTheme = nextTheme;
        snapshot.files[marker.file].content = nextTheme[marker.file];
        editCount += 1;
        await draftStore.set(storeKey, {files: renderTheme, editCount});

        closeEditor({status: 'loading', statusText: 'Rendering…', statusIsError: false});

        try {
            await client.setTheme(renderTheme);
            await renderAndSwap();
            ui.update({status: 'ready', statusText: '', dirtyCount: editCount});
        } catch (error) {
            ui.update({status: 'ready', statusText: `Re-render failed: ${error.message}`, statusIsError: true});
        }
    }

    async function publish() {
        if (editCount === 0) {
            return;
        }

        const confirmed = confirmFn(
            `Publish ${editCount} edit${editCount === 1 ? '' : 's'} to "${themeName}"?\n\n` +
            'This OVERWRITES the live theme and re-activates it immediately for all visitors.'
        );

        if (!confirmed) {
            return;
        }

        ui.update({status: 'publishing', statusText: '', statusIsError: false});

        try {
            const blob = await packThemeArchive(snapshot);
            const uploadedTheme = await uploadThemeArchive(adminUrl, {themeName, blob}, fetchImpl);

            editCount = 0;
            await draftStore.clear(storeKey);
            ui.update({
                status: 'ready',
                dirtyCount: 0,
                statusText: `Published — "${uploadedTheme.name}" is live.`,
                statusIsError: false
            });
        } catch (error) {
            ui.update({
                status: 'ready',
                statusText: error instanceof ThemeUploadError ? error.message : `Publish failed: ${error.message}`,
                statusIsError: true
            });
        }
    }

    function handleHover(element) {
        if (activeEdit) {
            return; // keep the highlight pinned to the element being edited
        }
        ui.update({highlight: element ? toRect(element) : null});
    }

    function handleSelect(element) {
        const marker = parseEditMarker(element.getAttribute('data-edit'));

        if (!marker) {
            return;
        }

        activeEdit = {element, marker};
        ui.update({
            highlight: toRect(element),
            editor: {rect: toRect(element), value: initialEditValue(element)},
            statusText: '',
            statusIsError: false
        });
    }

    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;

        interactions?.detach();
        swapper?.restore();
        client?.destroy();
        ui?.destroy();
    }

    async function start() {
        ui = createEditModeUi({
            doc,
            handlers: {
                onExit: destroy,
                onPublish: () => {
                    publish();
                },
                onCommitEdit: (value) => {
                    commitEdit(value);
                },
                onCancelEdit: () => {
                    closeEditor();
                }
            }
        });

        try {
            themeName = await fetchActiveThemeName(adminUrl, fetchImpl);
            ui.update({themeName, statusText: `Downloading "${themeName}"…`});

            const archive = await downloadThemeArchive(adminUrl, themeName, fetchImpl);
            snapshot = await extractThemeArchive(archive);

            const baseTheme = buildRenderTheme(snapshot);
            storeKey = draftKey({siteUrl, themeName, baseHash: computeThemeContentHash(baseTheme)});

            const draft = await draftStore.get(storeKey);
            renderTheme = draft?.files ?? baseTheme;
            editCount = draft?.editCount ?? 0;
            if (draft) {
                for (const [path, content] of Object.entries(draft.files)) {
                    if (snapshot.files[path]) {
                        snapshot.files[path].content = content;
                    }
                }
            }

            const pageHtml = doc.documentElement.outerHTML;
            const contentApiKey = config.key || scrapeContentApiKey(pageHtml);

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
                preserveSelectors: [`#${ROOT_ID}`, AUTH_FRAME_SELECTOR, `#${OVERLAY_HOST_ID}`]
            });

            await renderAndSwap();

            interactions = attachEditInteractions({
                doc,
                ignoreSelectors: [`#${ROOT_ID}`, `#${OVERLAY_HOST_ID}`, AUTH_FRAME_SELECTOR],
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
            ui.update({
                status: 'error',
                statusText: `Edit mode failed to start: ${error.message}`,
                statusIsError: true
            });
        }
    }

    return {start, destroy};
}
