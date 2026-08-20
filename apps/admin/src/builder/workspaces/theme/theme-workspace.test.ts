import JSZip from 'jszip';
import {describe, expect, it, vi} from 'vitest';

import {loadThemeDraft} from './theme-loader';
import {withThemeRevision} from './theme-state';
import {ThemeWorkspace} from './theme-workspace';
import {PreviewInspectionError} from './preview/preview-inspection';

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
        expect(workspace.getTools().map(tool => tool.name)).toEqual([
            'list_files',
            'search_files',
            'read_file',
            'replace_in_file',
            'write_file',
            'delete_file',
            'list_design_settings',
            'update_design_settings',
            'inspect_page',
            'inspect_element',
            'navigate',
            'screenshot'
        ]);
        expect(workspace.getTools().map(tool => tool.name)).not.toEqual(expect.arrayContaining(['preview', 'apply', 'commit']));
        expect(workspace.getPreview()).toEqual({kind: 'theme'});
        expect(workspace.getSelectionContext()).toBeNull();
        expect(states.at(-1)).toMatch(/^theme-[a-f0-9]{64}:false$/);

        const published = await workspace.publish(new AbortController().signal);
        expect(published).toEqual({ok: true, revision: workspace.draft.revision});
        expect(publisher).toHaveBeenCalledOnce();
    });

    it('exposes structured preview inspection, navigation, and screenshot tools', async () => {
        const source = await loadInput();
        const inspectPage = vi.fn(() => Promise.resolve({
            url: 'https://example.com/',
            title: 'Demo',
            viewport: {width: 1200, height: 800, scrollX: 0, scrollY: 0},
            outline: [],
            text: 'Demo',
            truncated: {outline: false, text: false, source: false},
            diagnostics: [],
            diagnosticsTruncated: false
        }));
        const inspectElement = vi.fn(() => Promise.resolve({
            tag: 'main',
            role: 'main',
            accessibleName: 'Demo',
            attributes: {'data-edit': 'index.hbs:1:1'},
            box: {x: 0, y: 0, width: 1200, height: 800},
            styles: {display: 'block'},
            text: 'Demo',
            source: {path: 'index.hbs', line: 1, column: 1},
            truncated: {text: false, source: false}
        }));
        const navigate = vi.fn(() => Promise.resolve({kind: 'virtual' as const, url: 'https://example.com/about/', status: 200}));
        const screenshot = vi.fn(() => Promise.resolve({dataUrl: 'data:image/png;base64,AA==', width: 1200, height: 800, warnings: []}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', inspectPage, inspectElement, navigate, screenshot}
        });
        await workspace.load(new AbortController().signal);
        const tools = Object.fromEntries(workspace.getTools().map(tool => [tool.name, tool]));
        const signal = new AbortController().signal;

        const page = await tools.inspect_page.execute({}, signal);
        const element = await tools.inspect_element.execute({marker: 'index.hbs:1:1'}, signal);
        const navigation = await tools.navigate.execute({url: '/about/'}, signal);
        const image = await tools.screenshot.execute({kind: 'element', marker: 'index.hbs:1:1'}, signal);

        expect(page).toMatchObject({ok: true, data: {url: 'https://example.com/', title: 'Demo'}});
        expect(element).toMatchObject({ok: true, data: {tag: 'main', source: {path: 'index.hbs'}}});
        expect(navigation).toMatchObject({ok: true, data: {url: 'https://example.com/about/', status: 200}});
        expect(image).toMatchObject({ok: true, data: {width: 1200, height: 800, warnings: []}, attachments: [{type: 'image', mediaType: 'image/png', data: 'AA=='}]});
        expect(inspectElement).toHaveBeenCalledWith({marker: 'index.hbs:1:1'}, signal);
        expect(navigate).toHaveBeenCalledWith('/about/', signal);
        expect(screenshot).toHaveBeenCalledWith({kind: 'element', marker: 'index.hbs:1:1'}, signal);
    });

    it('returns stable preview tool errors for missing elements and blocked navigation', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {
                kind: 'theme',
                inspectElement: () => Promise.reject(new PreviewInspectionError('preview_element_not_found', 'No matching source marker.')),
                navigate: url => Promise.resolve({
                    kind: 'failed' as const,
                    url,
                    diagnostics: [{code: 'preview_navigation_blocked', message: 'Agent navigation must stay on this site.', severity: 'error' as const}]
                })
            }
        });
        await workspace.load(new AbortController().signal);
        const tools = Object.fromEntries(workspace.getTools().map(tool => [tool.name, tool]));

        const missing = await tools.inspect_element.execute({marker: 'missing.hbs:1:1'}, new AbortController().signal);
        const external = await tools.navigate.execute({url: 'https://outside.example/'}, new AbortController().signal);
        const invalidImage = await tools.screenshot.execute({kind: 'video'}, new AbortController().signal);

        expect(missing).toMatchObject({ok: false, error: {code: 'preview_element_not_found', retryable: false}});
        expect(external).toMatchObject({ok: false, error: {code: 'preview_navigation_blocked', retryable: false}});
        expect(invalidImage).toMatchObject({ok: false, error: {code: 'invalid_screenshot_request', retryable: false}});
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

    it('does not replace a normalized published draft with the stale preview', async () => {
        const source = await loadInput();
        const loaded = await loadThemeDraft(source);
        const stalePreview = structuredClone(loaded);
        const publishedDraft = await withThemeRevision({
            ...loaded,
            files: {
                ...loaded.files,
                'index.hbs': {
                    ...loaded.files['index.hbs'],
                    content: '<main>Server normalized</main>'
                }
            }
        });
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: () => Promise.resolve(loaded),
            preview: {
                kind: 'theme',
                get draft() {
                    return structuredClone(stalePreview);
                }
            },
            publish: () => Promise.resolve({ok: true as const, revision: publishedDraft.revision, draft: publishedDraft})
        });
        await workspace.load(new AbortController().signal);

        await workspace.publish(new AbortController().signal);
        const snapshot = workspace.snapshot();

        expect(snapshot.revision).toBe(publishedDraft.revision);
        expect((snapshot.payload as ThemeDraft).files['index.hbs'].content).toBe('<main>Server normalized</main>');
        expect(workspace.draft.revision).toBe(publishedDraft.revision);
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

    it('adopts a file mutation only after the preview validates it', async () => {
        const source = await loadInput();
        const renderCandidate = vi.fn((candidate: ThemeDraft) => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.draft;
        const write = workspace.getTools().find(tool => tool.name === 'write_file');

        const result = await write?.execute({revision: before.revision, path: 'partials/card.hbs', content: '<article>Card</article>'}, new AbortController().signal);

        expect(result).toMatchObject({ok: true, data: {path: 'partials/card.hbs', created: true, render: {valid: true}}});
        expect(renderCandidate).toHaveBeenCalledOnce();
        expect(workspace.draft.files['partials/card.hbs']).toBeUndefined();
        expect(workspace.candidateDraft?.files['partials/card.hbs'].content).toBe('<article>Card</article>');
        await workspace.promoteCandidate(new AbortController().signal);
        expect(workspace.draft.files['partials/card.hbs'].content).toBe('<article>Card</article>');
        expect(workspace.draft.revision).toBe(result?.revision);
    });

    it('keeps the last valid draft when rendering a file mutation fails', async () => {
        const source = await loadInput();
        const renderCandidate = vi.fn((candidate: ThemeDraft) => Promise.resolve({
            valid: false,
            diagnostics: [{code: 'parse_error', message: 'Invalid template', severity: 'error' as const}],
            revision: candidate.revision
        }));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.snapshot();
        const replace = workspace.getTools().find(tool => tool.name === 'replace_in_file');

        const result = await replace?.execute({revision: before.revision, path: 'index.hbs', oldText: 'Initial', newText: '{{#if}}'}, new AbortController().signal);

        expect(result).toMatchObject({ok: false, revision: before.revision, error: {code: 'render_invalid', details: {diagnostics: [{code: 'parse_error'}]}}});
        expect(workspace.snapshot()).toEqual(before);
    });

    it('validates design-setting mutations through the same candidate path', async () => {
        const source = await loadInput();
        const renderCandidate = vi.fn((candidate: ThemeDraft) => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.draft;
        const update = workspace.getTools().find(tool => tool.name === 'update_design_settings');

        const result = await update?.execute({revision: before.revision, values: {'global.accent_color': '#AABBCC', 'theme.layout': 'Grid'}}, new AbortController().signal);

        expect(result).toMatchObject({ok: true, data: {updated: ['global.accent_color', 'theme.layout'], render: {valid: true}}});
        expect(workspace.draft.globalSettings.accent_color).toBe('#000000');
        expect(workspace.candidateDraft?.globalSettings.accent_color).toBe('#AABBCC');
        expect(workspace.candidateDraft?.customSettings.layout.value).toBe('Grid');
        expect(renderCandidate).toHaveBeenCalledOnce();
    });

    it('rejects mutations when preview validation is unavailable', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme'}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.draft;
        const remove = workspace.getTools().find(tool => tool.name === 'delete_file');

        const result = await remove?.execute({revision: before.revision, path: 'index.hbs'}, new AbortController().signal);

        expect(result).toMatchObject({ok: false, revision: before.revision, error: {code: 'preview_unavailable'}});
        expect(workspace.draft).toEqual(before);
    });

    it('returns a typed preview failure without adopting the candidate', async () => {
        const source = await loadInput();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate: () => Promise.reject(new Error('worker disconnected'))}
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.snapshot();
        const write = workspace.getTools().find(tool => tool.name === 'write_file');

        const result = await write?.execute({revision: before.revision, path: 'new.hbs', content: 'New'}, new AbortController().signal);

        expect(result).toMatchObject({ok: false, revision: before.revision, error: {code: 'preview_failed', retryable: true}});
        expect(workspace.snapshot()).toEqual(before);
    });

    it('retains a candidate validated just before the caller stops', async () => {
        const source = await loadInput();
        const controller = new AbortController();
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {
                kind: 'theme',
                renderCandidate: (candidate: ThemeDraft) => {
                    controller.abort();
                    return Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision});
                }
            }
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.draft;
        const write = workspace.getTools().find(tool => tool.name === 'write_file');

        const result = await write?.execute({revision: before.revision, path: 'new.hbs', content: 'New'}, controller.signal);

        expect(result).toMatchObject({ok: true});
        expect(workspace.draft.files['new.hbs']).toBeUndefined();
        expect(workspace.candidateDraft?.files['new.hbs'].content).toBe('New');
    });

    it('publishes only the promoted draft while retaining an interrupted candidate', async () => {
        const source = await loadInput();
        const publish = vi.fn((draft: ThemeDraft) => Promise.resolve({ok: true as const, revision: draft.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate: candidate => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision})},
            publish
        });
        await workspace.load(new AbortController().signal);
        const promoted = workspace.draft;
        const write = workspace.getTools().find(tool => tool.name === 'write_file');
        await write?.execute({revision: promoted.revision, path: 'new.hbs', content: 'New'}, new AbortController().signal);

        const result = await workspace.publish(new AbortController().signal);

        expect(result).toEqual({ok: true, revision: promoted.revision});
        expect(publish).toHaveBeenCalledWith(expect.objectContaining({revision: promoted.revision}), expect.any(AbortSignal));
        expect(workspace.draft.files['new.hbs']).toBeUndefined();
        expect(workspace.candidateDraft?.files['new.hbs'].content).toBe('New');
    });

    it('restores the visible preview before atomically adopting a checkpoint', async () => {
        const source = await loadInput();
        const renderCandidate = vi.fn((candidate: ThemeDraft) => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}));
        const restoreDraft = vi.fn((candidate: ThemeDraft) => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {kind: 'theme', renderCandidate, restoreDraft}
        });
        await workspace.load(new AbortController().signal);
        const checkpoint = workspace.snapshot();
        const write = workspace.getTools().find(tool => tool.name === 'write_file');
        await write?.execute({revision: checkpoint.revision, path: 'new.hbs', content: 'New'}, new AbortController().signal);
        await workspace.promoteCandidate(new AbortController().signal);
        restoreDraft.mockClear();

        const validation = await workspace.restore(checkpoint);

        expect(validation).toMatchObject({valid: true, revision: checkpoint.revision});
        expect(restoreDraft).toHaveBeenCalledWith(expect.objectContaining({revision: checkpoint.revision, virtualUrl: 'https://example.com/'}), expect.any(AbortSignal));
        expect(workspace.draft.files['new.hbs']).toBeUndefined();
        expect(workspace.candidateDraft).toBeNull();
    });

    it('rebases an interrupted candidate onto a copied theme after publishing', async () => {
        const source = await loadInput();
        source.theme.builtIn = true;
        let previewDraft: ThemeDraft | null = null;
        const rebaseDraft = vi.fn((draft: ThemeDraft) => {
            if (previewDraft && (draft.virtualUrl !== previewDraft.virtualUrl || draft.selection?.id !== previewDraft.selection?.id)) {
                throw new Error('Preview-only state was not synchronized');
            }
            previewDraft = structuredClone(draft);
        });
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {
                kind: 'theme',
                get draft() {
                    if (!previewDraft) {
                        throw new Error('Preview not started');
                    }
                    return structuredClone(previewDraft);
                },
                renderCandidate: (candidate) => {
                    previewDraft = structuredClone(candidate);
                    return Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision});
                },
                rebaseDraft
            },
            publish: async (draft) => {
                const published = await withThemeRevision({...draft, theme: {...draft.theme, name: 'demo-edited', builtIn: false}});
                return {ok: true, revision: published.revision, draft: published};
            }
        });
        await workspace.load(new AbortController().signal);
        const before = workspace.draft;
        const write = workspace.getTools().find(tool => tool.name === 'write_file');
        await write?.execute({revision: before.revision, path: 'new.hbs', content: 'New'}, new AbortController().signal);
        const renderedCandidate = workspace.candidateDraft;
        if (!renderedCandidate) {
            throw new Error('Expected the candidate preview');
        }
        previewDraft = await withThemeRevision({
            ...renderedCandidate,
            virtualUrl: 'https://example.com/about/',
            selection: {id: 'index.hbs:1:1', label: 'Main heading'}
        });

        await workspace.publish(new AbortController().signal);

        expect(workspace.draft.theme).toMatchObject({name: 'demo-edited', builtIn: false});
        expect(workspace.candidateDraft?.theme).toMatchObject({name: 'demo-edited', builtIn: false});
        expect(workspace.candidateDraft).toMatchObject({virtualUrl: 'https://example.com/about/', selection: {id: 'index.hbs:1:1'}});
        expect(rebaseDraft).toHaveBeenCalledWith(expect.objectContaining({revision: workspace.candidateDraft?.revision}));
        let stateRevision = '';
        let validationRevision = '';
        workspace.subscribe((state) => {
            stateRevision = state.revision;
            validationRevision = state.validation?.revision ?? '';
        })();
        expect(validationRevision).toBe(stateRevision);
        await workspace.promoteCandidate(new AbortController().signal);
        expect(workspace.draft.theme).toMatchObject({name: 'demo-edited', builtIn: false});
        expect(workspace.draft.files['new.hbs'].content).toBe('New');
    });

    it('checkpoints and restores the visible candidate at the start of a continuation turn', async () => {
        const source = await loadInput();
        const restoreDraft = vi.fn((candidate: ThemeDraft) => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}));
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview: {
                kind: 'theme',
                renderCandidate: candidate => Promise.resolve({valid: true, diagnostics: [], revision: candidate.revision}),
                restoreDraft
            }
        });
        await workspace.load(new AbortController().signal);
        const promoted = workspace.draft;
        const write = workspace.getTools().find(tool => tool.name === 'write_file');
        await write?.execute({revision: promoted.revision, path: 'interrupted.hbs', content: 'Keep me'}, new AbortController().signal);
        const checkpoint = workspace.checkpointSnapshot();
        await workspace.promoteCandidate(new AbortController().signal);
        await write?.execute({revision: workspace.draft.revision, path: 'later.hbs', content: 'Discard me'}, new AbortController().signal);
        await workspace.promoteCandidate(new AbortController().signal);

        await workspace.restore(checkpoint);

        expect(workspace.draft.files['interrupted.hbs']).toBeUndefined();
        expect(workspace.candidateDraft?.files['interrupted.hbs'].content).toBe('Keep me');
        expect(workspace.candidateDraft?.files['later.hbs']).toBeUndefined();
        expect(restoreDraft).toHaveBeenCalledWith(expect.objectContaining({revision: checkpoint.revision}), expect.any(AbortSignal));
    });

    it('synchronizes preview-only navigation and selection into the next checkpoint', async () => {
        const source = await loadInput();
        let previewDraft: ThemeDraft | null = null;
        const preview = {
            kind: 'theme',
            get draft() {
                if (!previewDraft) {
                    throw new Error('Preview not started');
                }
                return structuredClone(previewDraft);
            }
        };
        const workspace = new ThemeWorkspace({
            id: 'theme:demo',
            title: 'Demo',
            load: signal => loadThemeDraft(source, signal),
            preview
        });
        await workspace.load(new AbortController().signal);
        previewDraft = await withThemeRevision({
            ...workspace.draft,
            virtualUrl: 'https://example.com/about/',
            selection: {id: 'index.hbs:1:1', label: 'Main heading'}
        });

        const checkpoint = workspace.checkpointSnapshot();
        const payload = checkpoint.payload as {promoted: ThemeDraft; candidate: ThemeDraft | null};

        expect(checkpoint.revision).toBe(previewDraft.revision);
        expect(payload.promoted).toMatchObject({
            virtualUrl: 'https://example.com/about/',
            selection: {id: 'index.hbs:1:1'}
        });
        expect(payload.candidate).toBeNull();
    });
});
