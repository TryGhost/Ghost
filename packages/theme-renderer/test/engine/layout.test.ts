import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {TemplateEngine, type TemplateResolver} from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
    return {
        resolve: name => files[name],
        list: () => Object.keys(files)
    };
}

describe('TemplateEngine layouts', function () {
    it('composes a template into its {{!< layout}} declared layout via {{{body}}}', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}<main>{{title}}</main>',
            'default.hbs': '<html>{{{body}}}</html>'
        }));
        const html = await engine.render('index.hbs', {title: 'Home'});
        assert.equal(html, '<html><main>Home</main></html>');
    });

    it('resolves layouts recursively (a layout can declare its own layout)', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}C',
            'default.hbs': '{{!< base}}B[{{{body}}}]',
            'base.hbs': 'A[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[B[C]]');
    });

    // from express-hbs lib/hbs.js layoutPattern — the directive requires
    // whitespace between {{!< and the name
    it('ignores a directive without whitespace after {{!<', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!<default}}C',
            'default.hbs': 'A[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'C');
    });

    it('keeps an explicit non-hbs extension in the layout name', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default.html}}C',
            'default.html': 'A[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[C]');
    });

    it('resolves relative layout paths against the declaring file', async function () {
        const engine = new TemplateEngine(createResolver({
            'posts/post.hbs': '{{!< ../layouts/default}}C',
            'layouts/default.hbs': 'A[{{{body}}}]'
        }));
        const html = await engine.render('posts/post.hbs', {});
        assert.equal(html, 'A[C]');
    });

    it('rejects when the declared layout cannot be resolved', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< missing}}C'
        }));
        await assert.rejects(engine.render('index.hbs', {}), /missing\.hbs/);
    });

    it('uses options.layout when the template declares no layout', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'CC',
            'wrapper.hbs': 'W[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {}, {layout: 'wrapper'});
        assert.equal(html, 'W[CC]');
    });

    it('resolves a dot-relative options.layout against the template directory', async function () {
        const engine = new TemplateEngine(createResolver({
            'posts/post.hbs': 'CC',
            'posts/wrapper.hbs': 'W[{{{body}}}]'
        }));
        const html = await engine.render('posts/post.hbs', {}, {layout: './wrapper'});
        assert.equal(html, 'W[CC]');
    });

    // from express-hbs lib/hbs.js:compileFile — layout precedence: the
    // template-declared layout wins over options.layout
    it('prefers the template-declared layout over options.layout', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< declared}}C',
            'declared.hbs': 'D[{{{body}}}]',
            'other.hbs': 'O[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {}, {layout: 'other'});
        assert.equal(html, 'D[C]');
    });

    it('suppresses even a declared layout when options.layout is false', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}C',
            'default.hbs': 'A[{{{body}}}]'
        }));
        const html = await engine.render('index.hbs', {}, {layout: false});
        assert.equal(html, 'C');
    });

    it('caches layout stacks (layout source changes are not picked up while cached)', async function () {
        const files: Record<string, string> = {
            'index.hbs': '{{!< default}}C',
            'default.hbs': 'one[{{{body}}}]'
        };
        const engine = new TemplateEngine(createResolver(files));
        assert.equal(await engine.render('index.hbs', {}), 'one[C]');
        files['default.hbs'] = 'two[{{{body}}}]';
        assert.equal(await engine.render('index.hbs', {}), 'one[C]');
    });
});

describe('TemplateEngine contentFor/block', function () {
    it('inserts contentFor blocks into the layout block, joining multiple with newline', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}{{#contentFor "scripts"}}<script>a</script>{{/contentFor}}{{#contentFor "scripts"}}<script>b</script>{{/contentFor}}X',
            'default.hbs': '{{{body}}}|{{{block "scripts"}}}'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'X|<script>a</script>\n<script>b</script>');
    });

    it('renders block default content when no contentFor was defined', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}X',
            'default.hbs': '{{{body}}}|{{#block "scripts"}}fallback{{/block}}'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'X|fallback');
    });

    it('renders an empty block when nothing was defined and there is no fallback', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}X',
            'default.hbs': '{{{body}}}|{{{block "scripts"}}}'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'X|');
    });

    it('supports custom contentFor/block helper names', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': '{{!< default}}{{#defineSlot "s"}}val{{/defineSlot}}X',
            'default.hbs': '{{{body}}}|{{{slot "s"}}}'
        }), {contentHelperName: 'defineSlot', blockHelperName: 'slot'});
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'X|val');
    });
});
