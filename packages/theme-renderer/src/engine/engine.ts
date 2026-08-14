import Handlebars from 'handlebars';
import errors from '@tryghost/errors';
import {done as resolverDone, hasResolvers, resolve as resolverResolve, TOKEN_PATTERN, unescapeToken, type ResolverCache} from './async-resolver.ts';
import {dirname, extname, resolvePath} from './paths.ts';
import {mergeDeep} from './merge.ts';
import {getLocalTemplateOptions, updateLocalTemplateOptions} from './local-template-options.ts';

/**
 * Regex pattern for layout directive. {{!< layout }}
 * from express-hbs lib/hbs.js:layoutPattern
 */
const layoutPattern = /{{!<\s+([A-Za-z0-9._\-/]+)\s*}}/;

/**
 * Virtual filesystem over theme files, keyed by relative posix path
 * (e.g. 'index.hbs', 'partials/card.hbs'). Replaces express-hbs's direct
 * fs/readdirp access so the engine can run in a Web Worker.
 */
export interface TemplateResolver {
    resolve(name: string): string | undefined;
    list(): string[];
}

export type CompiledTemplate = Handlebars.TemplateDelegate & {__filename?: string};

export type TemplateOptions = Record<string, unknown>;

export type AsyncHelperCallback = (result: unknown) => void;

/**
 * An async helper receives (context, cb) — or (context, options, cb) when it
 * declares three or more parameters (express-hbs dispatches on fn.length).
 */
export type AsyncHelper =
    | ((this: unknown, context: unknown, cb: AsyncHelperCallback) => unknown)
    | ((this: unknown, context: unknown, options: unknown, cb: AsyncHelperCallback) => unknown);

export type RenderContext = Record<string, unknown>;

export interface RenderOptions {
    /**
     * express-hbs layout override semantics: a string names a layout to use
     * when the template declares none; an explicitly falsy value suppresses
     * layouts entirely (even a template-declared one).
     */
    layout?: string | false;
}

export interface TemplateEngineOptions {
    /** Template file extension, default '.hbs' (express-hbs `extname`) */
    extname?: string;
    /**
     * Compile hook. Receives the engine, the template source and the virtual
     * filename — the filename is the future source-marker injection point.
     * Mirrors express-hbs `onCompile(self, source, filename)`.
     */
    onCompile?: (engine: TemplateEngine, source: string, filename?: string) => Handlebars.TemplateDelegate;
    /** Cache compiled templates/layouts between renders. Default true. */
    cache?: boolean;
    /** Engine-wide handlebars runtime options (express-hbs `templateOptions`) */
    templateOptions?: TemplateOptions;
    /** Name of the content-definition helper, default 'contentFor' */
    contentHelperName?: string;
    /** Name of the block-insertion helper, default 'block' */
    blockHelperName?: string;
    /**
     * Virtual directories (within the resolver) scanned for partials, in
     * order — later directories override same-named partials, matching
     * express-hbs's in-series `partialsDir` array. Default ['partials'].
     */
    partialsDirs?: string[];
}

type BlockCache = Record<string, string[]>;

export class TemplateEngine {
    public readonly handlebars: typeof Handlebars;
    public readonly SafeString: typeof Handlebars.SafeString;
    public readonly Utils: typeof Handlebars.Utils;
    public readonly escapeExpression: typeof Handlebars.Utils.escapeExpression;

    private readonly resolver: TemplateResolver;
    private readonly extname: string;
    private readonly onCompile?: TemplateEngineOptions['onCompile'];
    private readonly useCache: boolean;
    private templateOptions: TemplateOptions;

    private readonly partialsDirs: string[];
    private templateCache = new Map<string, {source: string; template: CompiledTemplate}>();
    private layoutCache = new Map<string, CompiledTemplate[]>();
    private isPartialCachingComplete = false;

    constructor(resolver: TemplateResolver, options: TemplateEngineOptions = {}) {
        this.resolver = resolver;
        this.extname = options.extname ?? '.hbs';
        this.onCompile = options.onCompile;
        this.useCache = options.cache ?? true;
        this.templateOptions = options.templateOptions ?? {};
        this.partialsDirs = options.partialsDirs ?? ['partials'];

        this.handlebars = Handlebars.create();
        this.SafeString = this.handlebars.SafeString;
        this.Utils = this.handlebars.Utils;
        this.escapeExpression = this.handlebars.Utils.escapeExpression;

        // from express-hbs lib/hbs.js:express3 — the `block` helper
        this.handlebars.registerHelper(options.blockHelperName ?? 'block', function (this: unknown, name: string, helperOptions: Handlebars.HelperOptions) {
            let val: string | string[] | undefined = (helperOptions.data.root.blockCache as BlockCache)[name];
            if (val === undefined && typeof helperOptions.fn === 'function') {
                val = helperOptions.fn(this);
            }
            if (Array.isArray(val)) {
                val = val.join('\n');
            }
            return val;
        });

        // Pass 'this' as context of helper function to don't lose context call of helpers.
        // from express-hbs lib/hbs.js:express3 — the `contentFor` helper
        const content = this.content.bind(this);
        this.handlebars.registerHelper(options.contentHelperName ?? 'contentFor', function (this: unknown, name: string, helperOptions: Handlebars.HelperOptions) {
            return content(name, helperOptions, this);
        });
    }

