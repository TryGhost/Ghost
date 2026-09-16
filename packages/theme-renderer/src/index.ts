/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @tryghost/theme-renderer public API — fetch-handler shape per the spec:
 *
 *   const renderer = await createRenderer({siteUrl, contentApiKey, theme});
 *   const response = await renderer.render(new Request('http://site/path/'));
 *
 * Assembly order matters (see docs/extraction-map.md §5):
 * 1. load settings snapshot + default seam deps,
 * 2. build the engine over the theme's virtual fs,
 * 3. point the seam's handlebars environment at the engine instance
 *    (`templates.execute` must see the same partials),
 * 4. register core helper partials FIRST, theme partials later (engine's
 *    partial caching on first render) so same-named theme partials override,
 * 5. register the Ghost helpers through the HelperRegistrar adapter,
 * 6. seed global template options (the `@site/@labs/@config/@custom` frame).
 */
// FIRST import: browser/worker guard for @tryghost/nql-lang's unguarded
// `process.env` reads (import-time via the browserify util polyfill, parse-time
// via jison's yy.debug — upstream fix candidate, see the guard's doc block).
// Importing it here, before anything else, covers every module in the graph
// regardless of import order.
import './utils/process-env-guard.ts';
import _ from './utils/lodash.ts';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import * as errorsNamespace from '@tryghost/errors';
import { TemplateEngine } from './engine/engine.ts';
import { injectEditMarkers } from './engine/markers.ts';
import { createThemeSource, type ThemeFiles, type ThemeSource } from './theme/theme-source.ts';
import { loadDefaultDeps } from './seam/defaults.ts';
import { configureRendererDeps } from './seam/deps.ts';
import { hbs, setHandlebarsInstance } from './seam/handlebars-env.ts';
import { registerCoreHelperPartials } from './helpers/tpl/partials.ts';
import { registerGhostHelpers } from './helpers/services/register-ghost-helpers.ts';
import {
  applyLocalTemplateOptions,
  buildGlobalTemplateOptions,
} from './rendering/template-options.ts';
import { resolveRoutes } from './routing/resolve.ts';
import collectionController from './routing/controllers/collection.ts';
import channelController from './routing/controllers/channel.ts';
import { entryController } from './routing/controllers/entry.ts';
import templates from './rendering/templates.ts';
import type { ActiveThemePort, HelperRegistrar, LoggingPort, RendererDeps } from './seam/types.ts';
import type { RenderLocals, RenderResult } from './ports.ts';

// Root export surface: the render contract (docs/markers.md) — the engine,
// plus parseEditMarker/EDIT_MARKER_ATTRIBUTE/injectEditMarkers for consumers
// of marked render output. The editor-side edit tools (applyTextEdit,
// applyThemeTextEdit) live on the './editor' subpath export, and the scanner
// internals (src/engine/source-scanner.ts) are not exported at all.
export * from './engine/index.ts';
export * from './ports.ts';
export { createThemeSource, type ThemeFiles, type ThemeSource } from './theme/theme-source.ts';
export {
  resolveRoutes,
  type RouteCandidate,
  type ResolveRoutesOptions,
} from './routing/resolve.ts';
export type { RendererDeps, HelperRegistrar } from './seam/types.ts';

/**
 * Adapts the TemplateEngine to the seam's HelperRegistrar contract — the
 * helpers layer registers through this and never imports the engine. Async
 * helpers flow through the engine's express-hbs-ported placeholder machinery
 * (src/engine/async-resolver.ts): the sync render emits a unique token, the
 * promised helper result is string-replaced into the output afterwards.
 */
export function createEngineHelperRegistrar(engine: TemplateEngine): HelperRegistrar {
  return {
    registerHelper(name, fn) {
      engine.registerHelper(name, fn);
    },
    registerAsyncHelper(name, fn) {
      engine.registerAsyncHelper(name, fn);
    },
  };
}

export interface CreateRendererOptions {
  /** Site URL of the Ghost instance, e.g. http://localhost:2368/ */
  siteUrl: string;
  /** Content API key */
  contentApiKey: string;
  /** Theme files, path → content (e.g. 'index.hbs', 'partials/card.hbs') */
  theme: ThemeFiles;
  fetch?: typeof globalThis.fetch;
  /** Admin URL when it differs from the site URL */
  adminUrl?: string;
  /** Extra config values (`:`-separated lookup) merged over the defaults */
  config?: Record<string, any>;
  /** `@custom` values — defaults to the theme's package.json defaults */
  customThemeSettings?: Record<string, any>;
  /** Settings payload override (skips the Content API settings fetch) */
  settingsPayload?: Record<string, any>;
  logging?: LoggingPort;
}

