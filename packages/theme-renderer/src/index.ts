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
import _ from 'lodash';
import {TemplateEngine} from './engine/engine.ts';
import {createThemeSource, type ThemeFiles, type ThemeSource} from './theme/theme-source.ts';
import {loadDefaultDeps} from './seam/defaults.ts';
import {configureRendererDeps} from './seam/deps.ts';
import {hbs, setHandlebarsInstance} from './seam/handlebars-env.ts';
import {registerCoreHelperPartials} from './helpers/tpl/partials.ts';
import {registerGhostHelpers} from './helpers/services/register-ghost-helpers.ts';
import {applyLocalTemplateOptions, buildGlobalTemplateOptions} from './rendering/template-options.ts';
import {resolveRoutes} from './routing/resolve.ts';
import collectionController from './routing/controllers/collection.ts';
import {entryController} from './routing/controllers/entry.ts';
import type {ActiveThemePort, HelperRegistrar, LoggingPort, RendererDeps} from './seam/types.ts';
import type {RenderLocals, RenderResult} from './ports.ts';

export * from './engine/index.ts';
export * from './ports.ts';
export {createThemeSource, type ThemeFiles, type ThemeSource} from './theme/theme-source.ts';
export {resolveRoutes, type RouteCandidate, type ResolveRoutesOptions} from './routing/resolve.ts';
export type {RendererDeps, HelperRegistrar} from './seam/types.ts';

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
        }
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

export interface ThemeRenderer {
    render(request: Request): Promise<Response>;
    engine: TemplateEngine;
    deps: RendererDeps;
    themeSource: ThemeSource;
}

function redirectResponse(status: 301 | 302, location: string): Response {
    return new Response(null, {status, headers: {location}});
}

export async function createRenderer(options: CreateRendererOptions): Promise<ThemeRenderer> {
    const themeSource = createThemeSource(options.theme);

    const baseDeps = await loadDefaultDeps({
        siteUrl: options.siteUrl,
        key: options.contentApiKey,
        adminUrl: options.adminUrl,
        fetch: options.fetch,
        // admin:redirects defaults on in Ghost config — /:slug/edit/ 302s to the editor
        config: _.merge({admin: {redirects: true}}, options.config),
        customThemeSettings: options.customThemeSettings ?? themeSource.customDefaults,
        cardAssetConfig: themeSource.config('card_assets'),
        settingsPayload: options.settingsPayload,
        logging: options.logging
    });

    const engine = new TemplateEngine(themeSource.resolver, {
        // theme-engine/engine.js onCompile: preventIndent matches express-hbs config
        onCompile(self, source) {
            return self.handlebars.compile(source, {preventIndent: true});
        }
    });

    const activeTheme: ActiveThemePort = {
        name: themeSource.packageJson?.name ?? 'theme',
        hasTemplate(name: string) {
            return themeSource.hasTemplate(name);
        },
        config(key: string) {
            return themeSource.config(key);
        },
        // active.js:updateTemplateOptions — merge over the engine's globals
        updateTemplateOptions(opts: Record<string, any>) {
            engine.updateTemplateOptions(_.merge({}, engine.getTemplateOptions(), opts));
        }
    };

    const themeI18n = themeSource.i18n(baseDeps.settings.get('locale') ?? 'en');

    const deps: RendererDeps = {
        ...baseDeps,
        activeTheme,
        themeI18n,
        themeI18next: themeI18n
    };

    // Module-singleton seam: single renderer active at a time (spec scope guard).
    configureRendererDeps(deps);

    // Share the engine's handlebars environment with the seam so
    // templates.execute (navigation/pagination partials) finds the partials.
    setHandlebarsInstance(engine.handlebars);

    // Core helper partials first; theme partials register on first render and
    // override same-named ones.
    registerCoreHelperPartials(hbs);

    registerGhostHelpers(createEngineHelperRegistrar(engine));

    // Global template options — @site/@labs/@config/@custom
    engine.updateTemplateOptions(buildGlobalTemplateOptions());

    const safeVersion = deps.settings.get('version');

    async function render(request: Request): Promise<Response> {
        // Re-assert this renderer's deps on the module singleton so multiple
        // renderer instances can be used sequentially.
        configureRendererDeps(deps);

        const url = new URL(request.url);
        let pathname = url.pathname;

        const subdir = deps.urlUtils.getSubdir();
        if (subdir && pathname.startsWith(subdir)) {
            pathname = pathname.slice(subdir.length) || '/';
        }

        // Ghost's slashes middleware: 301 append the trailing slash (skip
        // file-like paths — assets are out of the package's scope).
        if (!pathname.endsWith('/')) {
            const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
            if (lastSegment.includes('.')) {
                return new Response('404 Not Found', {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
            }
            return redirectResponse(301, pathname + '/' + url.search);
        }

        // ghost-locals middleware
        const locals: RenderLocals = {
            version: safeVersion,
            safeVersion,
            relativeUrl: pathname,
            member: null
        };

        // update-local-template-options (anonymous request)
        applyLocalTemplateOptions(locals, null);

        const req = {
            path: pathname,
            originalUrl: pathname + url.search,
            query: Object.fromEntries(url.searchParams),
            params: {} as Record<string, any>,
            member: null
        };

        for (const candidate of resolveRoutes(pathname)) {
            const candidateReq = {...req, params: candidate.params};
            const res = {routerOptions: candidate.routerOptions, locals};

            const result: RenderResult = candidate.controller === 'collection'
                ? await collectionController(candidateReq, res)
                : await entryController(candidateReq, res);

            if ('next' in result) {
                continue;
            }

            if ('redirect' in result) {
                return redirectResponse(result.redirect.status, result.redirect.url);
            }

            if ('error' in result) {
                const err: any = result.error.err;
                const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
                const message = err?.message ?? 'Internal server error';
                deps.logging.error(err);
                return new Response(message, {status, headers: {'content-type': 'text/plain; charset=utf-8'}});
            }

            // Express res.render semantics: handlebars root =
            // {...res.locals, ...data, _locals: res.locals}
            const root = {...locals, ...result.render.data, _locals: locals};
            const html = await engine.render(`${result.render.template}.hbs`, root);

            return new Response(html, {
                status: 200,
                headers: {'content-type': result.render.contentType ?? 'text/html; charset=utf-8'}
            });
        }

        return new Response('404 Not Found', {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
    }

    return {render, engine, deps, themeSource};
}
