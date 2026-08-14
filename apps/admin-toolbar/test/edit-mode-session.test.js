import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {
    buildRenderTheme,
    createEditSession,
    deriveSiteUrl,
    initialEditValue,
    sanitizeContentApiKey,
    validateNewThemeName
} from '../src/edit-mode/session.js';
import {createMemoryDraftStore} from '../src/edit-mode/draft-store.js';
import {
    ADMIN_URL,
    BASE_THEME,
    IMAGE_URL,
    SCRIPT_URL,
    bootSession,
    createFakeAdminApi,
    createFakeClientFactory,
    createFakeInteractions,
    createFakeUi,
    createPageDom,
    defaultRenderHtml,
    editableElement,
    waitFor
} from './helpers/edit-mode-harness.js';

describe('edit-mode session', function () {
    describe('helpers', function () {
        it('deriveSiteUrl strips the trailing ghost/ segment', function () {
            assert.equal(deriveSiteUrl('https://site.example.com/ghost/'), 'https://site.example.com/');
            assert.equal(deriveSiteUrl('https://site.example.com/blog/ghost/'), 'https://site.example.com/blog/');
        });

        it('buildRenderTheme keeps only text .hbs and .json sources', function () {
            const snapshot = {
                rootPrefix: 'casper/',
                files: {
                    'index.hbs': {content: '{{!< default}}', binary: null},
                    'package.json': {content: '{"name":"casper"}', binary: null},
                    'assets/app.css': {content: 'body{}', binary: null},
                    'assets/logo.png': {content: null, binary: new Uint8Array([1])}
                }
            };

            assert.deepEqual(buildRenderTheme(snapshot), {
                'index.hbs': '{{!< default}}',
                'package.json': '{"name":"casper"}'
            });
        });

        it('initialEditValue collapses rendered text to one line', function () {
            const dom = new JSDOM('<!DOCTYPE html><body><h1>  Hello\n   world </h1></body>');
            assert.equal(initialEditValue(dom.window.document.querySelector('h1')), 'Hello world');
        });

        it('sanitizeContentApiKey rejects empty and stringified-null keys', function () {
            assert.equal(sanitizeContentApiKey('abc123'), 'abc123');
            assert.equal(sanitizeContentApiKey(' abc123 '), 'abc123');
            assert.equal(sanitizeContentApiKey(''), null);
            assert.equal(sanitizeContentApiKey('   '), null);
            assert.equal(sanitizeContentApiKey('null'), null);
            assert.equal(sanitizeContentApiKey('undefined'), null);
            assert.equal(sanitizeContentApiKey(undefined), null);
        });

        it('validateNewThemeName enforces lowercase, no spaces, non-default', function () {
            assert.equal(validateNewThemeName('my-theme'), null);
            assert.match(validateNewThemeName(''), /empty/);
            assert.match(validateNewThemeName('my theme'), /spaces/);
            assert.match(validateNewThemeName('MyTheme'), /lowercase/);
            assert.match(validateNewThemeName('casper'), /default theme/);
            assert.match(validateNewThemeName('source'), /default theme/);
        });
    });

    describe('boot', function () {
        it('downloads the active theme, renders, swaps, and reports ready', async function () {
            const {ui, dom, clientFactory, interactions} = await bootSession();

            assert.equal(ui.state.status, 'ready');
            assert.equal(ui.state.themeName, 'fixture-theme');
            assert.equal(ui.state.dirtyCount, 0);
            assert.equal(dom.window.document.title, 'Preview');
            assert.ok(editableElement(dom, 'index.hbs:1:1'));
            assert.equal(clientFactory.created.length, 1);
            assert.deepEqual(clientFactory.created[0].options.theme, BASE_THEME);
            assert.ok(interactions.options, 'click-to-edit should be attached');
        });

        it('uses the scraped page data-key when config.key is the literal "null"', async function () {
            const {clientFactory} = await bootSession({configKey: 'null'});

            assert.equal(clientFactory.created[0].options.contentApiKey, 'abc123def456');
        });

        it('exits through onExit when no usable Content API key exists', async function () {
            const exits = [];
            const {ui} = await bootSession({
                dom: createPageDom({withDataKey: false}),
                configKey: 'null',
                onExit: info => exits.push(info)
            });

            assert.equal(exits.length, 1);
            assert.equal(exits[0].reason, 'boot_failure');
            assert.match(exits[0].message, /Content API key/);
            assert.equal(ui.destroyed, true);
        });

        it('tears down and reports boot_failure through onExit when the boot fails', async function () {
            const api = createFakeAdminApi();
            api.failActiveLookup = true;
            const exits = [];

            const {ui, dom} = await bootSession({api, onExit: info => exits.push(info)});

            assert.equal(exits.length, 1);
            assert.equal(exits[0].reason, 'boot_failure');
            assert.equal(ui.destroyed, true);
            // the live page was never swapped away
            assert.ok(dom.window.document.getElementById('live-main'));
        });
    });

    describe('exit', function () {
        it('invokes onExit exactly once, after cleanup', async function () {
            const exits = [];
            let uiDestroyedAtExit = null;
            const booted = await bootSession({
                onExit: (info) => {
                    exits.push(info);
                    uiDestroyedAtExit = booted.ui.destroyed;
                }
            });

            booted.session.destroy();
            booted.session.destroy(); // idempotent

            assert.equal(exits.length, 1);
            assert.equal(exits[0], undefined);
            assert.equal(uiDestroyedAtExit, true, 'onExit must fire after the UI is torn down');
            assert.ok(booted.dom.window.document.getElementById('live-main'), 'the original page is restored');
            assert.equal(booted.interactions.detached, true);
            assert.equal(booted.clientFactory.created[0].destroyed, true);
        });

        it('does not swap the page when destroy() lands while the renderer is still booting', async function () {
            const dom = createPageDom();
            const api = createFakeAdminApi();
            const ui = createFakeUi();
            const interactions = createFakeInteractions();

            let clientRequested = false;
            let resolveClient;
            const pendingClient = new Promise((resolve) => {
                resolveClient = resolve;
            });

            const session = createEditSession({
                config: {adminUrl: ADMIN_URL, key: '', scriptUrl: SCRIPT_URL},
                deps: {
                    doc: dom.window.document,
                    win: dom.window,
                    fetchImpl: api.fetchImpl,
                    draftStore: createMemoryDraftStore(),
                    startClient: () => {
                        clientRequested = true;
                        return pendingClient;
                    },
                    uiFactory: ui.factory,
                    attachInteractions: interactions.attach
                }
            });

            const startPromise = session.start();
            await waitFor(() => clientRequested);

            session.destroy();

            const lateClient = {
                mode: 'main',
                destroyed: false,
                async render() {
                    return {status: 200, html: defaultRenderHtml(BASE_THEME), url: 'x'};
                },
                async setTheme() {},
                destroy() {
                    lateClient.destroyed = true;
                }
            };
            resolveClient(lateClient);
            await startPromise;

            assert.ok(dom.window.document.getElementById('live-main'), 'the live page must not be swapped after exit');
            assert.equal(dom.window.document.title, 'Live');
            assert.equal(lateClient.destroyed, true, 'the late-arriving client is destroyed');
            assert.equal(interactions.options, null, 'click-to-edit is never attached');
        });

        it('does not swap the page when destroy() lands while the first render is in flight', async function () {
            const dom = createPageDom();
            const api = createFakeAdminApi();
            const ui = createFakeUi();
            const interactions = createFakeInteractions();

            let resolveRender;
            let renderRequested = false;
            const client = {
                mode: 'main',
                async setTheme() {},
                render() {
                    renderRequested = true;
                    return new Promise((resolve) => {
                        resolveRender = resolve;
                    });
                },
                destroy() {}
            };

            const session = createEditSession({
                config: {adminUrl: ADMIN_URL, key: '', scriptUrl: SCRIPT_URL},
                deps: {
                    doc: dom.window.document,
                    win: dom.window,
                    fetchImpl: api.fetchImpl,
                    draftStore: createMemoryDraftStore(),
                    startClient: async () => client,
                    uiFactory: ui.factory,
                    attachInteractions: interactions.attach
                }
            });

            const startPromise = session.start();
            await waitFor(() => renderRequested);

            session.destroy();
            resolveRender({status: 200, html: defaultRenderHtml(BASE_THEME), url: 'x'});
            await startPromise;

            assert.equal(dom.window.document.title, 'Live', 'the swapped preview must not land after exit');
            assert.ok(dom.window.document.getElementById('live-main'));
        });
    });

    describe('commitEdit', function () {
        it('applies an edit, re-renders, and only then counts it', async function () {
            const {ui, dom, interactions, clientFactory} = await bootSession();

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            assert.ok(ui.state.editor, 'the inline editor opens');
            assert.equal(ui.state.editor.value, 'Original title');

            await ui.handlers.onCommitEdit('Edited title');

            assert.equal(ui.state.dirtyCount, 1);
            assert.equal(ui.state.status, 'ready');
            assert.equal(ui.state.statusIsError, false);
            assert.match(dom.window.document.querySelector('h1').textContent, /Edited title/);

            const client = clientFactory.created[0];
            assert.equal(client.setThemeCalls.length, 1);
            assert.match(client.setThemeCalls[0]['index.hbs'], /Edited title/);
        });

        it('commits nothing when the value is unchanged', async function () {
            const {ui, dom, interactions, clientFactory} = await bootSession();

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            await ui.handlers.onCommitEdit('Original title');

            assert.equal(ui.state.dirtyCount, 0);
            assert.equal(ui.state.editor, null);
            assert.equal(clientFactory.created[0].setThemeCalls.length, 0);
        });

        it('surfaces applier rejections ({{ injection) cleanly with no dirty count', async function () {
            const {ui, dom, interactions, clientFactory} = await bootSession();

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            await ui.handlers.onCommitEdit('{{@site.title}}');

            assert.equal(ui.state.dirtyCount, 0);
            assert.equal(ui.state.statusIsError, true);
            assert.match(ui.state.statusText, /Could not apply the edit/);
            // the rejected candidate never reached the renderer
            assert.equal(clientFactory.created[0].setThemeCalls.length, 0);
            // and the preview still shows the original
            assert.match(dom.window.document.querySelector('h1').textContent, /Original title/);
        });

        it('reverts to the last-good theme when the candidate fails to render', async function () {
            const clientFactory = createFakeClientFactory({
                setThemeShouldFail: theme => /Poison/.test(theme['index.hbs'])
            });
            const {ui, dom, interactions} = await bootSession({clientFactory});

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            await ui.handlers.onCommitEdit('Poison');

            assert.equal(ui.state.dirtyCount, 0, 'a failed edit must not count');
            assert.equal(ui.state.statusIsError, true);
            assert.match(ui.state.statusText, /Edit failed/);

            const client = clientFactory.created[0];
            assert.equal(client.setThemeCalls.length, 2, 'candidate + revert');
            assert.match(client.setThemeCalls[0]['index.hbs'], /Poison/);
            assert.match(client.setThemeCalls[1]['index.hbs'], /Original title/, 'reverted to the last-good theme');

            // the session still works: a good edit succeeds afterwards
            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            await ui.handlers.onCommitEdit('Recovered title');
            assert.equal(ui.state.dirtyCount, 1);
            assert.match(dom.window.document.querySelector('h1').textContent, /Recovered title/);
        });

        it('commits the pending inline edit when another element is clicked', async function () {
            const {ui, dom, interactions} = await bootSession();

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            ui.state.editor.value = 'Typed then clicked away';

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:24'));
            await waitFor(() => ui.state.dirtyCount === 1);

            assert.match(dom.window.document.querySelector('h1').textContent, /Typed then clicked away/);
            assert.equal(ui.state.editor, null, 'no new editor opens on the stale element');
        });

        it('closes without committing when clicking away with an untouched value', async function () {
            const {ui, dom, interactions, clientFactory} = await bootSession();

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:1'));
            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:24'));
            await waitFor(() => ui.state.editor === null);

            assert.equal(ui.state.dirtyCount, 0);
            assert.equal(clientFactory.created[0].setThemeCalls.length, 0);
        });
    });

    describe('image swap', function () {
        const heroFile = () => new File([new Uint8Array([137, 80, 78, 71])], 'new-hero.png', {type: 'image/png'});

        function clickImage(booted) {
            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:42'));
        }

        it('clicking a marked <img> opens the image editor, not the text editor', async function () {
            const booted = await bootSession();

            clickImage(booted);

            assert.ok(booted.ui.state.imageEditor, 'the image editor panel opens');
            assert.equal(booted.ui.state.editor, null, 'no text editor for a void element');
            assert.ok(booted.ui.state.highlight, 'the clicked image stays highlighted');
        });

        it('happy path: uploads, swaps src, clears srcset/sizes, render-verifies, then counts', async function () {
            const events = [];
            const clientFactory = createFakeClientFactory();
            const draftStore = createMemoryDraftStore();
            const originalSet = draftStore.set.bind(draftStore);
            const storedDrafts = [];
            draftStore.set = async (key, draft) => {
                storedDrafts.push(draft);
                return originalSet(key, draft);
            };
            const booted = await bootSession({
                clientFactory,
                draftStore,
                pickFile: async () => {
                    events.push('pick');
                    return heroFile();
                }
            });
            const originalUpdate = booted.ui.update.bind(booted.ui);
            booted.ui.update = (patch) => {
                if (patch.dirtyCount === 1) {
                    events.push('counted');
                }
                originalUpdate(patch);
            };

            clickImage(booted);
            await booted.ui.handlers.onReplaceImage();

            // the upload used the real multipart contract (field name asserted
            // by the fake API route itself) and preserved the file's name
            assert.deepEqual(booted.api.imageUploads, [{fileName: 'new-hero.png', type: 'image/png'}]);

            // the candidate theme carries the swap: src replaced, srcset/sizes gone
            const client = clientFactory.created[0];
            assert.equal(client.setThemeCalls.length, 1);
            const edited = client.setThemeCalls[0]['index.hbs'];
            assert.ok(edited.includes(`src="${IMAGE_URL}"`), 'src points at the uploaded URL');
            assert.ok(!edited.includes('srcset'), 'srcset is cleared on swap');
            assert.ok(!edited.includes('sizes'), 'sizes is cleared on swap');
            assert.ok(edited.includes('class="hero"'), 'unrelated attributes survive');
            assert.ok(edited.includes('Original title'), 'text content untouched');

            // committed only after the render verified: the swapped preview
            // shows the new image and the count landed last
            assert.equal(booted.ui.state.dirtyCount, 1);
            assert.equal(booted.ui.state.status, 'ready');
            assert.equal(booted.ui.state.imageEditor, null, 'the panel closes on success');
            assert.equal(booted.dom.window.document.querySelector('img').getAttribute('src'), IMAGE_URL);
            assert.deepEqual(events, ['pick', 'counted']);

            // and the draft store saw the committed theme
            assert.equal(storedDrafts.length, 1);
            assert.ok(storedDrafts[0].files['index.hbs'].includes(`src="${IMAGE_URL}"`));
            assert.equal(storedDrafts[0].editCount, 1);
        });

        it('a cancelled file pick does nothing', async function () {
            const booted = await bootSession({pickFile: async () => null});

            clickImage(booted);
            await booted.ui.handlers.onReplaceImage();

            assert.equal(booted.api.imageUploads.length, 0);
            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.ok(booted.ui.state.imageEditor, 'the panel stays open for another try');
        });

        it('surfaces an upload failure without dirtying anything', async function () {
            const clientFactory = createFakeClientFactory();
            const booted = await bootSession({clientFactory, pickFile: async () => heroFile()});
            booted.api.imageUploadResponse = {
                status: 415,
                body: {errors: [{message: 'Please select a valid image.'}]}
            };

            clickImage(booted);
            await booted.ui.handlers.onReplaceImage();

            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.equal(booted.ui.state.statusIsError, true);
            assert.match(booted.ui.state.statusText, /Image upload failed/);
            assert.match(booted.ui.state.statusText, /Please select a valid image\./);
            assert.equal(clientFactory.created[0].setThemeCalls.length, 0, 'no candidate ever reached the renderer');
            // the preview still shows the original image
            assert.equal(booted.dom.window.document.querySelector('img').getAttribute('src'), '/old.jpg');
        });

        it('surfaces an applier rejection (handlebars in the returned URL) without dirtying', async function () {
            const clientFactory = createFakeClientFactory();
            const booted = await bootSession({clientFactory, pickFile: async () => heroFile()});
            booted.api.imageUploadResponse = {url: '/content/{{evil}}.png'};

            clickImage(booted);
            await booted.ui.handlers.onReplaceImage();

            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.equal(booted.ui.state.statusIsError, true);
            assert.match(booted.ui.state.statusText, /Could not apply the image swap/);
            assert.equal(clientFactory.created[0].setThemeCalls.length, 0);
        });

        it('reverts to the last-good theme when the swapped candidate fails to render', async function () {
            const clientFactory = createFakeClientFactory({
                setThemeShouldFail: theme => theme['index.hbs'].includes(IMAGE_URL)
            });
            const booted = await bootSession({clientFactory, pickFile: async () => heroFile()});

            clickImage(booted);
            await booted.ui.handlers.onReplaceImage();

            assert.equal(booted.ui.state.dirtyCount, 0, 'a failed swap must not count');
            assert.match(booted.ui.state.statusText, /Edit failed/);
            const client = clientFactory.created[0];
            assert.equal(client.setThemeCalls.length, 2, 'candidate + revert');
            assert.ok(client.setThemeCalls[1]['index.hbs'].includes('src="/old.jpg"'), 'reverted to the last-good theme');
        });

        it('commits a pending text edit when the image is clicked (never silently discards)', async function () {
            const booted = await bootSession();

            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
            booted.ui.state.editor.value = 'Typed then clicked the image';

            clickImage(booted);
            await waitFor(() => booted.ui.state.dirtyCount === 1);

            assert.match(booted.dom.window.document.querySelector('h1').textContent, /Typed then clicked the image/);
            assert.equal(booted.ui.state.imageEditor, null, 'no image editor opens on the stale element');
        });

        it('clicking a text element while the image editor is open switches to the text editor', async function () {
            const booted = await bootSession();

            clickImage(booted);
            assert.ok(booted.ui.state.imageEditor);

            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));

            assert.equal(booted.ui.state.imageEditor, null, 'nothing was pending — the panel just closes');
            assert.ok(booted.ui.state.editor, 'the text editor opens for the new target');
        });
    });

    describe('publish', function () {
        async function bootWithEdit(options = {}) {
            const booted = await bootSession(options);
            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
            await booted.ui.handlers.onCommitEdit('Edited title');
            assert.equal(booted.ui.state.dirtyCount, 1);
            return booted;
        }

        it('requires the two-step confirm before uploading', async function () {
            const {ui, api} = await bootWithEdit();

            await ui.handlers.onPublish();
            assert.equal(ui.state.publishArmed, true);
            assert.match(ui.state.statusText, /Confirm publish/);
            assert.equal(api.uploads.length, 0, 'the first click must not upload');

            await ui.handlers.onPublish();
            assert.equal(api.uploads.length, 1);
            assert.equal(api.uploads[0].name, 'fixture-theme');
            assert.equal(api.uploads[0].copySettingsFrom, null);
            assert.match(api.uploads[0].files['index.hbs'], /Edited title/);
            assert.equal(api.activations.length, 0, 'overwriting the active theme needs no explicit activation');
            assert.equal(ui.state.dirtyCount, 0);
            assert.match(ui.state.statusText, /Published/);
        });

        it('disarms the publish confirm when a new edit starts', async function () {
            const {ui, dom, interactions, api} = await bootWithEdit();

            await ui.handlers.onPublish();
            assert.equal(ui.state.publishArmed, true);

            interactions.options.onSelect(editableElement(dom, 'index.hbs:1:24'));
            assert.equal(ui.state.publishArmed, false);

            await ui.handlers.onPublish();
            assert.equal(api.uploads.length, 0, 'the click after disarming re-arms instead of publishing');
            assert.equal(ui.state.publishArmed, true);
        });

        it('publishes a default theme as a renamed copy with settings carried over, then activates it', async function () {
            const api = createFakeAdminApi({activeName: 'casper', themes: {casper: BASE_THEME}});
            const prompts = [];
            const {ui} = await bootWithEdit({
                api,
                promptFn: (message, defaultValue) => {
                    prompts.push({message, defaultValue});
                    return 'casper-edited';
                }
            });

            await ui.handlers.onPublish();
            await ui.handlers.onPublish();

            assert.equal(prompts.length, 1);
            assert.match(prompts[0].message, /cannot be overwritten/);
            assert.equal(api.uploads.length, 1);
            assert.equal(api.uploads[0].name, 'casper-edited');
            assert.equal(api.uploads[0].copySettingsFrom, 'casper');
            assert.deepEqual(api.activations, ['casper-edited']);
            assert.equal(api.activeName, 'casper-edited');
            assert.equal(ui.state.themeName, 'casper-edited');
            assert.match(ui.state.statusText, /Published/);
        });

        it('aborts a default-theme publish when the prompt is cancelled', async function () {
            const api = createFakeAdminApi({activeName: 'casper', themes: {casper: BASE_THEME}});
            const {ui} = await bootWithEdit({api, promptFn: () => null});

            await ui.handlers.onPublish();
            await ui.handlers.onPublish();

            assert.equal(api.uploads.length, 0);
            assert.match(ui.state.statusText, /cancelled/i);
            assert.equal(ui.state.statusIsError, false);
            assert.equal(ui.state.dirtyCount, 1, 'the edit is still pending');
        });

        it('rejects an invalid save-as name without uploading', async function () {
            const api = createFakeAdminApi({activeName: 'source', themes: {source: BASE_THEME}});
            const {ui} = await bootWithEdit({api, promptFn: () => 'Has Spaces'});

            await ui.handlers.onPublish();
            await ui.handlers.onPublish();

            assert.equal(api.uploads.length, 0);
            assert.equal(ui.state.statusIsError, true);
            assert.match(ui.state.statusText, /Not published/);
        });

        it('aborts when the theme changed on the server since boot (lost-update check)', async function () {
            const {ui, api} = await bootWithEdit();

            // someone else published while we were editing
            api.themes.set('fixture-theme', {
                ...BASE_THEME,
                'index.hbs': '<h1>Changed elsewhere</h1><p>Second para</p>'
            });

            await ui.handlers.onPublish();
            await ui.handlers.onPublish();

            assert.equal(api.uploads.length, 0);
            assert.equal(ui.state.statusIsError, true);
            assert.match(ui.state.statusText, /changed on the server/);
        });

        it('labels a server-side ValidationError 422 differently from a gscan report', async function () {
            const {ui, api} = await bootWithEdit();
            api.uploadResponse = {
                status: 422,
                body: {errors: [{type: 'ValidationError', message: 'Please rename your zip, it\'s not allowed to override the default themes'}]}
            };

            await ui.handlers.onPublish();
            await ui.handlers.onPublish();

            assert.equal(ui.state.statusIsError, true);
            assert.match(ui.state.statusText, /server rejected the upload/);
            assert.match(ui.state.statusText, /not allowed to override the default themes/);
            assert.doesNotMatch(ui.state.statusText, /failed validation/);
        });
    });

    describe('draft persistence', function () {
        it('drafts survive exit and re-enter through the shared draft-store seam', async function () {
            const draftStore = createMemoryDraftStore();

            const first = await bootSession({draftStore});
            first.interactions.options.onSelect(editableElement(first.dom, 'index.hbs:1:1'));
            await first.ui.handlers.onCommitEdit('Survives re-entry');
            first.session.destroy();

            assert.ok(first.dom.window.document.getElementById('live-main'), 'exit restores the page');

            const second = await bootSession({api: first.api, draftStore});
            assert.equal(second.ui.state.dirtyCount, 1);
            assert.match(second.dom.window.document.querySelector('h1').textContent, /Survives re-entry/);
        });

        it('drafts survive exit and re-enter on the default module-level store', async function () {
            // no draftStore dep — this exercises the singleton the docs
            // promise survives exit/re-enter within one page view
            const api = createFakeAdminApi({
                activeName: 'singleton-theme',
                themes: {'singleton-theme': BASE_THEME}
            });

            const first = await bootSession({api, draftStore: null});
            first.interactions.options.onSelect(editableElement(first.dom, 'index.hbs:1:1'));
            await first.ui.handlers.onCommitEdit('Singleton survivor');
            first.session.destroy();

            const second = await bootSession({api, draftStore: null});
            assert.equal(second.ui.state.dirtyCount, 1);
            assert.match(second.dom.window.document.querySelector('h1').textContent, /Singleton survivor/);
        });

        it('re-keys drafts after publish so post-publish edits survive re-entry', async function () {
            const draftStore = createMemoryDraftStore();

            const first = await bootSession({draftStore});
            first.interactions.options.onSelect(editableElement(first.dom, 'index.hbs:1:1'));
            await first.ui.handlers.onCommitEdit('Published edit');
            await first.ui.handlers.onPublish();
            await first.ui.handlers.onPublish();
            assert.equal(first.api.uploads.length, 1);

            // a fresh edit on top of the just-published base
            first.interactions.options.onSelect(editableElement(first.dom, 'index.hbs:1:1'));
            await first.ui.handlers.onCommitEdit('Post-publish edit');
            assert.equal(first.ui.state.dirtyCount, 1);
            first.session.destroy();

            // re-enter: the server now serves the published theme, and the
            // draft keyed against it is found
            const second = await bootSession({api: first.api, draftStore});
            assert.equal(second.ui.state.dirtyCount, 1);
            assert.match(second.dom.window.document.querySelector('h1').textContent, /Post-publish edit/);
        });
    });
});