export interface RenderRequestOptions {
  /**
   * Stamp rendered elements with `data-edit="<file>:<line>:<column>"`
   * source markers (slice 3, editor spike — see docs/markers.md). Strictly
   * opt-in: the default render path is byte-identical to a build without
   * this feature. Marker renders use a separate lazily-built engine, so
   * toggling per render is cheap after the first markers render.
   */
  markers?: boolean;
}

export interface ThemeRenderer {
  /**
   * Renders one request. Renders on one renderer are SERIALIZED (an
   * internal per-renderer mutex): the default and marker engines share
   * module-singleton seam state (deps + handlebars binding), so concurrent
   * renders would cross-bind them. Callers may fire render() calls without
   * awaiting — they queue. (Collapsing the two engines so renders can
   * overlap is the slice-5 item in docs/review-backlog.md.)
   */
  render(request: Request, options?: RenderRequestOptions): Promise<Response>;
  /** The default (markers-off) engine — same instance as getEngine('default'). */
  engine: TemplateEngine;
  /**
   * Per-mode engine access — the invalidation handle for callers that need
   * to reach a specific engine's caches (e.g. resetCache()). 'markers'
   * builds the marker engine on first call if no markers render has
   * happened yet.
   */
  getEngine(mode: 'default' | 'markers'): TemplateEngine;
  deps: RendererDeps;
  themeSource: ThemeSource;
}

function redirectResponse(
  status: 301 | 302,
  location: string,
  headers?: Record<string, string>,
): Response {
  return new Response(null, { status, headers: { ...headers, location } });
}

// @tryghost/errors ships `utils` on the CJS default export but as a NAMED
// export in its ES build — resolve whichever is present (same shim as
// helpers/services/handlebars.ts).
const errorsUtils: { isGhostError(err: Error): boolean } =
  (errorsNamespace as any).utils ?? (errors as any).utils;

const messages = {
  pageNotFound: 'Page not found',
  couldNotReadFile: 'Could not read file {file}',
};

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

