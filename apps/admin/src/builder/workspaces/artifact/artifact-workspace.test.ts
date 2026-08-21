import {describe, expect, it, vi} from 'vitest';

import {ArtifactWorkspace} from './artifact-workspace';
import {createArtifactDraft} from './artifact-state';

import type {ArtifactDraft, ArtifactPayload} from './artifact-state';
import type {BuilderSelectionContext, ValidationResult} from '@/builder/core/workspace';

class FakeArtifactPreview {
    readonly kind = 'artifact';
    draft: ArtifactDraft | null = null;
    renderCalls: ArtifactDraft[] = [];
    inspection = {url: 'https://artifact.builder.invalid/', title: 'Artifact', viewport: {width: 800, height: 600, scrollX: 0, scrollY: 0}, text: 'Preview', outline: [], truncated: {outline: false, text: false, source: false}};
    selection: BuilderSelectionContext | null = null;

    start(draft: ArtifactDraft): Promise<ValidationResult> {
        this.draft = structuredClone(draft);
        return Promise.resolve({valid: true, diagnostics: [], revision: draft.revision});
    }

    renderCandidate(draft: ArtifactDraft): Promise<ValidationResult> {
        this.renderCalls.push(structuredClone(draft));
        this.draft = structuredClone(draft);
        return Promise.resolve({valid: true, diagnostics: [], revision: draft.revision});
    }

    restoreDraft(draft: ArtifactDraft): Promise<ValidationResult> {
        this.draft = structuredClone(draft);
        this.selection = draft.selection;
        return Promise.resolve({valid: true, diagnostics: [], revision: draft.revision});
    }

    inspectPage() {
        return Promise.resolve(this.inspection);
    }

    inspectElement(target: Record<string, unknown>) {
        return Promise.resolve({tag: 'h1', role: 'heading', accessibleName: 'Revenue', text: 'Revenue', attributes: {}, styles: {}, source: null, box: {x: 0, y: 0, width: 100, height: 40}, truncated: {text: false, source: false}, target});
    }

    screenshot() {
        return Promise.resolve({dataUrl: 'data:image/png;base64,AA==', width: 800, height: 600, warnings: []});
    }

    getSelectionContext() {
        return this.selection;
    }

    clearSelection() {
        this.selection = null;
        return Promise.resolve();
    }

    flush() {
        return Promise.resolve();
    }
}

async function initialDraft() {
    return createArtifactDraft({
        id: 'artifact-1',
        artifactVersion: 1,
        title: 'Revenue chart',
        description: '',
        html: '<!doctype html><html><head><title>Revenue chart</title></head><body><h1>Revenue</h1></body></html>'
    });
}

