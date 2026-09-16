import { cloneArtifactDraft, withArtifactSelection } from './artifact-state';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

import type {
  BuilderPreviewAdapter,
  BuilderSelectionContext,
  ValidationResult,
} from '@/builder/core/workspace';
import type { WorkspaceDiagnostic } from '@/builder/core/tool-types';
import type { ArtifactDraft } from './artifact-state';
import type { PreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import type {
  PreviewElementInspection,
  PreviewElementTarget,
  PreviewPageInspection,
} from '@/builder/workspaces/theme/preview/preview-inspection';
import type {
  ScreenshotRequest,
  ScreenshotResult,
} from '@/builder/workspaces/theme/preview/screenshot';

export type ArtifactPreviewState = {
  revision: string;
  diagnostics: WorkspaceDiagnostic[];
  selection: BuilderSelectionContext | null;
};

const artifactPreviewUrl = 'https://artifact.builder.invalid/';
const maxDiagnostics = 50;

function abortIfNeeded(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function diagnostic(error: unknown): WorkspaceDiagnostic {
  return {
    code: 'artifact_render_failed',
    message: error instanceof Error ? error.message : String(error),
    severity: 'error',
  };
}

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

export class ArtifactPreviewAdapter implements BuilderPreviewAdapter {
  readonly kind = 'artifact';

  private readonly surface: PreviewDocumentSurface;
  private readonly listeners = new Set<(state: ArtifactPreviewState) => void>();
  private readonly unsubscribeNavigate: () => void;
  private readonly unsubscribeSelection: () => void;
  private readonly unsubscribeDiagnostic: () => void;
  private currentDraft: ArtifactDraft | null = null;
  private currentState: ArtifactPreviewState = { revision: '', diagnostics: [], selection: null };
  private operationTail: Promise<void> = Promise.resolve();
  private currentOperation: AbortController | null = null;
  private destroyed = false;

  constructor({ surface }: { surface: PreviewDocumentSurface }) {
    this.surface = surface;
    this.unsubscribeNavigate = surface.onNavigate((url) => this.openExternal(url));
    this.unsubscribeSelection = surface.onSelection((selection) => {
      if (this.destroyed) {
        return;
      }
      const operation = this.operationTail.then(() => this.adoptSelection(selection));
      this.operationTail = operation.then(
        () => {},
        () => {},
      );
      void operation.catch(() => {});
    });
    this.unsubscribeDiagnostic = surface.onDiagnostic((runtimeDiagnostic) => {
      const diagnostics = [...this.currentState.diagnostics, runtimeDiagnostic].slice(
        -maxDiagnostics,
      );
      this.setState({ ...this.currentState, diagnostics });
    });
  }

  get state(): ArtifactPreviewState {
    return structuredClone(this.currentState);
  }

  get draft(): ArtifactDraft {
    if (!this.currentDraft) {
      throw new Error('The artifact preview has not been loaded.');
    }
    return cloneArtifactDraft(this.currentDraft);
  }

  subscribe(listener: (state: ArtifactPreviewState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  start(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult> {
    return this.enqueue(signal, (operationSignal) => this.replace(draft, operationSignal));
  }

  renderCandidate(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult> {
    return this.enqueue(signal, (operationSignal) =>
      this.replaceWithRollback(draft, operationSignal),
    );
  }

  restoreDraft(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult> {
    return this.enqueue(signal, (operationSignal) => this.replace(draft, operationSignal, true));
  }

  inspectPage(signal: AbortSignal): Promise<PreviewPageInspection> {
    return this.enqueue(signal, (operationSignal) =>
      this.surface.inspectPage(artifactPreviewUrl, operationSignal),
    );
  }

  inspectElement(
    target: PreviewElementTarget,
    signal: AbortSignal,
  ): Promise<PreviewElementInspection> {
    return this.enqueue(signal, (operationSignal) =>
      this.surface.inspectElement(target, operationSignal),
    );
  }

  screenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<ScreenshotResult> {
    return this.enqueue(signal, (operationSignal) =>
      this.surface.screenshot(request, operationSignal),
    );
  }

  async setInteractionMode(mode: 'browse' | 'select' | 'edit', signal: AbortSignal): Promise<void> {
    if (mode === 'edit') {
      throw new Error('Artifact preview does not support inline editing.');
    }
    if (!this.surface.setInteractionMode) {
      throw new Error('The preview does not support interaction modes.');
    }
    const operation = this.operationTail.then(() => {
      this.throwIfUnavailable(signal);
      return this.surface.setInteractionMode?.(mode, signal);
    });
    this.operationTail = operation.then(
      () => {},
      () => {},
    );
    await operation;
  }

  async clearSelection(): Promise<void> {
    const operation = this.operationTail.then(() => {
      this.throwIfUnavailable();
      return this.adoptSelection(null);
    });
    this.operationTail = operation.then(
      () => {},
      () => {},
    );
    await operation;
  }

  async flush(signal: AbortSignal): Promise<void> {
    this.throwIfUnavailable(signal);
    await this.operationTail;
    this.throwIfUnavailable(signal);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.currentOperation?.abort();
    this.currentOperation = null;
    this.unsubscribeNavigate();
    this.unsubscribeSelection();
    this.unsubscribeDiagnostic();
    this.surface.destroy();
    this.listeners.clear();
  }

  private enqueue<T>(
    signal: AbortSignal,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.destroyed) {
      return Promise.reject(new Error('The artifact preview was closed.'));
    }
    this.currentOperation?.abort();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const queued = this.operationTail.then(async () => {
      try {
        this.throwIfUnavailable(signal);
        this.currentOperation = controller;
        return await operation(controller.signal);
      } finally {
        if (this.currentOperation === controller) {
          this.currentOperation = null;
        }
        signal.removeEventListener('abort', abort);
      }
    });
    this.operationTail = queued.then(
      () => {},
      () => {},
    );
    return queued;
  }

  private async replace(
    draft: ArtifactDraft,
    signal: AbortSignal,
    preserveSelection = false,
  ): Promise<ValidationResult> {
    try {
      const remappedSelection = await this.surface.replaceDocument(
        {
          revision: draft.revision,
          url: artifactPreviewUrl,
          html: draft.html,
        },
        draft.selection,
        signal,
      );
      abortIfNeeded(signal);
      const selection = preserveSelection ? draft.selection : remappedSelection;
      const adopted = await withArtifactSelection(draft, selection);
      this.currentDraft = adopted;
      const validation = { valid: true, diagnostics: [], revision: adopted.revision };
      this.setState({ revision: adopted.revision, diagnostics: [], selection });
      return validation;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      const renderDiagnostic = diagnostic(error);
      return { valid: false, diagnostics: [renderDiagnostic], revision: draft.revision };
    }
  }

  private async replaceWithRollback(
    draft: ArtifactDraft,
    signal: AbortSignal,
  ): Promise<ValidationResult> {
    const previous = this.currentDraft ? cloneArtifactDraft(this.currentDraft) : null;
    const result = await this.replace(draft, signal);
    if (result.valid || !previous || signal.aborted) {
      return result;
    }
    await this.replace(previous, new AbortController().signal);
    return result;
  }

  private async adoptSelection(selection: BuilderSelectionContext | null): Promise<void> {
    if (!this.currentDraft) {
      return;
    }
    const draft = await withArtifactSelection(this.currentDraft, selection);
    this.currentDraft = draft;
    this.setState({ ...this.currentState, revision: draft.revision, selection });
  }

  private openExternal(url: string): void {
    let destination: URL;
    try {
      destination = new URL(url);
    } catch {
      this.addDiagnostic({
        code: 'artifact_link_invalid',
        message: 'The embed tried to open an invalid link.',
        severity: 'error',
      });
      return;
    }
    if (!['http:', 'https:'].includes(destination.protocol)) {
      this.addDiagnostic({
        code: 'artifact_link_protocol_blocked',
        message: 'The embed can only open HTTP or HTTPS links from the preview.',
        severity: 'error',
      });
      return;
    }
    this.surface.openExternal(destination.href);
  }

  private addDiagnostic(next: WorkspaceDiagnostic): void {
    const diagnostics = [...this.currentState.diagnostics, next].slice(-maxDiagnostics);
    this.setState({ ...this.currentState, diagnostics });
  }

  private setState(state: ArtifactPreviewState): void {
    this.currentState = state;
    this.listeners.forEach((listener) => listener(this.state));
  }

  private throwIfUnavailable(signal?: AbortSignal): void {
    if (this.destroyed) {
      throw new Error('The artifact preview was closed.');
    }
    if (signal) {
      abortIfNeeded(signal);
    }
  }
}

export function createIframeArtifactPreview(iframe: HTMLIFrameElement): ArtifactPreviewAdapter {
  return new ArtifactPreviewAdapter({
    surface: new IframePreviewDocumentSurface(iframe, {
      sandbox: 'allow-forms allow-scripts',
      nativeForms: true,
      artifactDocument: true,
      timeoutMs: 15_000,
    }),
  });
}
