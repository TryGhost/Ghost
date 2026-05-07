const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const request = require('supertest');
const sinon = require('sinon');

const themeEngine = require('../../../../../core/frontend/services/theme-engine');
const staticTheme = require('../../../../../core/frontend/web/middleware/static-theme');

describe('staticTheme', function () {
    let activeThemeStub;
    let app;
    let themePath;

    async function writeThemeFiles() {
        const files = {
            'mytemplate.hbs': '<h1>template</h1>',
            'README.md': '# README',
            'sample.json': '{"private":true}',
            'yarn.lock': 'lockfile',
            'gulpfile.js': 'module.exports = {};',
            'Gulpfile.js': 'module.exports = {};',
            'package.json': '{"private":true}',
            'ghost.log': 'log',
            'myvalidfile.css': 'body { color: red; }',
            'myvalidfile.js': 'window.staticTheme = true;',
            'manifest.json': '{"name":"manifest"}',
            'somefile.txt': 'text file',
            'deep/nested/path/file.css': '.nested { color: green; }',
            '.well-known/assetlinks.json': '{"assetlinks":true}',
            '.well-known/apple-app-site-association': '{"applinks":{}}',
            'assets/whatever.json': '{"asset":true}',
            'assets/mytemplate.hbs': '<h1>asset template</h1>',
            'assets/style.css': '.asset { color: blue; }'
        };

        await Promise.all(Object.entries(files).map(([filePath, contents]) => {
            return fs.outputFile(path.join(themePath, filePath), contents);
        }));
    }

    function createApp() {
        const testApp = express();

        testApp.use(staticTheme());
        testApp.use((err, _req, res, next) => {
            if (err.status === 404) {
                return res.status(404).end();
            }

            return next(err);
        });
        testApp.use((_req, res) => {
            res.set('X-Static-Theme-Fallback', 'true').status(204).end();
        });

        return testApp;
    }

    async function assertSkipped(url) {
        await request(app)
            .get(url)
            .expect(204)
            .expect('X-Static-Theme-Fallback', 'true');

        sinon.assert.notCalled(activeThemeStub);
    }

    async function assertServed(url, expectedBody) {
        const {headers, text} = await request(app)
            .get(url)
            .expect(200);

        assert(!('x-static-theme-fallback' in headers));
        assert.equal(text, expectedBody);
        sinon.assert.called(activeThemeStub);
    }

    async function assertFallsThrough(url) {
        await request(app)
            .get(url)
            .expect(204)
            .expect('X-Static-Theme-Fallback', 'true');

        sinon.assert.called(activeThemeStub);
    }

    async function assertDoesNotFallThrough(url) {
        const {headers} = await request(app)
            .get(url)
            .expect(404);

        assert(!('x-static-theme-fallback' in headers));
        sinon.assert.called(activeThemeStub);
    }

    beforeEach(async function () {
        themePath = await fs.mkdtemp(path.join(os.tmpdir(), 'static-theme-test-'));
        await writeThemeFiles();

        activeThemeStub = sinon.stub(themeEngine, 'getActive').returns({
            path: themePath
        });

        app = createApp();
    });

    afterEach(async function () {
        sinon.restore();
        await fs.remove(themePath);
    });

    it('should skip for .hbs file', async function () {
        await assertSkipped('/mytemplate.hbs');
    });

    it('should skip for .md file', async function () {
        await assertSkipped('/README.md');
    });

    it('should skip for .json file', async function () {
        await assertSkipped('/sample.json');
    });

    it('should skip for .lock file', async function () {
        await assertSkipped('/yarn.lock');
    });

    it('should skip for gulp file', async function () {
        await assertSkipped('/gulpfile.js');
    });

    it('should skip for Grunt file', async function () {
        await assertSkipped('/Gulpfile.js');
    });

    it('should call express.static for .css file', async function () {
        await assertServed('/myvalidfile.css', 'body { color: red; }');
    });

    it('should call express.static for .js file', async function () {
        await assertServed('/myvalidfile.js', 'window.staticTheme = true;');
    });

    it('should not error if active theme is missing', async function () {
        activeThemeStub.returns(undefined);

        await assertFallsThrough('/myvalidfile.css');
        sinon.assert.calledOnce(activeThemeStub);
    });

    it('should NOT skip if file is allowed', async function () {
        await assertServed('/manifest.json', '{"name":"manifest"}');
    });

    it('should NOT skip if file is allowed even if nested', async function () {
        await assertServed('/.well-known/assetlinks.json', '{"assetlinks":true}');
    });

    it('should NOT skip if file is in assets', async function () {
        await assertServed('/assets/whatever.json', '{"asset":true}');
    });

    it('should skip for .hbs file EVEN in /assets', async function () {
        await assertSkipped('/assets/mytemplate.hbs');
    });

    it('should disallow path traversal', async function () {
        await assertSkipped('/assets/built%2F..%2F..%2F/package.json');
    });

    it('should not crash when malformatted URL sequence is passed', async function () {
        await assertSkipped('/assets/built%2F..%2F..%2F%E0%A4%A/package.json');
    });

    describe('URL-encoded extension bypass prevention', function () {
        it('should skip for URL-encoded .hbs extension (h%62s)', async function () {
            await assertSkipped('/mytemplate.h%62s');
        });

        it('should skip for URL-encoded .json extension (%6Ason)', async function () {
            await assertSkipped('/package.%6Ason');
        });

        it('should skip for URL-encoded .md extension (%6Dd)', async function () {
            await assertSkipped('/README.%6Dd');
        });

        it('should skip for URL-encoded .lock extension (l%6Fck)', async function () {
            await assertSkipped('/yarn.l%6Fck');
        });

        it('should skip for URL-encoded .log extension (%6Cog)', async function () {
            await assertSkipped('/ghost.%6Cog');
        });

        it('should skip for URL-encoded gulpfile.js (g%75lpfile.js)', async function () {
            await assertSkipped('/g%75lpfile.js');
        });

        it('should skip for URL-encoded .hbs in /assets/ path', async function () {
            await assertSkipped('/assets/mytemplate.h%62s');
        });

        it('should skip for malformed URL encoding in denied file', async function () {
            await assertSkipped('/mytemplate.h%ZZs');
        });
    });

    describe('paths without file extensions', function () {
        it('should skip for root path /', async function () {
            await assertSkipped('/');
        });

        it('should skip for /about/', async function () {
            await assertSkipped('/about/');
        });

        it('should skip for /blog/my-post/', async function () {
            await assertSkipped('/blog/my-post/');
        });

        it('should skip for path without trailing slash /contact', async function () {
            await assertSkipped('/contact');
        });

        it('should NOT skip for file with extension without trailing slash', async function () {
            await assertServed('/somefile.txt', 'text file');
        });

        it('should NOT skip for file with extension with trailing slash', async function () {
            await assertDoesNotFallThrough('/somefile.txt/');
        });

        it('should NOT skip for deeply nested file with extension', async function () {
            await assertServed('/deep/nested/path/file.css', '.nested { color: green; }');
        });
    });

    describe('apple-app-site-association handling', function () {
        it('should serve .well-known/apple-app-site-association despite missing extension', async function () {
            const {headers, text} = await request(app)
                .get('/.well-known/apple-app-site-association')
                .expect(200)
                .expect('Content-Type', /application\/json/);

            assert(!('x-static-theme-fallback' in headers));
            assert.equal(text, '{"applinks":{}}');
            sinon.assert.called(activeThemeStub);
        });

        it('should fall through when request differs from exact path', async function () {
            await assertSkipped('/.WELL-KNOWN/apple-app-site-association.json');
        });
    });

    describe('fallthrough behavior', function () {
        it('should set fallthrough to true for /robots.txt', async function () {
            await assertFallsThrough('/robots.txt');
        });

        it('should set fallthrough to true for /sitemap.xml', async function () {
            await assertFallsThrough('/sitemap.xml');
        });

        it('should set fallthrough to true for /sitemap-posts.xml', async function () {
            await assertFallsThrough('/sitemap-posts.xml');
        });

        it('should set fallthrough to true for paginated sitemaps like /sitemap-posts-2.xml', async function () {
            await assertFallsThrough('/sitemap-posts-2.xml');
        });

        it('should set fallthrough to true for higher page numbers like /sitemap-posts-99.xml', async function () {
            await assertFallsThrough('/sitemap-posts-99.xml');
        });

        it('should set fallthrough to true for paginated tag sitemaps like /sitemap-tags-3.xml', async function () {
            await assertFallsThrough('/sitemap-tags-3.xml');
        });

        it('should set fallthrough to true for paginated author sitemaps like /sitemap-authors-2.xml', async function () {
            await assertFallsThrough('/sitemap-authors-2.xml');
        });

        it('should set fallthrough to false for other static files', async function () {
            await assertDoesNotFallThrough('/style.css');
        });

        it('should set fallthrough to false for nested files', async function () {
            await fs.remove(path.join(themePath, 'assets/style.css'));

            await assertDoesNotFallThrough('/assets/style.css');
        });

        it('should set fallthrough to false for allowed special files like manifest.json', async function () {
            await fs.remove(path.join(themePath, 'manifest.json'));

            await assertDoesNotFallThrough('/manifest.json');
        });
    });
});