describe('ArtifactWorkspace', () => {
    it('automatically rerenders HTML mutations, promotes successful work, and saves the complete payload', async () => {
        const preview = new FakeArtifactPreview();
        const save = vi.fn<(payload: ArtifactPayload, signal: AbortSignal) => Promise<void>>(() => Promise.resolve());
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview, save});
        await workspace.load(new AbortController().signal);
        const revision = workspace.state.revision;
        const write = workspace.getTools().find(tool => tool.name === 'replace_in_html');

        const result = await write?.execute({revision, oldText: '<h1>Revenue</h1>', newText: '<h1>Revenue by region</h1>'}, new AbortController().signal);

        expect(result).toMatchObject({ok: true, data: {render: {valid: true}}});
        expect(preview.renderCalls.at(-1)?.html).toContain('Revenue by region');
        expect(workspace.state.dirty).toBe(true);

        await workspace.promoteCandidate(new AbortController().signal);
        expect(workspace.hasPromotedChanges).toBe(true);
        await workspace.publish(new AbortController().signal);

        expect(save).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toMatchObject({id: 'artifact-1', artifactVersion: 1, title: 'Revenue chart'});
        expect(save.mock.calls[0]?.[0].html).toContain('Revenue by region');
        expect(save.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
        expect(workspace.state.dirty).toBe(false);
        expect(workspace.hasPromotedChanges).toBe(false);
    });

    it('restores promoted and interrupted candidate state together at a checkpoint', async () => {
        const preview = new FakeArtifactPreview();
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview});
        await workspace.load(new AbortController().signal);
        const write = workspace.getTools().find(tool => tool.name === 'write_html');
        await write?.execute({revision: workspace.state.revision, html: '<!doctype html><html><head><title>First candidate</title></head><body>First candidate</body></html>'}, new AbortController().signal);
        const checkpoint = workspace.checkpointSnapshot();
        await write?.execute({revision: workspace.state.revision, html: '<!doctype html><html><head><title>Second candidate</title></head><body>Second candidate</body></html>'}, new AbortController().signal);

        await workspace.restore(checkpoint);

        expect(workspace.draft.html).toContain('<h1>Revenue</h1>');
        expect(workspace.hasCandidate).toBe(true);
        expect(workspace.candidateDraft?.html).toContain('First candidate');
        expect(preview.draft?.html).toContain('First candidate');
    });

    it('saves only promoted work while an interrupted candidate remains recoverable', async () => {
        const preview = new FakeArtifactPreview();
        const save = vi.fn<(payload: ArtifactPayload, signal: AbortSignal) => Promise<void>>(() => Promise.resolve());
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview, save});
        await workspace.load(new AbortController().signal);
        const write = workspace.getTools().find(tool => tool.name === 'write_html');
        await write?.execute({revision: workspace.state.revision, html: '<!doctype html><html><head><title>Interrupted</title></head><body>Interrupted candidate</body></html>'}, new AbortController().signal);

        expect(workspace.hasPromotedChanges).toBe(false);

        await workspace.publish(new AbortController().signal);

        expect(save.mock.calls[0]?.[0].html).toContain('<h1>Revenue</h1>');
        expect(workspace.candidateDraft?.html).toContain('Interrupted candidate');
        expect(workspace.state.dirty).toBe(true);
    });

    it('retains promoted dirty state when an interrupted candidate matches the baseline', async () => {
        const preview = new FakeArtifactPreview();
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview});
        await workspace.load(new AbortController().signal);
        const baselineHtml = workspace.draft.html;
        const write = workspace.getTools().find(tool => tool.name === 'write_html');
        await write?.execute({revision: workspace.state.revision, html: '<!doctype html><html><head><title>Promoted</title></head><body>Promoted</body></html>'}, new AbortController().signal);
        await workspace.promoteCandidate(new AbortController().signal);
        await write?.execute({revision: workspace.state.revision, html: baselineHtml}, new AbortController().signal);

        expect(workspace.state.dirty).toBe(false);
        expect(workspace.hasPromotedChanges).toBe(true);
    });

    it('does not report a successful save when the editor bridge is unavailable', async () => {
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview: new FakeArtifactPreview()});
        await workspace.load(new AbortController().signal);

        await expect(workspace.publish(new AbortController().signal)).resolves.toMatchObject({
            ok: false,
            error: {code: 'artifact_save_unavailable'}
        });
    });

    it('rejects malformed card payloads at the workspace ingress boundary', async () => {
        const malformed: ArtifactDraft = {id: 'artifact-1', artifactVersion: 1, title: 'Broken', description: '', html: '<div>fragment</div>', revision: 'artifact-invalid', selection: null};
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: () => Promise.resolve(malformed), preview: new FakeArtifactPreview()});

        await expect(workspace.load(new AbortController().signal)).rejects.toThrow('complete HTML document');
    });

    it('exposes one inspect tool, screenshots, and no theme navigation or file tools', async () => {
        const preview = new FakeArtifactPreview();
        const workspace = new ArtifactWorkspace({id: 'artifact-1', title: 'Artifact Builder', load: initialDraft, preview});
        await workspace.load(new AbortController().signal);

        const tools = workspace.getTools();
        expect(tools.map(tool => tool.name)).toEqual(['read_html', 'find_in_html', 'replace_in_html', 'write_html', 'inspect', 'screenshot']);
        await expect(tools.find(tool => tool.name === 'inspect')?.execute({}, new AbortController().signal)).resolves.toMatchObject({ok: true, data: {title: 'Artifact'}});
        await expect(tools.find(tool => tool.name === 'inspect')?.execute({selector: 'h1'}, new AbortController().signal)).resolves.toMatchObject({ok: true, data: {tag: 'h1'}});
        await expect(tools.find(tool => tool.name === 'screenshot')?.execute({kind: 'viewport'}, new AbortController().signal)).resolves.toMatchObject({ok: true, attachments: [{type: 'image', mediaType: 'image/png', data: 'AA=='}]});
    });
});
