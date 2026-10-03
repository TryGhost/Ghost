import { getThemeLiteralTextTargets } from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';
import { visibleThemeCustomSettings } from '@/builder/workspaces/theme/theme-loader';
import { CanvasThemePreview } from './canvas-theme-preview';
import { CanvasRejectedError } from './canvas-driver';
import { ThemeWorkspace } from '@/builder/workspaces/theme/theme-workspace';
import { createThemeRendererClient } from '@/builder/workspaces/theme/preview/preview-bridge';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { CanvasDriver, CanvasEdit, CanvasEditorRender, CanvasPatch } from './canvas-driver';
import type { PublishResult, ValidationResult } from '@/builder/core/workspace';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';
type ThemePublishAdapterResult = PublishResult & { draft?: ThemeDraft };

export function canvasThemeFiles(draft: ThemeDraft): Record<string, string> {
  return Object.fromEntries(
    Object.entries(draft.files).flatMap(([path, file]) =>
      file.kind === 'text' && file.content !== null ? [[path, file.content]] : [],
    ),
  );
}

/** Source and required-route validation belong to this session, not its iframes. */
export class SiteCanvasDriver implements CanvasDriver {
  readonly workspace: ThemeWorkspace;
  readonly preview: CanvasThemePreview;
  private readonly renderer = createThemeRendererClient();
  private readonly lifetime = new AbortController();
  private readonly deliveries = new Set<(render: CanvasEditorRender) => void>();
  private accepted: CanvasEditorRender | null = null;

  constructor(options: {
    draft: ThemeDraft;
    routes: { home: string; post?: string };
    publish: (draft: ThemeDraft, signal: AbortSignal) => Promise<ThemePublishAdapterResult>;
  }) {
    this.preview = new CanvasThemePreview({
      required: options.routes,
      getRenderGeneration: () => 0,
      render: async (draft, signal) => {
        const theme = canvasThemeFiles(draft);
        const visible = visibleThemeCustomSettings(draft.customSettings);
        const editMarkerAttribute = `data-builder-source-${crypto.randomUUID()}`;
        await this.renderer.initialize(
          {
            editMarkerAttribute,
            theme,
            revision: draft.revision,
            siteUrl: draft.renderer.siteUrl,
            contentApiKey: draft.renderer.contentApiKey,
            config: draft.renderer.config,
            settingsPayload: { ...draft.renderer.settingsPayload, ...draft.globalSettings },
            customThemeSettings: Object.fromEntries(
              Object.entries(draft.customSettings).map(([key, setting]) => [
                key,
                visible[key] ? setting.value : null,
              ]),
            ),
          },
          signal,
        );
        const home = await this.renderer.render(options.routes.home, draft.revision, signal);
        const post = options.routes.post
          ? await this.renderer.render(options.routes.post, draft.revision, signal)
          : undefined;
        return {
          groups: { home, post },
          inlineTextTargets: getThemeLiteralTextTargets(theme, editMarkerAttribute),
          editMarkerAttribute,
        };
      },
    });
    this.workspace = new ThemeWorkspace({
      id: `theme-canvas:${crypto.randomUUID()}`,
      title: options.draft.theme.name,
      load: (signal) => {
        signal.throwIfAborted();
        return Promise.resolve(options.draft);
      },
      preview: this.preview,
      publish: options.publish,
    });
  }

  async start(): Promise<void> {
    await this.workspace.load(this.lifetime.signal);
    this.validate(await this.preview.renderCandidate(this.workspace.draft, this.lifetime.signal));
    this.accepted = this.currentRender();
  }

  async render(edit?: CanvasEdit): Promise<CanvasEditorRender> {
    this.lifetime.signal.throwIfAborted();
    if (!this.accepted) {
      throw new CanvasRejectedError('The theme canvas is not ready.');
    }
    if (!edit) {
      return { ...this.accepted, unchanged: false };
    }
    this.expectCurrent(edit.expectedRevision, edit.expectedDataGeneration ?? 0);
    const marker = parseEditMarker(edit.marker);
    if (!marker) {
      throw new CanvasRejectedError('The selected source is unavailable.');
    }
    const result = await this.workspace.applyInlineTextEdit(edit, this.lifetime.signal);
    if (!result.ok) {
      throw new CanvasRejectedError(result.error.message, result.error.code, result.error.details);
    }
    const next = this.currentRender();
    this.accepted = next;
    return {
      ...next,
      sourceChanges: { [marker.file]: this.workspace.draft.files[marker.file].content },
    };
  }

