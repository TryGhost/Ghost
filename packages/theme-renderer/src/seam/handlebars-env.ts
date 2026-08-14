/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The package's replacement for
 * ghost/core/core/frontend/services/handlebars.js — the single module every
 * copied helper binds its handlebars runtime through.
 *
 * A plain module exporting the handlebars runtime: SafeString /
 * escapeExpression / Utils / createFrame are shared statics across
 * `Handlebars.create()` environments, so helpers may snapshot them at import
 * time. The *environment* (partials, helper registration) is swappable via
 * `setHandlebarsInstance()` — the assembly step points it at the engine's
 * instance so helpers and templates share one runtime.
 */
import Handlebars from 'handlebars';
import {getRendererDeps} from './deps.ts';

type HandlebarsEnv = typeof Handlebars;

export const hbs: {
    handlebars: HandlebarsEnv;
    SafeString: typeof Handlebars.SafeString;
    Utils: typeof Handlebars.Utils;
    escapeExpression: typeof Handlebars.Utils.escapeExpression;
    registerPartial: (name: string, source?: any) => void;
} = {
    handlebars: Handlebars.create(),
    SafeString: Handlebars.SafeString,
    Utils: Handlebars.Utils,
    escapeExpression: Handlebars.Utils.escapeExpression,
    registerPartial(name: string, source?: any) {
        // express-hbs registers partials pre-compiled (templates.execute calls
        // `partial(context, data)` directly); compile string sources the same
        // way the theme-engine does (preventIndent, see engine.js onCompile).
        const compiled = typeof source === 'string'
            ? hbs.handlebars.compile(source, {preventIndent: true})
            : source;
        hbs.handlebars.registerPartial(name, compiled);
    }
};

export function setHandlebarsInstance(instance: HandlebarsEnv): void {
    hbs.handlebars = instance;
}

export const SafeString = Handlebars.SafeString;
export const escapeExpression = Handlebars.Utils.escapeExpression;

// The local template thing (services/handlebars.js exports `templates`)
export {default as templates} from './template.ts';

// TODO upstream-mirror: these need a more sensible home (services/handlebars.js)
export * as localUtils from './local-utils.ts';

/**
 * Theme i18n ports. The originals (theme-engine/i18n, theme-engine/i18next)
 * load theme locale JSON from the filesystem; here translation is injected via
 * RendererDeps.themeI18n/.themeI18next. `_strings`/`_i18n` are truthy and
 * `init()` a no-op so the copied t.js helper skips its lazy-init branch.
 */
export const themeI18n = {
    _strings: true,
    init(_options?: unknown) {
        // initialisation is the seam configurer's concern
    },
    t(key: string, bindings?: Record<string, any>) {
        return getRendererDeps().themeI18n.t(key, bindings);
    }
};

export const themeI18next = {
    _i18n: true,
    init(_options?: unknown) {
        // initialisation is the seam configurer's concern
    },
    t(key: string, bindings?: Record<string, any>) {
        return getRendererDeps().themeI18next.t(key, bindings);
    }
};
