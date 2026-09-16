import { createRenderer } from '@tryghost/theme-renderer';

import type {
  ThemeRendererCandidateSettings,
  ThemeRendererInitialization,
  ThemeRendererWorkerRequest,
  ThemeRendererWorkerResponse,
  ThemeRenderResult,
} from './preview-bridge';

type RendererFactory = typeof createRenderer;
type Renderer = Awaited<ReturnType<RendererFactory>>;

export function createThemeRendererWorkerHandler({
  rendererFactory = createRenderer,
  postMessage,
}: {
  rendererFactory?: RendererFactory;
  postMessage: (response: ThemeRendererWorkerResponse) => void;
}) {
  let renderer: Renderer | null = null;
  let initialization: Omit<ThemeRendererInitialization, 'revision' | 'theme'> | null = null;
  let activeRevision = '';
  let latestMutationId = 0;
  const cancelled = new Set<number>();

  const setTheme = async (
    theme: Record<string, string>,
    revision: string,
    requestId: number,
    settings: ThemeRendererCandidateSettings = {},
  ): Promise<void> => {
    if (!initialization) {
      throw new Error('theme_renderer_worker_not_initialized');
    }
    const candidateInitialization = { ...initialization, ...settings };
    const candidate = await rendererFactory({ ...candidateInitialization, theme });
    if (cancelled.has(requestId) || requestId !== latestMutationId) {
      throw new DOMException('Aborted', 'AbortError');
    }
    initialization = candidateInitialization;
    renderer = candidate;
    activeRevision = revision;
  };

  const render = async (url: string): Promise<ThemeRenderResult> => {
    if (!renderer) {
      throw new Error('theme_renderer_worker_no_theme');
    }
    let currentUrl = url;
    for (let hop = 0; hop <= 3; hop += 1) {
      const response = await renderer.render(new Request(currentUrl), { markers: true });
      const location = response.headers.get('location');
      if (location && response.status >= 300 && response.status < 400) {
        const next = new URL(location, currentUrl);
        if (next.origin !== new URL(currentUrl).origin) {
          throw new Error(`theme_renderer_external_redirect:${next.href}`);
        }
        currentUrl = next.href;
        continue;
      }
      return {
        status: response.status,
        html: await response.text(),
        url: currentUrl,
        diagnostics: [],
      };
    }
    throw new Error('theme_renderer_redirect_loop');
  };

  return async (request: ThemeRendererWorkerRequest): Promise<void> => {
    if (request.type === 'cancel') {
      cancelled.add(request.payload.requestId);
      return;
    }
    try {
      let result: ThemeRenderResult | undefined;
      if (request.type === 'initialize') {
        latestMutationId = request.id;
        const { theme, ...candidateInitialization } = request.payload;
        initialization = candidateInitialization;
        await setTheme(theme, request.revision, request.id);
      } else if (request.type === 'set-theme') {
        latestMutationId = request.id;
        const { theme, ...settings } = request.payload;
        await setTheme(theme, request.revision, request.id, settings);
      } else {
        if (request.revision !== activeRevision) {
          throw new Error(`theme_renderer_stale_revision:${request.revision}`);
        }
        result = await render(request.payload.url);
      }
      if (!cancelled.delete(request.id)) {
        postMessage({ id: request.id, revision: request.revision, ok: true, result });
      }
    } catch (error) {
      if (!cancelled.delete(request.id)) {
        postMessage({
          id: request.id,
          revision: request.revision,
          ok: false,
          error: {
            code: 'theme_renderer_error',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  };
}

const isWorkerScope = typeof document === 'undefined' && typeof self === 'object';

if (isWorkerScope) {
  const handleRequest = createThemeRendererWorkerHandler({
    postMessage: (response) => self.postMessage(response),
  });
  self.onmessage = (event: MessageEvent<ThemeRendererWorkerRequest>) => {
    void handleRequest(event.data);
  };
}
