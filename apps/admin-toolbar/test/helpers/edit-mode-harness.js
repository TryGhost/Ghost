/**
 * Shared seam-driven harness for edit-mode session tests: an in-memory Admin
 * API double, a fake renderer client, a fake UI (records every update), fake
 * interactions, and bootSession() which wires them all through
 * createEditSession's deps. Extracted from edit-mode-session.test.js so the
 * agent tests (edit-mode-agent.test.js) drive the exact same seams.
 */
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createEditSession} from '../../src/edit-mode/session.js';
import {createMemoryDraftStore} from '../../src/edit-mode/draft-store.js';
import {extractThemeArchive, packThemeArchive} from '@tryghost/theme-renderer/editor/archive';

export const ADMIN_URL = 'https://site.example.com/ghost/';
export const SCRIPT_URL = 'https://cdn.example.com/admin-toolbar/admin-toolbar.min.js';

export const BASE_THEME = {
    'index.hbs': '<h1>Original title</h1><p>Second para</p><img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w" sizes="100vw">',
    'package.json': '{"name":"fixture-theme"}'
};

export const IMAGE_URL = 'https://site.example.com/content/images/2026/08/new-hero.png';

export function jsonResponse(payload, {status = 200} = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {'content-type': 'application/json'}
    });
}

export function toSnapshotFiles(files) {
    return Object.fromEntries(Object.entries(files).map(([path, content]) => [path, {
        path,
        editable: true,
        content,
        binary: null,
        date: new Date('2026-01-01T00:00:00.000Z'),
        unixPermissions: null,
        dosPermissions: null
    }]));
}

export function packFixtureArchive(files, rootPrefix) {
    return packThemeArchive({rootPrefix, files: toSnapshotFiles(files)});
}

/**
 * In-memory Admin API double covering the theme endpoints the session uses:
 * active theme lookup, zip download, multipart upload (+copy_settings_from),
 * and activation. Uploads update the stored theme so re-entry sees them.
 */
export function createFakeAdminApi({activeName = 'fixture-theme', themes = {[activeName]: BASE_THEME}} = {}) {
    const api = {
        activeName,
        themes: new Map(Object.entries(themes)),
        uploads: [],
        activations: [],
        imageUploads: [],
        uploadResponse: null, // {status, body} override for error paths
        imageUploadResponse: null, // {status, body} or {url} override
        failActiveLookup: false
    };

    api.fetchImpl = async (url, options = {}) => {
        const parsed = new URL(url);
        const method = (options.method || 'GET').toUpperCase();

        if (method === 'GET' && parsed.pathname.endsWith('/api/admin/themes/active/')) {
            if (api.failActiveLookup) {
                return new Response('boom', {status: 500});
            }
            return jsonResponse({themes: [{name: api.activeName, active: true}]});
        }

        const downloadMatch = parsed.pathname.match(/\/api\/admin\/themes\/([^/]+)\/download\/$/);
        if (method === 'GET' && downloadMatch) {
            const name = decodeURIComponent(downloadMatch[1]);
            const files = api.themes.get(name);
            if (!files) {
                return new Response('missing', {status: 404});
            }
            return new Response(await packFixtureArchive(files, `${name}/`), {status: 200});
        }

        if (method === 'POST' && parsed.pathname.endsWith('/api/admin/images/upload/')) {
            if (api.imageUploadResponse?.status) {
                return jsonResponse(api.imageUploadResponse.body, {status: api.imageUploadResponse.status});
            }
            const file = options.body.get('file');
            api.imageUploads.push({fileName: file.name, type: file.type});
            return jsonResponse({
                images: [{url: api.imageUploadResponse?.url ?? IMAGE_URL, ref: null}]
            }, {status: 201});
        }

        if (method === 'POST' && parsed.pathname.endsWith('/api/admin/themes/upload/')) {
            if (api.uploadResponse) {
                return jsonResponse(api.uploadResponse.body, {status: api.uploadResponse.status});
            }
            const file = options.body.get('file');
            const uploadedName = file.name.replace(/\.zip$/, '');
            const snapshot = await extractThemeArchive(await file.arrayBuffer());
            const uploadedFiles = Object.fromEntries(
                Object.entries(snapshot.files).map(([path, entry]) => [path, entry.content])
            );
            api.uploads.push({
                name: uploadedName,
                copySettingsFrom: parsed.searchParams.get('copy_settings_from'),
                files: uploadedFiles
            });
            api.themes.set(uploadedName, uploadedFiles);
            return jsonResponse({themes: [{name: uploadedName}]});
        }

        const activateMatch = parsed.pathname.match(/\/api\/admin\/themes\/([^/]+)\/activate\/$/);
        if (method === 'PUT' && activateMatch) {
            const name = decodeURIComponent(activateMatch[1]);
            api.activations.push(name);
            api.activeName = name;
            return jsonResponse({themes: [{name, active: true}]});
        }

        return new Response(`unexpected ${method} ${url}`, {status: 500});
    };

    return api;
}

