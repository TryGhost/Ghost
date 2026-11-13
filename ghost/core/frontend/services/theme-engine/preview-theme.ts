/**
 * # Preview Theme
 *
 * An installed theme rendered for one request without being activated, so
 * Ghost Admin can show the site in any of its themes. It reads like the active
 * theme (see active.js) but renders with an engine of its own, never mounts
 * into Express, and never touches the live site's translations or settings.
 */
import path from 'path';
import _ from 'lodash';
import type { NextFunction, Request, Response } from 'express';

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const debug = require('@tryghost/debug')('frontend:theme-preview');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const engine = require('./engine');
const active = require('./active');
const previewToken = require('../../../shared/theme-preview-token');
const previewContext = require('./preview-context');
const preview = require('./preview');

const { ActiveTheme } = active;

type RenderCallback = (err: Error | null, html?: string) => void;
type RenderFunction = (file: string, options: object, cb: RenderCallback) => void;

interface CustomSettingDefinition {
  default?: unknown;
}

export class PreviewTheme extends ActiveTheme {
  private readonly _engine: {
    updateTemplateOptions(options: object): void;
    getTemplateOptions(): object;
  };
  private readonly _render: RenderFunction;

  constructor(settings: object, loadedTheme: object, checkedTheme: object) {
    super(settings, loadedTheme, checkedTheme);

    const { hbs, render } = engine.createPreviewEngine(this.partialsPath, this.path);
    this._engine = hbs;
    this._render = render;
  }

  get engine() {
    return this._engine;
  }

  get isPreview() {
    return true;
  }

  // Renders with its own engine, so there is nothing to mount
  get mounted() {
    return true;
  }

  mount() {}

  // The live site's translations stay the active theme's
  initI18n() {}

  updateTemplateOptions(options: object) {
    this._engine.updateTemplateOptions(_.merge({}, this._engine.getTemplateOptions(), options));
  }

  /** What `@custom` holds before Admin's preview values: each setting's default */
  get customSettingDefaults(): Record<string, unknown> {
    const definitions: Record<string, CustomSettingDefinition> = this.customSettingDefinitions;
    return _.mapValues(definitions, (definition) =>
      definition.default === undefined ? null : definition.default,
    );
  }

  /**
   * Renders a template the way res.render would, with this theme's engine
   *
   * @param name - a template of this theme, or an absolute path
   */
  render(res: Response, name: string, data: object, cb: RenderCallback) {
    const app = res.app;
    let file = path.isAbsolute(name) ? name : path.join(this.path, name);

    if (!path.extname(file)) {
      file += '.hbs';
    }

    // What res.render passes a view engine; helpers such as ghost_head read _locals
    const options = Object.assign({}, app.locals, res.locals, data, {
      _locals: res.locals,
      settings: Object.assign({}, app.settings, { views: this.path }),
      cache: app.enabled('view cache'),
    });

    this._render(file, options, cb);
  }
}

// The most recently previewed themes, by name: each holds an engine with compiled
// templates, so only a few are kept. An entry stands for one upload of the theme
// (the theme list's entry), so uploading it again rebuilds it; a failed load is
// kept too, so a broken theme isn't checked again on every request.
const MAX_CACHED_THEMES = 3;

// As Ghost's private responses have it (shared cache-control middleware)
const PRIVATE_CACHE_CONTROL =
  'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0';

interface CacheEntry {
  loadedTheme: object;
  theme: Promise<PreviewTheme>;
}

const cache = new Map<string, CacheEntry>();
export { cache as _cache };

/**
 * @param name - an installed theme
 * @returns null when no theme by that name is installed
 */
export async function load(name: string): Promise<PreviewTheme | null> {
  // Required here: the proxy loads after the theme engine
  const { themes } = require('../proxy');

  const loadedTheme: object | undefined = themes.get(name);
  if (!loadedTheme) {
    cache.delete(name);
    return null;
  }

  const cached = cache.get(name);
  if (cached && cached.loadedTheme === loadedTheme) {
    // Most recently used last
    cache.delete(name);
    cache.set(name, cached);
    debug(`"${name}" from the cache`);
    return cached.theme;
  }

  const theme = (async () => {
    const started = Date.now();
    const checkedTheme = await themes.check(name, loadedTheme);
    debug(`"${name}" checked in ${Date.now() - started}ms`);

    if (!themes.canActivate(checkedTheme)) {
      throw new errors.ValidationError({
        message: `The theme "${name}" has errors, so it can't be previewed. Fix them and upload it again.`,
      });
    }

    return new PreviewTheme({ locale: settingsCache.get('locale') }, loadedTheme, checkedTheme);
  })();
  // Callers handle the failure. Only the theme's own errors are kept: anything else
  // (a file system or gscan hiccup) is tried again on the next request
  const entry: CacheEntry = { loadedTheme, theme };
  theme.catch((err: Error) => {
    logging.warn(`Theme preview: "${name}" can't be previewed: ${err.message}`);
    if (!(err instanceof errors.ValidationError) && cache.get(name) === entry) {
      cache.delete(name);
    }
  });

  cache.delete(name);
  cache.set(name, entry);
  while (cache.size > MAX_CACHED_THEMES) {
    cache.delete(cache.keys().next().value as string);
  }

  return theme;
}

/**
 * Runs the rest of a request with the theme it previews: a page Admin asks for
 * with a preview token, or one of that theme's assets (under the token in its
 * path). Without a valid token, or for the active theme, nothing changes.
 */
export function middleware(req: Request, res: Response, next: NextFunction) {
  // The cheap checks first: almost every request has no token at all
  const assetRequest: { token: string; assetPath: string } | null = preview.getAssetRequest(req);
  const token: string | null = assetRequest ? assetRequest.token : preview.getPageToken(req);
  if (!token || !labs.isSet('themePreview')) {
    return next();
  }

  // Whatever comes next (the previewed theme, an error, or the active theme's file
  // under a preview path) is for this preview only, never to be cached as the site's
  res.set('Cache-Control', PRIVATE_CACHE_CONTROL);

  // A page needs a page token; an asset, its preview's asset token
  const name: string | null = assetRequest
    ? previewToken.verifyAsset(token)
    : previewToken.verify(token);
  if (!name) {
    // Never the live site instead: a preview that silently showed the active theme would mislead
    return next(
      assetRequest
        ? new errors.NotFoundError()
        : new errors.NoPermissionError({
            message: 'This theme preview has expired. Open it again from Ghost Admin.',
          }),
    );
  }

  if (assetRequest) {
    // From here on, the request is for that asset in the previewed theme
    const queryIndex = req.url.indexOf('?');
    req.url = assetRequest.assetPath + (queryIndex === -1 ? '' : req.url.slice(queryIndex));
  }

  const activeTheme = active.get();
  if (activeTheme && activeTheme.name === name) {
    return next();
  }

  load(name).then(
    (theme) => {
      if (!theme) {
        return next(
          new errors.NotFoundError({ message: `No theme called "${name}" is installed.` }),
        );
      }

      debug(`previewing "${name}" for ${req.method} ${req.path}`);
      const assetToken = assetRequest ? token : previewToken.assetTokenFor(token);
      return previewContext.run(theme, assetToken, next);
    },
    (err) => next(err),
  );
}
