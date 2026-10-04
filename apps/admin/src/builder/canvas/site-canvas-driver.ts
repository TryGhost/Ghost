import { getThemeLiteralTextTargets } from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';
import { visibleThemeCustomSettings } from '@/builder/workspaces/theme/theme-loader';
import { CanvasThemePreview } from './canvas-theme-preview';
import { CanvasRejectedError } from './canvas-driver';
import { ThemeWorkspace } from '@/builder/workspaces/theme/theme-workspace';
import { cloneThemeDraft, withThemeRevision } from '@/builder/workspaces/theme/theme-state';
import { createThemeRendererClient } from '@/builder/workspaces/theme/preview/preview-bridge';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type {
  CanvasDriver,
  CanvasEdit,
  CanvasEditorRender,
  CanvasPatch,
  CanvasHistory,
  CanvasHistoryRestore,
  CanvasPost,
  CanvasPostPage,
  CanvasPostSelection,
} from './canvas-driver';
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
  private checkpoints: Array<{
    id: string;
    revision: string;
    label: string;
    createdAt: string;
    draft: ThemeDraft;
  }> = [];
  private historyIndex = -1;
  private routes: { home: string; post?: string };
  private generation = 0;
  private selectedPost: CanvasPost | null;
  private readonly posts?: {
    selected: CanvasPost | null;
    list: (page: number, signal: AbortSignal) => Promise<CanvasPostPage>;
    read: (id: string, signal: AbortSignal) => Promise<CanvasPost>;
  };

  constructor(options: {
    draft: ThemeDraft;
    routes: { home: string; post?: string };
    posts?: SiteCanvasDriver['posts'];
    publish: (draft: ThemeDraft, signal: AbortSignal) => Promise<ThemePublishAdapterResult>;
  }) {
    this.routes = { ...options.routes };
    this.posts = options.posts;
    this.selectedPost = options.posts?.selected ?? null;
    this.preview = new CanvasThemePreview({
      required: this.routes,
      getRenderGeneration: () => this.generation,
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
        const home = await this.renderer.render(this.routes.home, draft.revision, signal);
        const post = this.routes.post
          ? await this.renderer.render(this.routes.post, draft.revision, signal)
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
    this.recordCheckpoint('Editor opened');
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
    const result = await this.workspace.applyInlineTextEdit(edit, this.lifetime.signal, {
      expectedRenderGeneration: edit.expectedDataGeneration ?? this.generation,
    });
    if (!result.ok) {
      throw new CanvasRejectedError(result.error.message, result.error.code, result.error.details);
    }
    const next = this.currentRender();
    this.accepted = next;
    this.recordCheckpoint('Text edit');
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
        {
          promote: true,
          requirePromotedSource: true,
          expectedRenderGeneration: patch.expectedDataGeneration,
        },
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
    this.recordCheckpoint('Theme change');
    return {
      ...next,
      sourceChanges: Object.fromEntries(
        result.data.paths.map((path) => [path, this.workspace.draft.files[path]?.content ?? null]),
      ),
    };
  }

  async listPosts(page: number, callerSignal?: AbortSignal): Promise<CanvasPostPage> {
    if (!this.posts) {
      throw new CanvasRejectedError('Post discovery is unavailable.');
    }
    const signal = AbortSignal.any([this.lifetime.signal, ...(callerSignal ? [callerSignal] : [])]);
    signal.throwIfAborted();
    return this.posts.list(page, signal);
  }

  async selectPost(
    input: CanvasPostSelection,
    callerSignal?: AbortSignal,
  ): Promise<CanvasEditorRender> {
    if (!this.posts) {
      throw new CanvasRejectedError('Post selection is unavailable.');
    }
    const signal = AbortSignal.any([this.lifetime.signal, ...(callerSignal ? [callerSignal] : [])]);
    return this.workspace
      .updatePreviewInputs(signal, async (draft) => {
        this.expectCurrent(input.expectedRevision, input.expectedDataGeneration);
        const post = await this.posts!.read(input.id, signal);
        signal.throwIfAborted();
        if (post.id !== input.id) {
          throw new CanvasRejectedError('The selected Post is unavailable.');
        }
        if (post.id === this.selectedPost?.id && post.url === this.routes.post && this.accepted) {
          return { ...this.accepted, unchanged: true };
        }
        const previous = {
          routes: this.routes,
          generation: this.generation,
          post: this.selectedPost,
        };
        this.routes = { ...this.routes, post: post.url };
        this.generation += 1;
        this.selectedPost = post;
        this.preview.setRequiredRoutes(this.routes);
        try {
          this.validate(await this.preview.renderCandidate(draft, signal));
          signal.throwIfAborted();
          this.accepted = this.currentRender();
          return this.accepted;
        } catch (error) {
          this.routes = previous.routes;
          this.generation = previous.generation;
          this.selectedPost = previous.post;
          this.preview.setRequiredRoutes(this.routes);
          throw error;
        }
      })
      .catch((error: unknown) => {
        if (error instanceof CanvasRejectedError) {
          throw error;
        }
        throw new CanvasRejectedError(
          signal.aborted
            ? 'Post selection was cancelled before acceptance.'
            : error instanceof Error
              ? error.message
              : String(error),
          signal.aborted ? 'cancelled' : 'post_selection_rejected',
        );
      });
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

  readHistory(): CanvasHistory {
    return {
      available: true,
      entries: this.checkpoints.map(({ draft: _draft, ...entry }, index) => ({
        ...entry,
        current: index === this.historyIndex,
      })),
      undoId: this.checkpoints[this.historyIndex - 1]?.id ?? null,
      redoId: this.checkpoints[this.historyIndex + 1]?.id ?? null,
    };
  }

  async restoreHistory(
    input: CanvasHistoryRestore,
    callerSignal?: AbortSignal,
  ): Promise<CanvasEditorRender> {
    this.expectCurrent(input.expectedRevision, input.expectedDataGeneration);
    const index = this.checkpoints.findIndex((entry) => entry.id === input.checkpointId);
    if (index < 0) {
      throw new CanvasRejectedError(
        'This checkpoint is no longer available.',
        'checkpoint_unavailable',
      );
    }
    const signal = AbortSignal.any([this.lifetime.signal, ...(callerSignal ? [callerSignal] : [])]);
    signal.throwIfAborted();
    if (index === this.historyIndex && this.accepted) {
      return { ...this.accepted, unchanged: true };
    }
    const previous = this.workspace.draft;
    const restored = cloneThemeDraft(this.checkpoints[index].draft);
    // Publication can create a custom copy. Undo source/settings, preserving the
    // active site's current archive identity and renderer credentials/configuration.
    restored.theme = { ...previous.theme };
    restored.renderer = structuredClone(previous.renderer);
    restored.virtualUrl = previous.virtualUrl;
    restored.selection = null;
    const candidate = await withThemeRevision(restored);
    if (signal.aborted) {
      throw new CanvasRejectedError(
        'The history change was cancelled before acceptance.',
        'cancelled',
      );
    }
    this.expectCurrent(input.expectedRevision, input.expectedDataGeneration);
    if (candidate.revision === previous.revision && this.accepted) {
      this.historyIndex = index;
      return { ...this.accepted, unchanged: true };
    }
    let validation: ValidationResult;
    try {
      validation = await this.workspace.restore(
        { revision: candidate.revision, payload: candidate },
        signal,
        {
          expectedRevision: input.expectedRevision,
          expectedRenderGeneration: input.expectedDataGeneration,
        },
      );
    } catch (error) {
      if (signal.aborted && this.workspace.draft.revision === previous.revision) {
        throw new CanvasRejectedError(
          'The history change was cancelled before acceptance.',
          'cancelled',
        );
      }
      throw error;
    }
    if (!validation.valid) {
      throw new CanvasRejectedError(
        'The checkpoint could not render every required page.',
        'checkpoint_rejected',
        { diagnostics: validation.diagnostics },
      );
    }
    this.historyIndex = index;
    this.accepted = this.currentRender();
    const next = this.workspace.draft;
    return {
      ...this.accepted,
      assets: await this.loadAssets(),
      sourceChanges: Object.fromEntries(
        [...new Set([...Object.keys(previous.files), ...Object.keys(next.files)])].map((path) => [
          path,
          next.files[path]?.content ?? null,
        ]),
      ),
    };
  }

  private recordCheckpoint(label: string) {
    const draft = this.workspace.draft;
    if (this.checkpoints[this.historyIndex]?.revision === draft.revision) {
      return;
    }
    this.checkpoints = this.checkpoints.slice(0, this.historyIndex + 1);
    this.checkpoints.push({
      id: crypto.randomUUID(),
      revision: draft.revision,
      label,
      createdAt: new Date().toISOString(),
      draft: cloneThemeDraft(draft),
    });
    if (this.checkpoints.length > 20) {
      this.checkpoints.shift();
    }
    this.historyIndex = this.checkpoints.length - 1;
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
        this.recordCheckpoint('Published theme');
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
    if (revision !== this.workspace.draft.revision || generation !== this.generation) {
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
      dataGeneration: this.generation,
      dataSnapshot: `post:${this.selectedPost?.id ?? 'unbound'}:data-${this.generation}`,
      renderKey: `${draft.revision}:data-${this.generation}`,
      routes: { ...this.routes },
      representativePost: this.selectedPost ? { ...this.selectedPost } : null,
      html: { home: output.groups.home.html, post: output.groups.post?.html },
      inlineTextTargets: output.inlineTextTargets,
      editMarkerAttribute: output.editMarkerAttribute,
    };
  }
}
