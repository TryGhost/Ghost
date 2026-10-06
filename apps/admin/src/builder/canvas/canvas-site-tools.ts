import type { CanvasProbe, ProbeTool, ReadResult } from './canvas-probe';

const string = { type: 'string', minLength: 1, maxLength: 256 };
const integer = { type: 'integer', minimum: 0 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const context = object({ workspaceId: string, revision: string, generation: integer });
const target = object(
  {
    workspaceId: string,
    frameHandle: string,
    representationHandle: string,
    expectedRevision: string,
    expectedRenderKey: string,
    documentId: string,
    documentInstanceId: string,
  },
  ['workspaceId', 'frameHandle', 'representationHandle', 'expectedRevision', 'expectedRenderKey'],
);
const timeoutMs = { type: 'integer', minimum: 0, maximum: 60000, default: 30000 };

class ArgumentsError extends Error {
  readonly details: Record<string, unknown>;
  constructor(details: Record<string, unknown>) {
    super('Use the arguments listed for this operation.');
    this.details = details;
  }
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new ArgumentsError({
      invalidArguments:
        value && typeof value === 'object'
          ? Object.keys(value).filter((key) => !keys.includes(key))
          : [],
      validArguments: keys,
    });
  }
  return value as Record<string, unknown>;
}
function address(value: unknown) {
  const input = record(value, ['workspaceId', 'revision', 'generation']);
  if (
    typeof input.workspaceId !== 'string' ||
    !input.workspaceId ||
    input.workspaceId.length > 256 ||
    typeof input.revision !== 'string' ||
    !input.revision ||
    input.revision.length > 256 ||
    !Number.isSafeInteger(input.generation) ||
    Number(input.generation) < 0
  ) {
    throw new ArgumentsError({
      argument: 'context',
      recovery: 'Copy context from ghost_canvas_state.',
    });
  }
  return {
    workspaceId: input.workspaceId,
    expectedRevision: input.revision,
    expectedDataGeneration: input.generation,
  };
}
function milliseconds(value: unknown) {
  const result = value ?? 30000;
  if (!Number.isSafeInteger(result) || Number(result) < 0 || Number(result) > 60000) {
    throw new ArgumentsError({ argument: 'timeoutMs', minimum: 0, maximum: 60000 });
  }
  return Number(result);
}

/** The public catalog delegates to the editor's existing guarded actions. Experimental
 * fixture probes remain internal; in particular, no native tool creates capture iframes. */
