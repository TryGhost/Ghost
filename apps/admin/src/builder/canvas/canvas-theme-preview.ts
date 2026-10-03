import { cloneThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { ValidationResult } from '@/builder/core/workspace';

export type CanvasThemeRender = {
  groups: Record<'home' | 'post', { url: string; status: number; html: string }>;
  inlineTextTargets: Record<string, string>;
  editMarkerAttribute: string;
};

/** Required-route validation is independent of iframe delivery or model execution.
 * Rendering stages evidence only; the owning workspace must accept its candidate
 * before the caller delivers that exact revision to any live document. */
export class CanvasThemePreview {
  readonly kind = 'theme-canvas';
  private readonly required: Record<'home' | 'post', string>;
  private readonly render: (draft: ThemeDraft, signal: AbortSignal) => Promise<CanvasThemeRender>;
  private readonly getRenderGeneration: () => number;
  private tail = Promise.resolve();
  private queued = 0;
  private readonly disposal = new AbortController();
  private staged: { revision: string; generation: number; output: CanvasThemeRender } | null = null;

  constructor(options: {
    required: Record<'home' | 'post', string>;
    render: (draft: ThemeDraft, signal: AbortSignal) => Promise<CanvasThemeRender>;
    getRenderGeneration: () => number;
  }) {
    this.required = structuredClone(options.required);
    this.render = options.render;
    this.getRenderGeneration = options.getRenderGeneration;
  }

  renderCandidate(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
    if (this.queued >= 32) {
      return Promise.reject(new Error('Canvas validation is busy. Wait for outstanding work.'));
    }
    this.queued += 1;
    const candidate = cloneThemeDraft(draft);
    const activeSignal = AbortSignal.any([signal, this.disposal.signal]);
    const operation = this.tail.then(async () => {
      activeSignal.throwIfAborted();
      const generation = this.getRenderGeneration();
      if (this.staged?.revision === candidate.revision && this.staged.generation === generation) {
        return { valid: true, revision: candidate.revision, diagnostics: [] };
      }
      this.staged = null;
      try {
        const output = await this.render(candidate, activeSignal);
        activeSignal.throwIfAborted();
        if (this.getRenderGeneration() !== generation) {
          return {
            valid: false,
            revision: candidate.revision,
            diagnostics: [
              {
                code: 'canvas_render_inputs_changed',
                severity: 'error' as const,
                message:
                  'Renderer inputs changed during validation. Validate again against the current snapshot.',
              },
            ],
          };
        }
        const diagnostics = (['home', 'post'] as const).flatMap((group) => {
          const result = output.groups[group];
          return result?.status === 200 &&
            result.url === this.required[group] &&
            typeof result.html === 'string'
            ? []
            : [
                {
                  code: 'canvas_required_route_failed',
                  severity: 'error' as const,
                  message: `${group} required render did not resolve ${this.required[group]} successfully (status ${result?.status ?? 'unavailable'}).`,
                },
              ];
        });
        if (diagnostics.length) {
          return { valid: false, revision: candidate.revision, diagnostics };
        }
        this.staged = { revision: candidate.revision, generation, output: structuredClone(output) };
        return { valid: true, revision: candidate.revision, diagnostics: [] };
      } catch (error) {
        activeSignal.throwIfAborted();
        return {
          valid: false,
          revision: candidate.revision,
          diagnostics: [
            {
              code: 'canvas_render_failed',
              severity: 'error' as const,
              message: (error instanceof Error ? error.message : String(error)).slice(0, 1024),
            },
          ],
        };
      }
    });
    this.tail = operation.then(
      () => {},
      () => {},
    );
    return operation.finally(() => {
      this.queued -= 1;
    });
  }

  stagedFor(revision: string): CanvasThemeRender {
    this.disposal.signal.throwIfAborted();
    if (
      this.staged?.revision !== revision ||
      this.staged.generation !== this.getRenderGeneration()
    ) {
      throw new Error('No complete canvas validation exists for this revision.');
    }
    return structuredClone(this.staged.output);
  }

  destroy(): void {
    this.disposal.abort();
    this.staged = null;
  }
}
