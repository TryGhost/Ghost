import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {TemplateEngine, type TemplateResolver} from '../../src/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
    return {
        resolve: name => files[name],
        list: () => Object.keys(files)
    };
}

// End-to-end: a mini Ghost-like theme with a declared layout, a partial, a
// sync helper, an async helper (ghost_head-style) and @site data — the whole
// pipeline composed the way ghost/core's theme-engine drives express-hbs.
//
// The expected string below is the BYTE-EXACT output of rendering the same
// fixture through the real express-hbs fork (ghost/core/node_modules/express-hbs)
// configured like Ghost's theme-engine (preventIndent onCompile) — including
// its whitespace handling around the each-block and the partial.
describe('mini-theme end to end', function () {
    it('renders index.hbs through its layout with partials and helpers', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': [
                '{{!< default}}',
                '{{#contentFor "scripts"}}<script src="/index.js"></script>{{/contentFor}}',
                '<main>',
                '{{#each posts}}',
                '  {{> "card"}}',
                '{{/each}}',
                '</main>'
            ].join('\n'),
            'default.hbs': [
                '<html>',
                '<head><title>{{@site.title}}</title>{{{ghost_head}}}</head>',
                '<body>',
                '{{{body}}}',
                '{{{block "scripts"}}}',
                '</body>',
                '</html>'
            ].join('\n'),
            'partials/card.hbs': '<article>{{uppercase title}}</article>'
        }), {
            templateOptions: {data: {site: {title: 'Fixture & Site'}}},
            onCompile(self, source) {
                return self.handlebars.compile(source, {preventIndent: true});
            }
        });

        engine.registerHelper('uppercase', function (value: string) {
            return String(value).toUpperCase();
        });
        engine.registerAsyncHelper('ghost_head', function (_context, cb) {
            setTimeout(() => {
                cb(new engine.SafeString('<meta name="generator" content="Ghost">'));
            }, 5);
        });

        const html = await engine.render('index.hbs', {
            posts: [{title: 'First'}, {title: 'Second'}]
        });

        assert.equal(html, [
            '<html>',
            '<head><title>Fixture &amp; Site</title><meta name="generator" content="Ghost"></head>',
            '<body>',
            '',
            '<main>',
            '  <article>FIRST</article>  <article>SECOND</article></main>',
            '<script src="/index.js"></script>',
            '</body>',
            '</html>'
        ].join('\n'));
    });
});
