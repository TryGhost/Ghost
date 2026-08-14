import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {TemplateEngine, type TemplateResolver} from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
    return {
        resolve: name => files[name],
        list: () => Object.keys(files)
    };
}

describe('TemplateEngine partials', function () {
    it('registers partials from the resolver partials/ directory', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> card}}]',
            'partials/card.hbs': '<div>{{title}}</div>'
        }));
        const html = await engine.render('index.hbs', {title: 'Hi'});
        assert.equal(html, 'A[<div>Hi</div>]');
    });

    // from express-hbs lib/hbs.js:cachePartials — nested directories become
    // slash-separated partial names
    it('names partials in nested directories with their relative path', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> icons/logo}}]',
            'partials/icons/logo.hbs': '<svg>logo</svg>'
        }));
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[<svg>logo</svg>]');
    });

    // from express-hbs lib/hbs.js:cachePartials — readdirp fileFilter only
    // matches the configured extname
    it('ignores files without the configured extension', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> readme}}]',
            'partials/readme.txt': 'not a partial'
        }));
        await assert.rejects(engine.render('index.hbs', {}), /could not be found/);
    });

    // from express-hbs lib/hbs.js:cachePartials — partials directories are
    // read in series, so later directories overwrite same-named partials
    it('lets later partials directories override earlier ones', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> card}}]',
            'core-templates/card.hbs': 'core',
            'theme-partials/card.hbs': 'theme'
        }), {partialsDirs: ['core-templates', 'theme-partials']});
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'A[theme]');
    });

    it('skips listed partial files the resolver cannot resolve (inconsistent resolver)', async function () {
        const engine = new TemplateEngine({
            resolve: name => (name === 'index.hbs' ? 'ok!' : undefined),
            list: () => ['index.hbs', 'partials/ghost.hbs']
        });
        const html = await engine.render('index.hbs', {});
        assert.equal(html, 'ok!');
    });

    it('supports explicitly registered partials', async function () {
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> pagination}}]'
        }));
        engine.registerPartial('pagination', '<nav>{{page}}</nav>', 'core/pagination.hbs');
        const html = await engine.render('index.hbs', {page: '1'});
        assert.equal(html, 'A[<nav>1</nav>]');
    });

    it('compiles partials through the onCompile hook (filename included)', async function () {
        const seen: Array<string | undefined> = [];
        const engine = new TemplateEngine(createResolver({
            'index.hbs': 'A[{{> card}}]',
            'partials/card.hbs': 'card!'
        }), {
            onCompile(self, source, filename) {
                seen.push(filename);
                return self.handlebars.compile(source, {preventIndent: true});
            }
        });
        await engine.render('index.hbs', {});
        assert.ok(seen.includes('partials/card.hbs'));
        assert.ok(seen.includes('index.hbs'));
    });

    // from express-hbs lib/hbs.js:___express — partials are re-read on every
    // render when caching is disabled
    it('re-registers partials on each render when cache is disabled', async function () {
        const files: Record<string, string> = {
            'index.hbs': 'A[{{> card}}]',
            'partials/card.hbs': 'one'
        };
        const engine = new TemplateEngine(createResolver(files), {cache: false});
        assert.equal(await engine.render('index.hbs', {}), 'A[one]');
        files['partials/card.hbs'] = 'two';
        assert.equal(await engine.render('index.hbs', {}), 'A[two]');
    });

    it('does not re-read partials between renders when caching', async function () {
        const files: Record<string, string> = {
            'index.hbs': 'A[{{> card}}]',
            'partials/card.hbs': 'one'
        };
        const engine = new TemplateEngine(createResolver(files));
        assert.equal(await engine.render('index.hbs', {}), 'A[one]');
        files['partials/card.hbs'] = 'two';
        assert.equal(await engine.render('index.hbs', {}), 'A[one]');
    });
});