function plainTextResponse(status: number): Response {
  return new Response(`${status} ${STATUS_TEXT[status] ?? 'Error'}`, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export async function createRenderer(options: CreateRendererOptions): Promise<ThemeRenderer> {
  const themeSource = createThemeSource(options.theme);

  const baseDeps = await loadDefaultDeps({
    siteUrl: options.siteUrl,
    key: options.contentApiKey,
    adminUrl: options.adminUrl,
    fetch: options.fetch,
    // admin:redirects defaults on in Ghost config — /:slug/edit/ 302s to the editor
    config: _.merge({ admin: { redirects: true } }, options.config),
    customThemeSettings: options.customThemeSettings ?? themeSource.customDefaults,
    cardAssetConfig: themeSource.config('card_assets'),
    settingsPayload: options.settingsPayload,
    logging: options.logging,
  });

  /**
   * All engines built for this renderer: the default engine plus, once a
   * markers render happens, the marker engine. Marker emission is a
   * compile-time source transform, and compiled templates/partials are
   * cached per engine — so the two variants live in two engines and the
   * default path's caches (the byte-parity guard) are never touched by a
   * markers render.
   */
  const engines: TemplateEngine[] = [];

  /**
   * Points the seam's handlebars environment at an engine: templates.execute
   * (navigation/pagination partials) must see the engine's partials, and
   * string partial sources (core helper partials) must compile through the
   * engine's compile so there is a single compile path.
   */
  function bindSeamToEngine(target: TemplateEngine): void {
    setHandlebarsInstance(target.handlebars, (source) => target.compile(source));
  }

  function buildEngine(markers: boolean): TemplateEngine {
    const built = new TemplateEngine(themeSource.resolver, {
      // theme-engine/engine.js onCompile: preventIndent matches
      // express-hbs config. With markers on, theme sources are stamped
      // with data-edit markers first (slice 3, docs/markers.md); core
      // helper partials compile with no filename and stay unmarked —
      // they are not theme-editable files.
      onCompile(self, source, filename) {
        const compileSource = markers && filename ? injectEditMarkers(source, filename) : source;
        return self.handlebars.compile(compileSource, { preventIndent: true });
      },
    });
    bindSeamToEngine(built);
    // Core helper partials first; theme partials register on first render
    // and override same-named ones.
    registerCoreHelperPartials(hbs);
    registerGhostHelpers(createEngineHelperRegistrar(built));
    engines.push(built);
    return built;
  }

  const activeTheme: ActiveThemePort = {
    name: themeSource.packageJson?.name ?? 'theme',
    hasTemplate(name: string) {
      return themeSource.hasTemplate(name);
    },
    config(key: string) {
      return themeSource.config(key);
    },
    // active.js:updateTemplateOptions — merge over the engine's globals
    // (every engine, so marker renders see the same template options)
    updateTemplateOptions(opts: Record<string, any>) {
      for (const target of engines) {
        target.updateTemplateOptions(_.merge({}, target.getTemplateOptions(), opts));
      }
    },
  };

  const themeI18n = themeSource.i18n(baseDeps.settings.get('locale') ?? 'en');

  const deps: RendererDeps = {
    ...baseDeps,
    activeTheme,
    themeI18n,
    themeI18next: themeI18n,
  };

  // Module-singleton seam: single renderer active at a time (spec scope guard).
  configureRendererDeps(deps);

  const engine = buildEngine(false);

  // Global template options — @site/@labs/@config/@custom
  engine.updateTemplateOptions(buildGlobalTemplateOptions());

  // The marker engine is built on the first markers render — the default
  // path never pays for it (nor shares caches with it).
  let markerEngine: TemplateEngine | null = null;
  function getMarkerEngine(): TemplateEngine {
    if (!markerEngine) {
      markerEngine = buildEngine(true);
      // inherit the default engine's accumulated global template
      // options (buildGlobalTemplateOptions seed + any activeTheme
      // updates made since)
      markerEngine.updateTemplateOptions(_.merge({}, engine.getTemplateOptions()));
    }
    return markerEngine;
  }

  const safeVersion = deps.settings.get('version');

  /**
   * Ported error path — mirrors frontend/web/middleware/error-handler.js
   * themeErrorRenderer + @tryghost/mw-error-handler prepareError: try the
   * theme's error template hierarchy (error-<code> → error-<c>xx → error),
   * fall back to a plain-text status line (the package ships no
   * defaultViews error.hbs, and raw upstream error messages must not leak
   * into the fallback body).
   */
  async function renderErrorResponse(
    err: any,
    req: {
      path: string;
      originalUrl: string;
      query: Record<string, any>;
      params: Record<string, any>;
    },
    locals: RenderLocals,
    renderEngine: TemplateEngine,
  ): Promise<Response> {
    // prepareError: non-Ghost errors become an InternalServerError whose
    // message is the generic default, never the upstream error text
    const ghostErr: any = errorsUtils.isGhostError(err)
      ? err
      : new errors.InternalServerError({ err });
    const statusCode = typeof ghostErr.statusCode === 'number' ? ghostErr.statusCode : 500;

    deps.logging.error(ghostErr);

    // themeErrorRenderer's template data
    const data = {
      message: ghostErr.message,
      statusCode,
      errorDetails: ghostErr.errorDetails || [],
    };

    try {
      // setTemplate's req.err branch picks from the error hierarchy via
      // the statusCode carried on the response context
      const res: any = { routerOptions: undefined, locals, statusCode };
      templates.setTemplate({ ...req, err: ghostErr } as any, res);

      const root = { ...locals, ...data, _locals: locals };
      const html = await renderEngine.render(`${res._template}.hbs`, root);
      return new Response(html, {
        status: statusCode,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch {
      // no usable error template in the theme (or the error template
      // itself failed) — plain text, status text only
      return plainTextResponse(statusCode);
    }
  }

  async function renderSerialized(
    request: Request,
    renderOptions: RenderRequestOptions = {},
  ): Promise<Response> {
    // Per-render engine pick: the default engine, or the lazily-built
    // marker engine when source markers are requested (docs/markers.md).
    const activeEngine = renderOptions.markers ? getMarkerEngine() : engine;

    // Re-assert this renderer's deps AND handlebars environment on the
    // module singletons so multiple renderer instances (and the two
    // engines of one renderer) can be used sequentially — creating
    // another renderer, or a markers render, repoints both.
    configureRendererDeps(deps);
    bindSeamToEngine(activeEngine);

    const url = new URL(request.url);
    let pathname = url.pathname;

    const subdir = deps.urlUtils.getSubdir();
    if (subdir) {
      // Express mount semantics: strip only on a segment boundary;
      // requests outside the mount never reach the site app → 404
      if (pathname === subdir || pathname.startsWith(subdir + '/')) {
        pathname = pathname.slice(subdir.length) || '/';
      } else {
        return plainTextResponse(404);
      }
    }

    // pretty-urls middleware (server/web/shared/middleware/pretty-urls.js):
    // 301 append the trailing slash; ONLY .md/.txt extensions skip the
    // redirect (the llms markdown route itself is dropped — documented
    // delta, so those paths 404 here). The Location keeps the original
    // (subdir-prefixed) pathname, and permanent redirects carry the
    // origin's caching:301:maxAge Cache-Control header.
    if (!pathname.endsWith('/')) {
      const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
      const dotIndex = lastSegment.lastIndexOf('.');
      const ext = dotIndex > 0 ? lastSegment.slice(dotIndex) : '';
      if (ext === '.md' || ext === '.txt') {
        return plainTextResponse(404);
      }
      return redirectResponse(301, url.pathname + '/' + url.search, {
        'cache-control': `public, max-age=${deps.config.get('caching:301:maxAge')}`,
      });
    }

    // ghost-locals middleware
    const locals: RenderLocals = {
      version: safeVersion,
      safeVersion,
      relativeUrl: pathname,
      member: null,
    };

    // update-local-template-options (anonymous request)
    applyLocalTemplateOptions(locals, null);

    const req = {
      path: pathname,
      originalUrl: pathname + url.search,
      query: Object.fromEntries(url.searchParams),
      params: {} as Record<string, any>,
      member: null,
    };

    // Guard the resolver: malformed percent-encoding throws a
    // ValidationError from matchPermalinkParams (upstream's http-errors
    // 400) — treated as a router fall-through ending in the 404 path,
    // matching the ported rendering/error.ts semantics for theme traffic.
    let candidates: ReturnType<typeof resolveRoutes>;
    try {
      candidates = resolveRoutes(pathname);
    } catch (resolveErr: any) {
      if (resolveErr?.errorType === 'ValidationError') {
        candidates = [];
      } else {
        return renderErrorResponse(resolveErr, req, locals, activeEngine);
      }
    }

    for (const candidate of candidates) {
      if (candidate.controller === 'redirect') {
        if ('absolute' in candidate.redirect) {
          // taxonomy /edit — urlUtils.redirectToAdmin semantics:
          // absolute admin URL, no subdir/query/cache handling
          return redirectResponse(candidate.redirect.status, candidate.redirect.url);
        }
        // page-param page-1 alias — urlUtils.redirect301 semantics:
        // re-prefix the subdir, keep the query string, cache the 301
        return redirectResponse(
          candidate.redirect.status,
          subdir + candidate.redirect.url + url.search,
          {
            'cache-control': `public, max-age=${deps.config.get('caching:301:maxAge')}`,
          },
        );
      }

      const candidateReq = { ...req, params: candidate.params };
      const res = { routerOptions: candidate.routerOptions, locals };

      const result: RenderResult =
        candidate.controller === 'collection'
          ? await collectionController(candidateReq, res)
          : candidate.controller === 'channel'
            ? await channelController(candidateReq, res)
            : await entryController(candidateReq, res);

      if ('next' in result) {
        continue;
      }

      if ('redirect' in result) {
        return redirectResponse(
          result.redirect.status,
          result.redirect.url,
          result.redirect.headers,
        );
      }

      if ('error' in result) {
        return renderErrorResponse(result.error.err, candidateReq, locals, activeEngine);
      }

      // Express res.render semantics: handlebars root =
      // {...res.locals, ...data, _locals: res.locals}
      const root = { ...locals, ...result.render.data, _locals: locals };
      let html: string;
      try {
        html = await activeEngine.render(`${result.render.template}.hbs`, root);
      } catch (renderErr: any) {
        // rendering/renderer.js:40-48 — a missing template/layout
        // (ENOENT upstream, NotFoundError from the virtual fs) becomes
        // an IncorrectUsageError; everything else flows to the error
        // handler as-is
        const mapped =
          renderErr?.errorType === 'NotFoundError'
            ? new errors.IncorrectUsageError({
                message: tpl(messages.couldNotReadFile, {
                  file:
                    /'([^']+)'/.exec(renderErr.message ?? '')?.[1] ??
                    `${result.render.template}.hbs`,
                }),
                err: renderErr,
              })
            : renderErr;
        return renderErrorResponse(mapped, candidateReq, locals, activeEngine);
      }

      return new Response(html, {
        status: 200,
        headers: { 'content-type': result.render.contentType ?? 'text/html; charset=utf-8' },
      });
    }

    // mw-error-handler pageNotFound: no router matched
    return renderErrorResponse(
      new errors.NotFoundError({ message: tpl(messages.pageNotFound) }),
      req,
      locals,
      activeEngine,
    );
  }

  /**
   * Per-renderer render mutex: the seam (deps + handlebars environment) is a
   * module singleton re-asserted at the start of every render, so two
   * in-flight renders — especially one per engine of the SAME renderer —
   * would cross-bind engines mid-render (template-helper partials like
   * navigation resolve against whichever engine was bound last). The spec
   * assumes a single render at a time; the promise chain makes that
   * assumption real instead of trusting callers. A failed render never
   * poisons the chain.
   */
  let renderQueue: Promise<unknown> = Promise.resolve();
  function render(request: Request, renderOptions: RenderRequestOptions = {}): Promise<Response> {
    const next = renderQueue.then(() => renderSerialized(request, renderOptions));
    renderQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  function getEngine(mode: 'default' | 'markers'): TemplateEngine {
    return mode === 'markers' ? getMarkerEngine() : engine;
  }

  return { render, engine, getEngine, deps, themeSource };
}
