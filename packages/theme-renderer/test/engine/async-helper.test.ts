import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {describe, it} from 'vitest';
import {hasResolvers} from '../../src/engine/async-resolver.ts';
import {TemplateEngine, type TemplateResolver} from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
    return {
        resolve: name => files[name],
        list: () => Object.keys(files)
    };
}

describe('TemplateEngine async helpers', function () {
    it('resolves an async helper value into the output (triple-stache, raw)', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{head}}}]'
        }));
        engine.registerAsyncHelper('head', function (_context, cb) {
            setTimeout(() => cb('<meta name="x">'), 5);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[<meta name="x">]');
    });

    // from express-hbs lib/resolver.js — the placeholder id embeds '<_' so
    // double-stache usage escapes the placeholder, and the resolved value is
    // then substituted in escaped form
    it('escapes the resolved value when the helper is used with double braces', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{head}}]'
        }));
        engine.registerAsyncHelper('head', function (_context, cb) {
            setTimeout(() => cb('<b>&</b>'), 5);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[&lt;b&gt;&amp;&lt;/b&gt;]');
    });

    it('inserts SafeString values raw even with double braces (escapeExpression honors toHTML)', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{head}}]'
        }));
        engine.registerAsyncHelper('head', function (_context, cb) {
            setTimeout(() => cb(new engine.SafeString('<meta name="x">')), 5);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[<meta name="x">]');
    });

    // from express-hbs lib/hbs.js:registerAsyncHelper — when the helper fn
    // declares 3+ params it receives (context, options, cb), Ghost's
    // registerAsyncThemeHelper wrapper shape
    it('passes hash options through to three-argument helpers', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{meta "title" mode="og"}}}]'
        }));
        engine.registerAsyncHelper('meta', function (context: unknown, options: unknown, cb: (result: unknown) => void) {
            const hash = (options as {hash: {mode: string}}).hash;
            setTimeout(() => cb(`${String(context)}:${hash.mode}`), 5);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[title:og]');
    });

    it('rejects the render when an async helper throws synchronously', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{head}}}]'
        }));
        engine.registerAsyncHelper('head', function () {
            throw new errors.InternalServerError({message: 'helper exploded'});
        });
        await assert.rejects(engine.render('index.hbs', {}), /helper exploded/);
    });

    // finding 3 — an async helper fn returning a promise that rejects without
    // ever calling cb used to leave its placeholder promise pending forever;
    // the render must settle (reject) promptly instead of hanging
    it('settles (rejects) the render when an async helper returns a rejecting promise', {timeout: 2000}, async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{head}}}]'
        }));
        engine.registerAsyncHelper('head', async function () {
            throw new errors.InternalServerError({message: 'async explosion'});
        });
        await assert.rejects(engine.render('index.hbs', {}), /async explosion/);
    });

    // from express-hbs lib/hbs.js:registerAsyncHelper — the wrapper needs the
    // per-render resolverCache from the context/options root
    it('errors when used outside a render (no resolver cache)', function () {
        const engine = new TemplateEngine(createResolver({}));
        engine.registerAsyncHelper('head', function (_context, cb) {
            cb('x');
        });
        const template = engine.compile('A[{{{head}}}]', 'index.hbs');
        assert.throws(() => template({}), /Could not find resolver cache in async helper head\./);
    });

    it('resolves placeholders nested inside other async helper values', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{outer}}}]'
        }));
        engine.registerAsyncHelper('inner', function (_context, cb) {
            setTimeout(() => cb('IN'), 5);
        });
        engine.registerAsyncHelper('outer', function (this: unknown, context, cb) {
            // renders a sub-template that itself uses an async helper — its
            // placeholder ends up inside outer's resolved value
            const sub = engine.compile('(sub:{{{inner}}})');
            const rendered = sub({resolverCache: (context as {data: {root: {resolverCache: unknown}}}).data.root.resolverCache});
            cb(rendered);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[(sub:IN)]');
    });

    // from express-hbs lib/hbs.js:handleAsync — placeholders registered AFTER
    // the first Promise.all snapshot (late, inside another helper's async
    // work) are picked up by the multi-pass loop
    it('resolves placeholders registered during another helper´s async work (multi-pass)', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{outer}}}]'
        }));
        engine.registerAsyncHelper('inner', function (_context, cb) {
            setTimeout(() => cb('LATE'), 5);
        });
        engine.registerAsyncHelper('outer', function (context, cb) {
            const resolverCache = (context as {data: {root: {resolverCache: unknown}}}).data.root.resolverCache;
            setTimeout(() => {
                // 'inner' registers into the cache only now — after render
                // finished and the first resolution pass has snapshotted
                const sub = engine.compile('(sub:{{{inner}}})');
                cb(sub({resolverCache}));
            }, 5);
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[(sub:LATE)]');
    });

    // Deviation from express-hbs: an unresolvable placeholder-lookalike makes
    // express-hbs loop forever; we fail fast instead
    it('rejects instead of looping forever on an unresolvable placeholder lookalike', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{{fake}}}]'
        }));
        engine.registerAsyncHelper('fake', function (_context, cb) {
            cb('__aSyNcId__<_NOTREGIS__');
        });
        await assert.rejects(engine.render('index.hbs', {}), /Unable to resolve async helper placeholders/);
    });
});

describe('hasResolvers quirk', function () {
    // QUIRK (from express-hbs lib/resolver.js:hasResolvers): uses search() > 0,
    // not >= 0 — a placeholder at position 0 of the text is NOT detected
    it('does not detect a placeholder at position 0 (search > 0, not >= 0)', function () {
        assert.equal(hasResolvers('__aSyNcId__<_ABCDEFGH__'), false);
        assert.equal(hasResolvers(' __aSyNcId__<_ABCDEFGH__'), true);
        assert.equal(hasResolvers('no placeholders here'), false);
    });
});