/** The fake renderer: marks the fixture's h1/p/img so click-to-edit has targets. */
export function defaultRenderHtml(theme) {
    const body = (theme['index.hbs'] ?? '')
        .replace('<h1>', '<h1 data-edit="index.hbs:1:1">')
        .replace('<p>', '<p data-edit="index.hbs:1:24">')
        .replace('<img ', '<img data-edit="index.hbs:1:42" ');
    return `<!DOCTYPE html><html><head><title>Preview</title></head><body>${body}</body></html>`;
}

export function createFakeClientFactory({renderHtml = defaultRenderHtml, setThemeShouldFail} = {}) {
    const created = [];

    const startClient = async (options) => {
        const client = {
            mode: 'main',
            options,
            theme: options.theme,
            setThemeCalls: [],
            destroyed: false,
            async setTheme(theme) {
                client.setThemeCalls.push(theme);
                if (setThemeShouldFail?.(theme)) {
                    throw new Error('candidate failed to compile');
                }
                client.theme = theme;
            },
            async render(url) {
                return {status: 200, html: renderHtml(client.theme), url};
            },
            destroy() {
                client.destroyed = true;
            }
        };
        created.push(client);
        return client;
    };

    return {startClient, created};
}

export function createFakeUi() {
    const ui = {
        handlers: null,
        state: {
            themeName: null,
            dirtyCount: 0,
            status: 'loading',
            statusText: '',
            statusIsError: false,
            highlight: null,
            editor: null,
            imageEditor: null,
            publishArmed: false,
            chat: {open: false, busy: false, hasKey: false, messages: [], resultText: null}
        },
        updates: [],
        destroyed: false,
        update(patch) {
            ui.state = {...ui.state, ...patch};
            ui.updates.push(patch);
        },
        getState() {
            return ui.state;
        },
        destroy() {
            ui.destroyed = true;
        }
    };

    ui.factory = ({handlers}) => {
        ui.handlers = handlers;
        return ui;
    };

    return ui;
}

export function createFakeInteractions() {
    const record = {options: null, detached: false};

    record.attach = (options) => {
        record.options = options;
        return {
            detach() {
                record.detached = true;
            }
        };
    };

    return record;
}

export function createPageDom({withDataKey = true} = {}) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head><title>Live</title></head><body>
        <main id="live-main">Live content</main>
        ${withDataKey ? '<script defer src="https://cdn.example.com/sodo-search.min.js" data-key="abc123def456" data-styles="s" data-sodo-search="x"></script>' : ''}
    </body></html>`, {url: 'https://site.example.com/'});

    dom.window.scrollTo = () => {};
    return dom;
}

export async function waitFor(predicate, {timeout = 2000} = {}) {
    const startedAt = Date.now();
    while (!predicate()) {
        if (Date.now() - startedAt > timeout) {
            throw new Error('waitFor timed out');
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    }
}

/**
 * Boots a full fake-backed session and returns every seam for assertions.
 * `deps` merges extra seams (keyStore, providerFactory, agentLoop, …) into
 * createEditSession's deps last, so they win over the harness defaults.
 */
export async function bootSession({
    api = createFakeAdminApi(),
    dom = createPageDom(),
    draftStore = createMemoryDraftStore(),
    clientFactory = createFakeClientFactory(),
    onExit,
    promptFn,
    pickFile,
    configKey = '',
    deps = {}
} = {}) {
    const ui = createFakeUi();
    const interactions = createFakeInteractions();

    const session = createEditSession({
        config: {adminUrl: ADMIN_URL, key: configKey, scriptUrl: SCRIPT_URL},
        onExit,
        deps: {
            doc: dom.window.document,
            win: dom.window,
            fetchImpl: api.fetchImpl,
            ...(draftStore ? {draftStore} : {}),
            ...(promptFn ? {promptFn} : {}),
            ...(pickFile ? {pickFile} : {}),
            startClient: clientFactory.startClient,
            uiFactory: ui.factory,
            attachInteractions: interactions.attach,
            ...deps
        }
    });

    await session.start();

    return {session, ui, interactions, api, dom, draftStore, clientFactory};
}

export function editableElement(dom, marker) {
    const element = dom.window.document.querySelector(`[data-edit="${marker}"]`);
    assert.ok(element, `expected a [data-edit="${marker}"] element in the preview`);
    return element;
}

/**
 * Performs one in-place inline edit through the UI seam: select the marked
 * element (which makes it contentEditable), type into it (the text lands in
 * the element itself — there is no input box), and commit via the panel's
 * Save handler. Omit `text` to commit untouched.
 */
export async function commitInlineEdit(booted, marker, text) {
    const element = editableElement(booted.dom, marker);
    booted.interactions.options.onSelect(element);
    if (text !== undefined) {
        element.textContent = text;
    }
    await booted.ui.handlers.onCommitEdit();
    return element;
}