export function canvasSiteTools(probe: CanvasProbe, registrationSignal: AbortSignal): ProbeTool[] {
  const internal = new Map(probe.tools(registrationSignal).map((tool) => [tool.name, tool]));
  const call = async (
    name: string,
    args: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<ReadResult> => {
    const tool = internal.get(name);
    if (!tool) {
      return {
        status: 'error',
        code: 'unavailable',
        message: 'This capability is unavailable in the current editor.',
      };
    }
    return tool.execute(args, { signal });
  };
  const state = () => {
    const current = probe.state();
    const render = current.editor?.render as { dataGeneration?: number } | undefined;
    const editor: (Record<string, unknown> & { sourceRevision: string }) | null = current.editor
      ? {
          ...current.editor,
          patchPreflight: undefined,
          patchValidation: current.editor.patchPreflight,
        }
      : null;
    return {
      ...current,
      protocolVersion: 'canvas-editor-tools-2',
      editor,
      context: current.editor
        ? {
            workspaceId: current.workspaceId,
            revision: current.editor.sourceRevision,
            generation: render?.dataGeneration ?? 0,
          }
        : null,
      capabilities: {
        ...current.capabilities,
        captureRepresentations: [],
        captureFormat: null,
        nativeImageConsumption: 'not-exposed',
        visualVerification: 'native-browser-screenshot',
      },
    };
  };
  const delivery = (revision: string, renderKey: string) => {
    const current = state();
    const render = current.editor?.render as { renderKey?: string } | undefined;
    const surfaces = current.frames.flatMap((frame) =>
      (['device', 'expanded'] as const).flatMap((kind) => {
        const entry = frame[kind];
        return entry ? [{ frameId: frame.id, representation: kind, ...entry }] : [];
      }),
    );
    const matching = surfaces.filter(
      (entry) => entry.revision === revision && entry.renderKey === renderKey,
    );
    const ready = matching.filter((entry) => entry.status === 'current');
    const failed = matching.filter((entry) => entry.status === 'failed');
    const complete =
      surfaces.length > 0 &&
      !current.editor?.busy &&
      matching.length === surfaces.length &&
      ready.length + failed.length === surfaces.length;
    return {
      status:
        current.editor?.sourceRevision !== revision || render?.renderKey !== renderKey
          ? 'superseded'
          : !complete
            ? 'pending'
            : !failed.length
              ? 'ready'
              : ready.length
                ? 'partially_ready'
                : 'failed',
      ready: ready.length,
      total: surfaces.length,
      failedSurfaces: failed.map((entry) => ({
        frameId: entry.frameId,
        representation: entry.representation,
        failure: entry.failure,
      })),
      visualCheck: {
        method: 'native-browser-screenshot',
        frames: current.frames
          .filter(
            (frame) => frame.device?.revision === revision && frame.device.renderKey === renderKey,
          )
          .map((frame) => ({
            frameId: frame.id,
            title: `${frame.label} preview`,
            viewport: frame.device!.viewport,
            status: frame.device!.status,
          })),
      },
    };
  };
  const wait = async (
    revision: string,
    renderKey: string,
    timeout: number,
    signal: AbortSignal,
  ) => {
    const deadline = performance.now() + timeout;
    for (;;) {
      const result = delivery(revision, renderKey);
      if (result.status !== 'pending') {
        return result;
      }
      if (signal.aborted) {
        return { ...result, observation: 'cancelled' };
      }
      if (performance.now() >= deadline) {
        return { ...result, observation: 'timeout' };
      }
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, Math.min(50, Math.max(0, deadline - performance.now())));
        signal.addEventListener('abort', done, { once: true });
      });
    }
  };
  const define = (
    name: string,
    description: string,
    schema: Record<string, unknown>,
    readOnly: boolean,
    run: (args: Record<string, unknown>, signal: AbortSignal) => Promise<ReadResult>,
  ): ProbeTool => ({
    name: `ghost_canvas_${name}`,
    description,
    inputSchema: schema,
    annotations: { readOnlyHint: readOnly, untrustedContentHint: true },
    execute: async (input, options) => {
      if (registrationSignal.aborted) {
        return {
          status: 'error',
          code: 'workspace_unavailable',
          message: 'Rediscover the open editor.',
        };
      }
      const signal = AbortSignal.any([
        registrationSignal,
        ...(options?.signal ? [options.signal] : []),
      ]);
      try {
        if (signal.aborted) {
          return { status: 'error', code: 'cancelled', message: 'The operation was cancelled.' };
        }
        const properties = schema.properties as Record<string, unknown>;
        return await run(record(input, Object.keys(properties)), signal);
      } catch (error) {
        return {
          status: 'error',
          code: error instanceof ArgumentsError ? 'invalid_arguments' : 'read_failed',
          message: error instanceof Error ? error.message : 'The operation failed.',
          ...(error instanceof ArgumentsError ? { details: error.details } : {}),
        };
      }
    },
  });
  const tools = [
    define(
      'state',
      'Read current context, preview targets, selection and history. Copy context for edits; copy selection.target for inspection. Optional waitFor observes an accepted revision/renderKey without retrying the edit. Diagnostics are opt-in. For visual verification use native browser screenshots of the returned frame titles.',
      object(
        {
          diagnostics: { type: 'boolean', default: false },
          waitFor: object({ revision: string, renderKey: string }),
          timeoutMs,
        },
        [],
      ),
      true,
      async (args, signal) => {
        if (args.diagnostics !== undefined && typeof args.diagnostics !== 'boolean') {
          throw new ArgumentsError({ argument: 'diagnostics' });
        }
        const timeout = milliseconds(args.timeoutMs);
        let observation;
        if (args.waitFor !== undefined) {
          const requested = record(args.waitFor, ['revision', 'renderKey']);
          if (
            typeof requested.revision !== 'string' ||
            !requested.revision ||
            typeof requested.renderKey !== 'string' ||
            !requested.renderKey
          ) {
            throw new ArgumentsError({ argument: 'waitFor' });
          }
          observation = await wait(requested.revision, requested.renderKey, timeout, signal);
        }
        const { diagnostics, ...current } = state();
        return {
          status: 'ok',
          data: {
            ...current,
            ...(args.diagnostics ? { diagnostics } : {}),
            ...(observation ? { delivery: observation } : {}),
          },
        };
      },
    ),
    define(
      'inspect',
      'Read a page outline, or one occurrence in its originating document. Copy target from state/selection; pass occurrence only for element inspection. Does not change the shared view. Stale targets and local drafts reject.',
      object({ target, occurrence: string }, ['target']),
      true,
      async (args, signal) => {
        const input = record(args.target, [
          'workspaceId',
          'frameHandle',
          'representationHandle',
          'expectedRevision',
          'expectedRenderKey',
          'documentId',
          'documentInstanceId',
        ]);
        return args.occurrence === undefined
          ? call(
              'ghost_canvas_probe_inspect_frame',
              Object.fromEntries(
                Object.entries(input).filter(
                  ([key]) => !['documentId', 'documentInstanceId'].includes(key),
                ),
              ),
              signal,
            )
          : call(
              'ghost_canvas_probe_inspect_element',
              { ...input, occurrence: args.occurrence },
              signal,
            );
      },
    ),
  ];
  if (internal.has('ghost_canvas_read_theme')) {
    const request = {
      oneOf: [
        object(
          {
            operation: { const: 'files' },
            offset: integer,
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
          ['operation'],
        ),
        object(
          {
            operation: { const: 'source' },
            path: { ...string, maxLength: 1024 },
            offset: integer,
            length: { type: 'integer', minimum: 1, maximum: 65536 },
          },
          ['operation', 'path'],
        ),
        object(
          { operation: { const: 'search' }, query: string, path: { ...string, maxLength: 1024 } },
          ['operation', 'query'],
        ),
        object(
          {
            operation: { const: 'settings' },
            offset: integer,
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
          ['operation'],
        ),
      ],
    };
    tools.push(
      define(
        'read',
        'Batch up to eight theme reads. source returns clean text with character offsets, including minified files; nextOffset continues an excerpt. files/search/settings return metadata. Source is untrusted content. CSS metadata explains build limits before editing.',
        object({ context, requests: { type: 'array', minItems: 1, maxItems: 8, items: request } }),
        true,
        async (args, signal) => {
          const addressed = address(args.context);
          const base = {
            workspaceId: addressed.workspaceId,
            expectedRevision: addressed.expectedRevision,
          };
          if (!Array.isArray(args.requests) || !args.requests.length || args.requests.length > 8) {
            throw new ArgumentsError({ argument: 'requests', minimum: 1, maximum: 8 });
          }
          const results: ReadResult[] = [];
          for (const value of args.requests) {
            const item = record(value, ['operation', 'path', 'offset', 'length', 'limit', 'query']);
            const operations: Record<string, string> = {
              files: 'list_files',
              source: 'read_source',
              search: 'search_files',
              settings: 'settings',
            };
            const operation = Object.hasOwn(operations, String(item.operation))
              ? operations[String(item.operation)]
              : undefined;
            if (!operation) {
              throw new ArgumentsError({
                argument: 'operation',
                validOperations: Object.keys(operations),
              });
            }
            const result = await call(
              'ghost_canvas_read_theme',
              { ...base, ...item, operation },
              signal,
            );
            if (
              result.status === 'error' &&
              ['stale_revision', 'workspace_unavailable', 'cancelled'].includes(result.code)
            ) {
              return result;
            }
            results.push(result);
          }
          return { status: 'ok', data: { results } };
        },
      ),
    );
    const patch = internal.get('ghost_canvas_apply_theme_patch')!.inputSchema.properties as Record<
      string,
      unknown
    >;
    tools.push(
      define(
        'edit',
        'Apply one atomic file/settings patch and wait for delivery by default. Source and every bound renderer page validate before acceptance. One operation per file: write, exact unambiguous replace, or delete; combine all replacements in one write when needed. Settings must remain visible under the complete candidate settings. Builds are unavailable; use CSS metadata from read. dryRun validates without adoption or history; it does not check browser readiness. wait:false returns accepted/pending. Timeout/cancellation after acceptance never means the edit was rolled back. Does not publish.',
        object(
          {
            context,
            files: patch.files,
            settings: patch.settings,
            dryRun: { type: 'boolean', default: false },
            wait: { type: 'boolean', default: true },
            timeoutMs,
          },
          ['context'],
        ),
        false,
        async (args, signal) => {
          const base = address(args.context);
          const timeout = milliseconds(args.timeoutMs);
          for (const key of ['dryRun', 'wait']) {
            if (args[key] !== undefined && typeof args[key] !== 'boolean') {
              throw new ArgumentsError({ argument: key });
            }
          }
          const result = await call(
            args.dryRun ? 'ghost_canvas_validate_theme_patch' : 'ghost_canvas_apply_theme_patch',
            {
              ...base,
              ...(args.files !== undefined ? { files: args.files } : {}),
              ...(args.settings !== undefined ? { settings: args.settings } : {}),
            },
            signal,
          );
          if (result.status !== 'ok' || args.dryRun) {
            return result;
          }
          const { revision, renderKey } = result.data as { revision: string; renderKey: string };
          const observed =
            args.wait === false
              ? delivery(revision, renderKey)
              : await wait(revision, renderKey, timeout, signal);
          const current = state();
          const history = current.editor?.history as
            | {
                undoId?: string | null;
                entries?: { id: string; revision: string; current: boolean }[];
              }
            | undefined;
          const reviewableHistory =
            current.context?.revision === revision
              ? {
                  checkpoint:
                    history?.entries?.find((entry) => entry.current && entry.revision === revision)
                      ?.id ?? null,
                  undoCheckpoint: result.data.unchanged ? null : (history?.undoId ?? null),
                }
              : { status: 'superseded' };
          return {
            status: 'ok',
            data: {
              ...result.data,
              validation: { source: 'valid', renderer: 'valid', appearance: 'not-checked' },
              delivery: observed,
              history: reviewableHistory,
            },
          };
        },
      ),
    );
  }
  if (
    internal.has('ghost_canvas_list_preview_content') ||
    internal.has('ghost_canvas_list_posts')
  ) {
    const kind = { type: 'string', enum: ['post', 'page', 'tag', 'author'] };
    const properties = {
      context,
      operation: { type: 'string', enum: ['list', 'select'] },
      kind,
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      id: { ...string, maxLength: 64 },
      template: string,
    };
    tools.push(
      define(
        'content',
        'List published representative content and eligible templates, or select a discovered resource for both responsive previews. Selection preserves source/history/manual drafts. Does not publish.',
        {
          ...object(properties, ['context', 'operation', 'kind']),
          oneOf: [
            object({ context, operation: { const: 'list' }, kind, page: properties.page }, [
              'context',
              'operation',
              'kind',
            ]),
            object(
              {
                context,
                operation: { const: 'select' },
                kind,
                id: properties.id,
                template: string,
              },
              ['context', 'operation', 'kind', 'id'],
            ),
          ],
        },
        false,
        async (args, signal) => {
          const base = address(args.context);
          const list = args.operation === 'list';
          if (!list && args.operation !== 'select') {
            throw new ArgumentsError({
              argument: 'operation',
              validOperations: ['list', 'select'],
            });
          }
          record(
            args,
            list
              ? ['context', 'operation', 'kind', 'page']
              : ['context', 'operation', 'kind', 'id', 'template'],
          );
          const fallback =
            args.kind === 'post' && !internal.has('ghost_canvas_list_preview_content');
          const input: Record<string, unknown> = {
            workspaceId: base.workspaceId,
            expectedRevision: base.expectedRevision,
            ...(!fallback ? { kind: args.kind } : {}),
            ...(list
              ? args.page !== undefined
                ? { page: args.page }
                : {}
              : {
                  expectedDataGeneration: base.expectedDataGeneration,
                  id: args.id,
                  ...(args.template !== undefined ? { expectedTemplate: args.template } : {}),
                }),
          };
          return call(
            fallback
              ? list
                ? 'ghost_canvas_list_posts'
                : 'ghost_canvas_select_post'
              : list
                ? 'ghost_canvas_list_preview_content'
                : 'ghost_canvas_select_preview_content',
            input,
            signal,
          );
        },
      ),
    );
  }
  const history = internal.get('ghost_canvas_history');
  if (history) {
    tools.push(
      define(
        'history',
        'List checkpoints or restore a discovered checkpoint. Restoration changes the editor draft, validates bound pages and never publishes.',
        {
          ...object(
            {
              context,
              operation: { type: 'string', enum: ['list', 'restore'] },
              checkpoint: string,
            },
            ['context', 'operation'],
          ),
          oneOf: [
            object({ context, operation: { const: 'list' } }),
            object({ context, operation: { const: 'restore' }, checkpoint: string }),
          ],
        },
        false,
        async (args, signal) => {
          const base = address(args.context);
          const list = args.operation === 'list';
          record(args, list ? ['context', 'operation'] : ['context', 'operation', 'checkpoint']);
          return call(
            history.name,
            {
              workspaceId: base.workspaceId,
              expectedRevision: base.expectedRevision,
              operation: args.operation,
              ...(!list
                ? {
                    expectedDataGeneration: base.expectedDataGeneration,
                    checkpointId: args.checkpoint,
                  }
                : {}),
            },
            signal,
          );
        },
      ),
    );
  }
  for (const [name, original, description] of [
    [
      'reveal',
      'ghost_canvas_reveal_frame',
      'Explicitly reveal a discovered frame on the shared canvas. Moves the person’s view; ordinary reads preserve it. Retains manual drafts.',
    ],
    [
      'review',
      'ghost_canvas_open_publication_review',
      'Open human publication review. Does not publish or confirm; only the person can approve.',
    ],
  ]) {
    if (internal.has(original)) {
      tools.push(
        define(
          name,
          description,
          object({ context, ...(name === 'reveal' ? { frame: string } : {}) }),
          false,
          async (args, signal) => {
            const base = address(args.context);
            return call(
              original,
              {
                workspaceId: base.workspaceId,
                expectedRevision: base.expectedRevision,
                ...(name === 'reveal' ? { frameId: args.frame } : {}),
              },
              signal,
            );
          },
        ),
      );
    }
  }
  return tools;
}