  async applyThemePatch(
    patch: CanvasPatch,
    callerSignal?: AbortSignal,
  ): Promise<CanvasEditorRender> {
    this.expectCurrent(patch.expectedRevision, patch.expectedDataGeneration);
    const signal = AbortSignal.any([this.lifetime.signal, ...(callerSignal ? [callerSignal] : [])]);
    signal.throwIfAborted();
    const result = await this.workspace
      .applyThemePatch(
        { revision: patch.expectedRevision, files: patch.files, settings: patch.settings },
        signal,
        { promote: true, requirePromotedSource: true },
      )
      .catch((error: unknown) => {
        if (signal.aborted && this.workspace.draft.revision === patch.expectedRevision) {
          throw new CanvasRejectedError('The theme change was cancelled before acceptance.');
        }
        throw error;
      });
    if (!result.ok) {
      if (signal.aborted && this.workspace.draft.revision === patch.expectedRevision) {
        throw new CanvasRejectedError('The theme change was cancelled before acceptance.');
      }
      throw new CanvasRejectedError(result.error.message, result.error.code, result.error.details);
    }
    if (result.data.unchanged && this.accepted) {
      return { ...this.accepted, unchanged: true };
    }
    const next = this.currentRender();
    this.accepted = next;
    return {
      ...next,
      sourceChanges: Object.fromEntries(
        result.data.paths.map((path) => [path, this.workspace.draft.files[path]?.content ?? null]),
      ),
    };
  }

  loadAssets(): Promise<NonNullable<PreviewDocument['assets']>> {
    return Promise.resolve(
      Object.fromEntries(
        Object.entries(this.workspace.draft.files)
          .filter(([path]) => path.startsWith('assets/'))
          .map(([path, file]) => [path, { content: file.content, binary: file.binary }]),
      ),
    );
  }

  subscribe(deliver: (render: CanvasEditorRender) => void): () => void {
    this.deliveries.add(deliver);
    return () => {
      this.deliveries.delete(deliver);
    };
  }

  async publish(signal: AbortSignal): Promise<PublishResult & { previewWarning?: string }> {
    const result = await this.workspace.publish(AbortSignal.any([signal, this.lifetime.signal]));
    if (result.ok) {
      try {
        this.validate(
          await this.preview.renderCandidate(this.workspace.draft, this.lifetime.signal),
        );
        this.accepted = this.currentRender();
        for (const deliver of this.deliveries) {
          deliver(this.accepted);
        }
      } catch (error) {
        return {
          ...result,
          previewWarning: `The theme was published, but its preview could not refresh. Reload Builder to continue. ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
    return result;
  }

  dispose(): void {
    this.lifetime.abort();
    this.preview.destroy();
    this.renderer.destroy();
    this.deliveries.clear();
  }

  private expectCurrent(revision: string, generation: number): void {
    this.lifetime.signal.throwIfAborted();
    if (revision !== this.workspace.draft.revision || generation !== 0) {
      throw new CanvasRejectedError(
        'The theme changed. Reselect the current render before editing.',
      );
    }
  }

  private validate(validation: ValidationResult): void {
    if (!validation.valid) {
      throw new CanvasRejectedError(validation.diagnostics.map((item) => item.message).join(' '));
    }
  }

  private currentRender(): CanvasEditorRender {
    const draft = this.workspace.draft;
    const output = this.preview.stagedFor(draft.revision);
    return {
      workspaceId: this.workspace.id,
      revision: draft.revision,
      dataGeneration: 0,
      dataSnapshot: 'initial',
      renderKey: `${draft.revision}:data-0`,
      html: { home: output.groups.home.html, post: output.groups.post?.html },
      inlineTextTargets: output.inlineTextTargets,
      editMarkerAttribute: output.editMarkerAttribute,
    };
  }
}
