import JSZip from 'jszip';
import {describe, expect, it, vi} from 'vitest';

import {loadThemeDraft} from './theme-loader';
import {withThemeRevision} from './theme-state';
import {ThemeWorkspace} from './theme-workspace';

import type {ThemeLoadInput} from './theme-loader';
import type {ThemeDraft} from './theme-state';

async function loadInput(): Promise<ThemeLoadInput> {
    const zip = new JSZip();
    zip.file('demo/package.json', JSON.stringify({name: 'demo', version: '1.0.0'}));
    zip.file('demo/index.hbs', '<main>Initial</main>');
    zip.file('demo/assets/logo.png', new Uint8Array([1, 2, 3]), {binary: true});
    return {
        theme: {name: 'demo', builtIn: false},
        archive: await zip.generateAsync({type: 'arraybuffer'}),
        settings: [{key: 'accent_color', value: '#000000'}],
        customSettings: [{id: 'layout', key: 'layout', type: 'select', value: 'List', default: 'List', options: ['List', 'Grid']}],
        site: {url: 'https://example.com/', contentApiKey: 'content-key', liveHtml: '<html></html>'},
        virtualUrl: 'https://example.com/'
    };
}

describe('ThemeWorkspace', () => {
    it('loads an immutable draft and publishes only through its injected adapter', async () => {
        const source = await loadInput();
        const publisher = vi.fn((draft: ThemeDraft) => Promise.resolve({ok: true as const, revision: draft.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'},
            publish: publisher
        });
        const states: string[] = [];
        workspace.subscribe(state => states.push(`${state.revision}:${String(state.dirty)}`));

        await workspace.load(new AbortController().signal);
        const snapshot = workspace.snapshot();
        (snapshot.payload as ThemeDraft).files['index.hbs'].content = 'mutated outside';

        expect(workspace.draft.files['index.hbs'].content).toBe('<main>Initial</main>');
        expect(workspace.getTools()).toEqual([]);
        expect(workspace.getPreview()).toEqual({kind: 'theme'});
        expect(workspace.getSelectionContext()).toBeNull();
        expect(states.at(-1)).toMatch(/^theme-[a-f0-9]{64}:false$/);

        const published = await workspace.publish(new AbortController().signal);
        expect(published).toEqual({ok: true, revision: workspace.draft.revision});
        expect(publisher).toHaveBeenCalledOnce();
    });

    it('atomically adopts a changed draft returned by a successful publish', async () => {
        const source = await loadInput();
        const loaded = await loadThemeDraft(source);
        const publishedDraft = await withThemeRevision({
            ...loaded,
            theme: {...loaded.theme, name: 'demo-edited', builtIn: false}
        });
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: () => Promise.resolve(loaded),
            preview: {kind: 'theme'},
            publish: () => Promise.resolve({ok: true as const, revision: publishedDraft.revision, draft: publishedDraft})
        });
        await workspace.load(new AbortController().signal);

        const result = await workspace.publish(new AbortController().signal);

        expect(result).toMatchObject({ok: true, revision: publishedDraft.revision});
        expect(workspace.draft.theme).toMatchObject({name: 'demo-edited', builtIn: false});
        expect(workspace.snapshot().revision).toBe(publishedDraft.revision);
    });

    it('restores files, settings, virtual URL, and selection from an opaque snapshot', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        await workspace.load(new AbortController().signal);
        let stateDirty = false;
        workspace.subscribe(state => stateDirty = state.dirty);
        const next = structuredClone(workspace.draft);
        next.files['index.hbs'].content = '<main>Restored</main>';
        next.globalSettings.accent_color = '#123456';
        next.virtualUrl = 'https://example.com/about/';
        next.selection = {id: 'index.hbs:1:1', label: 'Main'};
        const revised = await withThemeRevision(next);

        const validation = await workspace.restore({revision: revised.revision, payload: revised});

        expect(validation).toEqual({valid: true, diagnostics: [], revision: revised.revision});
        expect(workspace.draft).toMatchObject({
            revision: revised.revision,
            globalSettings: {accent_color: '#123456'},
            virtualUrl: 'https://example.com/about/',
            selection: {id: 'index.hbs:1:1'}
        });
        expect(workspace.draft.files['index.hbs'].content).toBe('<main>Restored</main>');
        expect(Array.from(workspace.draft.files['assets/logo.png'].binary ?? [])).toEqual([1, 2, 3]);
        expect(stateDirty).toBe(true);
    });

    it('does not mark preview-only navigation and selection changes as publishable edits', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        await workspace.load(new AbortController().signal);
        const previewOnly = structuredClone(workspace.draft);
        previewOnly.virtualUrl = 'https://example.com/about/';
        previewOnly.selection = {id: 'index.hbs:1:1', label: 'Main'};
        const revised = await withThemeRevision(previewOnly);
        let stateDirty = true;
        workspace.subscribe(state => stateDirty = state.dirty);

        await workspace.restore({revision: revised.revision, payload: revised});

        expect(stateDirty).toBe(false);
    });

    it('rejects a tampered snapshot without replacing the current draft', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.snapshot();
        const tampered = structuredClone(before.payload as ThemeDraft);
        tampered.files['index.hbs'].content = '<main>Tampered</main>';

        const validation = await workspace.restore({revision: before.revision, payload: tampered});

        expect(validation).toMatchObject({valid: false, diagnostics: [{code: 'snapshot_revision_mismatch'}]});
        expect(workspace.snapshot()).toEqual(before);
    });

    it('returns validation diagnostics for a malformed opaque snapshot', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.snapshot();
        const malformed = structuredClone(before.payload as ThemeDraft);
        malformed.files['index.hbs'] = null as unknown as ThemeDraft['files'][string];

        const validation = await workspace.restore({revision: before.revision, payload: malformed});

        expect(validation).toMatchObject({valid: false, diagnostics: [{code: 'snapshot_invalid'}]});
        expect(workspace.snapshot()).toEqual(before);
    });

    it('honors abort before loading or promoting', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        const loadController = new AbortController();
        loadController.abort();
        await expect(workspace.load(loadController.signal)).rejects.toMatchObject({name: 'AbortError'});

        await workspace.load(new AbortController().signal);
        const promoteController = new AbortController();
        promoteController.abort();
        await expect(workspace.promoteCandidate(promoteController.signal)).rejects.toMatchObject({name: 'AbortError'});
    });
});