    // from express-hbs lib/hbs.js:content — defines content for a named block
    // declared in a layout
    private content(name: string, options: Handlebars.HelperOptions, context: unknown): void {
        const blockCache = options.data.root.blockCache as BlockCache;
        const block = blockCache[name] || (blockCache[name] = []);
        block.push(options.fn(context));
    }

    // from express-hbs lib/hbs.js:registerHelper
    registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
        this.handlebars.registerHelper(name, fn);
    }

    // from express-hbs lib/hbs.js:registerAsyncHelper — the helper
    // synchronously returns a unique placeholder id; the promised value is
    // string-replaced into the output after rendering completes
    registerAsyncHelper(name: string, fn: (this: unknown, context: unknown, cb: AsyncHelperCallback) => unknown): void;
    registerAsyncHelper(name: string, fn: (this: unknown, context: unknown, options: unknown, cb: AsyncHelperCallback) => unknown): void;
    registerAsyncHelper(name: string, fn: AsyncHelper): void {
        this.handlebars.registerHelper(name, function (this: unknown, context?: unknown, options?: Handlebars.HelperOptions) {
            const getRootCache = (value: unknown): ResolverCache | undefined => {
                return (value as {data?: {root?: {resolverCache?: ResolverCache}}} | undefined)?.data?.root?.resolverCache;
            };
            const resolverCache = (this as {resolverCache?: ResolverCache} | null)?.resolverCache ||
                getRootCache(context) ||
                getRootCache(options);
            if (!resolverCache) {
                throw new errors.IncorrectUsageError({message: `Could not find resolver cache in async helper ${name}.`});
            }
            if (options && fn.length > 2) {
                const resolveFunc = (arr: unknown, cb: AsyncHelperCallback): unknown => {
                    const [ctx, opts] = arr as [unknown, unknown];
                    return (fn as (this: unknown, c: unknown, o: unknown, cb2: AsyncHelperCallback) => unknown).call(this, ctx, opts, cb);
                };
                return resolverResolve(resolverCache, resolveFunc, [context, options]);
            }
            return resolverResolve(resolverCache, (fn as (this: unknown, c: unknown, cb2: AsyncHelperCallback) => unknown).bind(this), context);
        });
    }

    // from express-hbs lib/hbs.js:registerPartial — partials are compiled
    // through this.compile so the onCompile hook (and filename threading)
    // applies to them too
    registerPartial(name: string, source: string, filename?: string): void {
        this.handlebars.registerPartial(name, this.compile(source, filename));
    }

    // from express-hbs lib/hbs.js:cachePartials — scans the partials
    // directories in series (later dirs override earlier same-named partials);
    // readdirp over the fs is replaced by filtering the resolver's listing
    private cachePartials(): void {
        for (const dir of this.partialsDirs) {
            const prefix = dir.endsWith('/') ? dir : `${dir}/`;
            for (const filePath of this.resolver.list()) {
                if (!filePath.startsWith(prefix)) {
                    continue;
                }
                // readdirp fileFilter: '*' + extname
                if (extname(filePath) !== this.extname) {
                    continue;
                }
                const source = this.resolver.resolve(filePath);
                if (source === undefined) {
                    continue;
                }
                const relative = filePath.slice(prefix.length);
                const relativeDir = dirname(relative);
                const basename = relative.slice(relative.lastIndexOf('/') + 1, -this.extname.length);
                const name = (relativeDir === '.' ? '' : `${relativeDir}/`) + basename;
                this.registerPartial(name, source, filePath);
            }
        }
        this.isPartialCachingComplete = true;
    }

    // from express-hbs lib/hbs.js:compile
    compile(source: string, filename?: string): CompiledTemplate {
        // Handlebars has a bug with comment only partial causes errors. This must
        // be a string so the block below can add a space.
        if (typeof source !== 'string') {
            throw new errors.IncorrectUsageError({message: 'registerPartial must be a string for empty comment workaround'});
        }
        if (source.indexOf('}}') === source.length - 2) {
            source += ' ';
        }

        let compiled: CompiledTemplate;
        if (this.onCompile) {
            compiled = this.onCompile(this, source, filename);
        } else {
            compiled = this.handlebars.compile(source);
        }

        // express-hbs relativizes filename against viewsDir/cwd here; our
        // virtual filenames are already theme-relative, so thread it through as-is.
        if (filename) {
            compiled.__filename = filename;
        }
        return compiled;
    }

    resetCache(): void {
        this.templateCache.clear();
        this.layoutCache.clear();
    }

    /**
     * Renders `templateName` from the resolver with the given context.
     * Ported from express-hbs lib/hbs.js:___express, minus the Express
     * plumbing (settings.views, _locals merging, beautify, defaultLayout).
     */
    async render(templateName: string, context: RenderContext = {}, options: RenderOptions = {}): Promise<string> {
        const locals = context;
        locals.blockCache = {};
        locals.resolverCache = {} as ResolverCache;

        // from express-hbs lib/hbs.js:___express — force reloading of all
        // partials on every render if caching is not used
        if (!this.useCache || !this.isPartialCachingComplete) {
            this.cachePartials();
        }

        const {source, template} = this.getSourceTemplate(templateName);

        // from express-hbs lib/hbs.js:___express parseLayout — always parsed,
        // even when options.layout later suppresses it
        const declaredLayout = this.declaredLayoutFile(source, templateName);
        const declaredLayoutTemplates = declaredLayout ? this.cacheLayout(declaredLayout, this.useCache) : null;

        // from express-hbs lib/hbs.js:compileFile — layout precedence
        let layoutTemplates: CompiledTemplate[] | null;
        if (typeof options.layout !== 'undefined' && !options.layout) {
            // If options.layout is falsy, behave as if no layout should be used - suppress defaults
            layoutTemplates = null;
        } else if (declaredLayoutTemplates) {
            // 1. Layout specified in template
            layoutTemplates = declaredLayoutTemplates;
        } else if (typeof options.layout !== 'undefined' && options.layout) {
            // 2. Layout specified by options from render
            layoutTemplates = this.cacheLayout(this.layoutPath(templateName, options.layout), this.useCache);
        } else {
            // render without a layout (defaultLayout support intentionally dropped)
            layoutTemplates = null;
        }

        const html = this.renderWithLayouts(template, locals, layoutTemplates);

        return this.handleAsync(locals.resolverCache as ResolverCache, html);
    }

    // from express-hbs lib/hbs.js:declaredLayoutFile — finds the declared
    // layout in a template source, resolved against the declaring file.
    // (The layoutsDir branch is dropped: Ghost never configures layoutsDir.)
    private declaredLayoutFile(source: string, filename: string): string | undefined {
        const layout = source.match(layoutPattern)?.[1];
        if (layout !== undefined) {
            return resolvePath(dirname(filename), layout);
        }
        return undefined;
    }

    // from express-hbs lib/hbs.js:layoutPath — dot-relative layouts resolve
    // against the template's directory, otherwise against the virtual root
    // (express-hbs falls back to viewsDir when no layoutsDir is set)
    private layoutPath(filename: string, layout: string): string {
        if (layout[0] === '.') {
            return resolvePath(dirname(filename), layout);
        }
        return resolvePath('', layout);
    }

    /**
     * Compiles a layout, recursively resolving parent layouts declared via
     * {{!< parent}}, returning the stack [outermost, ..., innermost].
     * from express-hbs lib/hbs.js:cacheLayout (fs.readFile → resolver,
     * callbacks → sync; restrictLayoutsTo dropped — the resolver is the boundary)
     */
    private cacheLayout(layoutFile: string, useCache: boolean): CompiledTemplate[] {
        // assume hbs extension
        if (extname(layoutFile) === '') {
            layoutFile += this.extname;
        }

        // express-hbs reads the cache regardless of useCache; it only writes when caching
        const cached = this.layoutCache.get(layoutFile);
        if (cached) {
            return cached;
        }

        const source = this.resolver.resolve(layoutFile);
        if (source === undefined) {
            throw new errors.NotFoundError({message: `Unable to resolve layout '${layoutFile}'`});
        }

        // File path of eventual declared parent layout, resolved recursively
        const parentLayoutFile = this.declaredLayoutFile(source, layoutFile);
        const layouts = parentLayoutFile ? this.cacheLayout(parentLayoutFile, useCache).slice(0) : [];
        layouts.push(this.compile(source, layoutFile));
        if (useCache) {
            this.layoutCache.set(layoutFile, layouts.slice(0));
        }
        return layouts;
    }

    // from express-hbs lib/hbs.js:getSourceTemplate
    private getSourceTemplate(name: string): {source: string; template: CompiledTemplate} {
        if (this.useCache) {
            const info = this.templateCache.get(name);
            if (info) {
                return info;
            }
        }

        const source = this.resolver.resolve(name);
        if (source === undefined) {
            throw new errors.NotFoundError({message: `Unable to resolve template '${name}'`});
        }

        const template = this.compile(source, name);
        const info = {source, template};
        if (this.useCache) {
            this.templateCache.set(name, info);
        }
        return info;
    }

    // from express-hbs lib/hbs.js:render — layouts render bottom-to-top of the
    // stack, each receiving the previous html as `body`
    private renderWithLayouts(template: CompiledTemplate, locals: RenderContext, layoutTemplates: CompiledTemplate[] | null): string {
        const stack = layoutTemplates ?? [];
        let html = this.renderTemplate(template, locals);
        // walk the stack from innermost layout to outermost
        for (const layoutTemplate of [...stack].reverse()) {
            locals.body = html;
            html = this.renderTemplate(layoutTemplate, locals);
        }
        return html;
    }

    // from express-hbs lib/hbs.js:renderTemplate
    private renderTemplate(template: CompiledTemplate, locals: RenderContext): string {
        try {
            const localTemplateOptions = this.getLocalTemplateOptions(locals);
            const localsClone = {...locals};
            this.updateLocalTemplateOptions(localsClone, undefined);
            return template(localsClone, mergeDeep({}, this.templateOptions, localTemplateOptions));
        } catch (err) {
            if (err instanceof Error && err.message) {
                err.message = `[${template.__filename}] ${err.message}`;
                throw err;
            }
            if (typeof err === 'string') {
                throw new errors.IncorrectUsageError({message: `[${template.__filename}] ${err}`});
            }
            throw err;
        }
    }

    // from express-hbs lib/hbs.js:getTemplateOptions
    getTemplateOptions(): TemplateOptions {
        return this.templateOptions;
    }

    // from express-hbs lib/hbs.js:updateTemplateOptions — per-engine-instance,
    // unlike Ghost's process-global express-hbs singleton
    updateTemplateOptions(templateOptions: TemplateOptions): void {
        this.templateOptions = templateOptions;
    }

    // from express-hbs lib/hbs.js:getLocalTemplateOptions — delegates to the
    // shared local-template-options module (the single owner of the
    // `locals._templateOptions` key)
    getLocalTemplateOptions(locals: RenderContext): TemplateOptions {
        return getLocalTemplateOptions(locals);
    }

    // from express-hbs lib/hbs.js:updateLocalTemplateOptions
    updateLocalTemplateOptions(locals: RenderContext, localTemplateOptions: TemplateOptions | undefined): void {
        updateLocalTemplateOptions(locals, localTemplateOptions);
    }

    // from express-hbs lib/hbs.js:___express replaceValue — replaces both the
    // raw placeholder id and its escaped form, with matching value escaping.
    // PERF rewrite (worker-readiness): upstream scanned the text once per
    // cache entry (O(entries × length) per generation); this is a single
    // anchored-RegExp pass over the fixed token grammar, looking each match up
    // in the values map. Unknown tokens are left in place — exactly what
    // upstream's per-id replace would do — and the generation loop's
    // no-progress check handles them. Replacement semantics preserved:
    // raw-form matches coerce the value like String.replace's replacer
    // ToString does (SafeStrings insert raw); escaped-form matches insert
    // `escapeExpression(value)` (SafeStrings unwrap via toHTML).
    private substituteTokens(values: Record<string, unknown>, text: unknown): unknown {
        if (typeof text === 'string') {
            return text.replace(TOKEN_PATTERN, (token) => {
                if (Object.prototype.hasOwnProperty.call(values, token)) {
                    return String(values[token]);
                }
                const rawId = unescapeToken(token);
                if (rawId !== token && Object.prototype.hasOwnProperty.call(values, rawId)) {
                    return this.escapeExpression(values[rawId] as string);
                }
                return token;
            });
        }
        return text;
    }

    // from express-hbs lib/hbs.js:___express handleAsync — loops until no
    // placeholder tokens remain (values may themselves contain placeholders,
    // and helpers can register NEW cache entries during another helper's async
    // work — resolverDone re-snapshots the cache each generation)
    private async handleAsync(resolverCache: ResolverCache, html: string): Promise<string> {
        let res = html;
        for (;;) {
            const values = await resolverDone(resolverCache);
            for (const key of Object.keys(values)) {
                values[key] = this.substituteTokens(values, values[key]);
            }
            const replaced = this.substituteTokens(values, res) as string;
            if (!hasResolvers(replaced)) {
                return replaced;
            }
            if (replaced === res) {
                // Deviation from express-hbs: an unresolvable placeholder-like
                // token would loop forever there; we bail out instead.
                throw new errors.IncorrectUsageError({message: 'Unable to resolve async helper placeholders in rendered output'});
            }
            res = replaced;
        }
    }
}
