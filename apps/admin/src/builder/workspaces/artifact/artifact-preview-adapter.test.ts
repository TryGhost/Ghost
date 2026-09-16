import { describe, expect, it, vi } from 'vitest';

import { ArtifactPreviewAdapter, createIframeArtifactPreview } from './artifact-preview-adapter';
import { createArtifactDraft, withArtifactSelection } from './artifact-state';
import { createPreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';

import type { BuilderSelectionContext } from '@/builder/core/workspace';
import type {
  PreviewDocument,
  PreviewDocumentSurface,
} from '@/builder/workspaces/theme/preview/preview-document';

class FakeSurface implements PreviewDocumentSurface {
  documents: PreviewDocument[] = [];
  interactionModes: string[] = [];
  failNext = false;
  remappedSelection: BuilderSelectionContext | null | undefined;
  selectionHandler: (selection: BuilderSelectionContext | null) => void = () => {};

  replaceDocument(
    document: PreviewDocument,
    selection: BuilderSelectionContext | null,
  ): Promise<BuilderSelectionContext | null> {
    this.documents.push(structuredClone(document));
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('Document failed'));
    }
    return Promise.resolve(
      this.remappedSelection === undefined ? selection : this.remappedSelection,
    );
  }

  inspectPage(url: string) {
    return Promise.resolve({
      url,
      title: 'Artifact',
      viewport: { width: 800, height: 600, scrollX: 0, scrollY: 0 },
      outline: [],
      text: 'Artifact',
      truncated: { outline: false, text: false, source: false },
    });
  }

  inspectElement() {
    return Promise.resolve({
      tag: 'h1',
      role: 'heading',
      accessibleName: 'Artifact',
      attributes: {},
      box: { x: 0, y: 0, width: 100, height: 40 },
      styles: {},
      text: 'Artifact',
      source: null,
      truncated: { text: false, source: false },
    });
  }

  screenshot() {
    return Promise.resolve({
      dataUrl: 'data:image/png;base64,AA==',
      width: 800,
      height: 600,
      warnings: [],
    });
  }

  setInteractionMode(mode: 'browse' | 'select' | 'edit') {
    this.interactionModes.push(mode);
    return Promise.resolve();
  }

  openExternal = vi.fn();
  onNavigate(handler: (url: string) => void) {
    this.navigate = handler;
    return () => {};
  }
  navigate: (url: string) => void = () => {};
  onSelection(handler: (selection: BuilderSelectionContext | null) => void) {
    this.selectionHandler = handler;
    return () => {};
  }
  onDiagnostic() {
    return () => {};
  }
  destroy() {}
}

async function draft(
  html = '<!doctype html><html><head><title>Artifact</title></head><body><main><h1 id="title">Artifact</h1></main></body></html>',
) {
  return createArtifactDraft({
    id: 'artifact-1',
    artifactVersion: 1,
    title: 'Artifact',
    description: '',
    html,
  });
}

describe('ArtifactPreviewAdapter', () => {
  it('creates an opaque iframe sandbox that allows scripts and forms without same-origin access', () => {
    const iframe = document.createElement('iframe');
    const preview = createIframeArtifactPreview(iframe);

    expect(iframe.getAttribute('sandbox')).toBe('allow-forms allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');

    preview.destroy();
  });

  it('preserves authored document policy that must also apply after Save', () => {
    const html =
      '<!doctype html><html><head><base href="https://cdn.example.com/widgets/"><meta http-equiv="content-security-policy" content="default-src https:"><meta http-equiv="refresh" content="60"><script src="https://example.com/ghost/assets/portal.min.js"></script></head><body></body></html>';
    const srcdoc = createPreviewDocument(
      { revision: 'revision', url: 'https://artifact.builder.invalid/', html },
      'channel',
      null,
      'revision',
      () => null,
      false,
      {},
      false,
      true,
      true,
    );
    const parsed = new DOMParser().parseFromString(srcdoc, 'text/html');

    expect(parsed.querySelector('base')?.href).toBe('https://cdn.example.com/widgets/');
    expect(parsed.querySelectorAll('meta[http-equiv]').length).toBe(1);
    expect(parsed.querySelector('meta[http-equiv]')?.getAttribute('http-equiv')).toBe(
      'content-security-policy',
    );
    expect(parsed.querySelector('script[src]')?.getAttribute('src')).toBe(
      'https://example.com/ghost/assets/portal.min.js',
    );
  });

  it('passes the portable HTML document through without fake source-line markers', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    const initial = await draft();

    await preview.start(initial, new AbortController().signal);

    expect(surface.documents[0]?.url).toBe('https://artifact.builder.invalid/');
    expect(surface.documents[0]?.html).toBe(initial.html);
    expect(surface.documents[0]?.html).not.toContain('data-edit=');
    expect(preview.draft.html).toBe(initial.html);
  });

  it('opens only HTTP or HTTPS links emitted from the artifact preview', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    await preview.start(await draft(), new AbortController().signal);

    surface.navigate('javascript:alert(1)');
    surface.navigate('https://example.com/result');

    expect(surface.openExternal).toHaveBeenCalledOnce();
    expect(surface.openExternal).toHaveBeenCalledWith('https://example.com/result');
    expect(preview.state.diagnostics).toEqual([
      expect.objectContaining({ code: 'artifact_link_protocol_blocked' }),
    ]);
  });

  it('adopts selected context into its revision-bearing draft and delegates Browse/Select modes', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    const initial = await draft();
    await preview.start(initial, new AbortController().signal);
    const selection = { id: 'artifact.html:2:1', label: 'Artifact', data: { tagName: 'h1' } };

    surface.selectionHandler(selection);
    await preview.flush(new AbortController().signal);
    await preview.setInteractionMode('select', new AbortController().signal);

    expect(preview.draft.selection).toEqual(selection);
    expect(preview.draft.revision).not.toBe(initial.revision);
    expect(surface.interactionModes).toEqual(['select']);
  });

  it('restores the last valid document when a candidate fails to load', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    const initial = await draft();
    const changed = await draft(
      '<!doctype html><html><head><title>Changed</title></head><body>Changed</body></html>',
    );
    await preview.start(initial, new AbortController().signal);
    surface.failNext = true;

    const result = await preview.renderCandidate(changed, new AbortController().signal);

    expect(result).toMatchObject({
      valid: false,
      diagnostics: [{ code: 'artifact_render_failed' }],
    });
    expect(surface.documents.at(-1)?.html).toContain('Artifact</h1>');
    expect(preview.draft.html).toBe(initial.html);
  });

  it('preserves checkpoint selection context when runtime content changes but the marker still remaps', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    const selection = { id: 'artifact.html:2:1', label: 'Count 1', data: { tagName: 'button' } };
    const checkpoint = await withArtifactSelection(await draft(), selection);
    await preview.start(checkpoint, new AbortController().signal);
    surface.remappedSelection = null;

    const result = await preview.restoreDraft(checkpoint, new AbortController().signal);

    expect(result).toMatchObject({ valid: true, revision: checkpoint.revision });
    expect(preview.draft.selection).toEqual(selection);
  });

  it('does not run queued preview work after teardown', async () => {
    const surface = new FakeSurface();
    const preview = new ArtifactPreviewAdapter({ surface });
    await preview.start(await draft(), new AbortController().signal);
    let releaseInspection: (() => void) | undefined;
    surface.inspectPage = vi.fn(
      (_url: string) =>
        new Promise<Awaited<ReturnType<FakeSurface['inspectPage']>>>((resolve) => {
          releaseInspection = () =>
            resolve({
              url: 'https://artifact.builder.invalid/',
              title: 'Artifact',
              viewport: { width: 800, height: 600, scrollX: 0, scrollY: 0 },
              outline: [],
              text: 'Artifact',
              truncated: { outline: false, text: false, source: false },
            });
        }),
    );
    const inspecting = preview.inspectPage(new AbortController().signal);
    const rendering = preview.renderCandidate(
      await draft(
        '<!doctype html><html><head><title>Queued</title></head><body>Queued</body></html>',
      ),
      new AbortController().signal,
    );

    preview.destroy();
    releaseInspection?.();

    await expect(inspecting).resolves.toMatchObject({ title: 'Artifact' });
    await expect(rendering).rejects.toThrow('closed');
    expect(surface.documents).toHaveLength(1);
  });
});
