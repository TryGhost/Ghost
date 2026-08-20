const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const supertest = require('supertest');
const {extract} = require('@tryghost/zip');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const localUtils = require('./utils');

// These tests make real HTTP requests (like the theme download tests) instead
// of using the in-process test agent: the zip response streams with
// backpressure, which the test agent's mock socket cannot signal — large
// bodies deadlock it. The 4xx cases live in exports.test.js.

// More posts than the posts exporter's default page cap, so the test proves
// the export is not silently truncated to the default limit
const EXTRA_POST_COUNT = 20;

/**
 * Collects a binary response body into a Buffer (superagent only buffers
 * text-like content types by itself).
 */
function binaryParser(res, callback) {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
}

/**
 * Writes the zip response body to a temp file, extracts it and returns the
 * extraction directory. Callers read entries with plain fs.
 */
async function extractZipResponse(body) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-exports-test-'));
    const zipPath = path.join(dir, 'export.zip');
    const outPath = path.join(dir, 'out');

    await fs.writeFile(zipPath, body);
    await extract(zipPath, outPath);

    return outPath;
}

async function listFiles(dir) {
    const entries = await fs.readdir(dir, {recursive: true, withFileTypes: true});

    return entries
        .filter(entry => entry.isFile())
        .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)))
        .sort();
}

describe('Exports API — download', function () {
    let request;

    beforeAll(async function () {
        await localUtils.startGhost({copyThemes: true});
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'posts', 'newsletters', 'members:newsletters');

        for (let i = 0; i < EXTRA_POST_COUNT; i++) {
            await models.Post.add({
                title: `Analytics post ${i}`,
                slug: `analytics-post-${i}`,
                status: 'published',
                published_at: new Date()
            }, {context: {internal: true}});
        }
    });

    it('Can download a full site export zip', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('exports/download/'))
            .set('Origin', config.get('url'))
            .buffer(true)
            .parse(binaryParser)
            .expect('Content-Type', /application\/zip/)
            .expect(200);

        assert.match(res.headers['content-disposition'], /^Attachment; filename="[A-Za-z0-9._-]*ghost\.export\.\d{4}-\d{2}-\d{2}\.zip"$/);
        assert.match(res.headers['cache-control'], /no-transform/);

        const outPath = await extractZipResponse(res.body);
        const files = await listFiles(outPath);

        // Every component is present
        assert.ok(files.includes('export.json'), `export.json missing from ${files}`);
        assert.ok(files.includes('members.csv'), `members.csv missing from ${files}`);
        assert.ok(files.includes('post-analytics.csv'), `post-analytics.csv missing from ${files}`);
        assert.ok(files.includes('routes.yaml'), `routes.yaml missing from ${files}`);
        assert.ok(files.includes('redirects.yaml'), `redirects.yaml missing from ${files}`);
        assert.ok(files.includes('themes/casper.zip'), `themes/casper.zip missing from ${files}`);
        assert.ok(files.includes('themes/source.zip'), `themes/source.zip missing from ${files}`);

        // The content JSON has the same shape as the /db/ download, so it
        // stays importable
        const exportJSON = await fs.readJSON(path.join(outPath, 'export.json'));
        assert.ok(Array.isArray(exportJSON.db), 'export.json should contain a db array');
        assert.ok(exportJSON.db[0].data.posts.length > 0, 'export.json should contain posts');
        assert.ok(exportJSON.db[0].meta.version, 'export.json should carry the Ghost version');

        // Settings keys on the blocklist (e.g. Stripe secrets) never leave the site
        const settingKeys = exportJSON.db[0].data.settings.map(setting => setting.key);
        assert.ok(!settingKeys.includes('stripe_connect_secret_key'), 'blocklisted settings must not be exported');

        // The CSVs are the same exports the standalone endpoints produce
        const membersCSV = await fs.readFile(path.join(outPath, 'members.csv'), 'utf8');
        assert.match(membersCSV, /^id,email,name/, 'members.csv should start with its header row');
        assert.ok(membersCSV.split('\r\n').length > 1, 'members.csv should contain member rows');

        // Every published post makes it into the analytics CSV — the exporter
        // must not fall back to its default page cap
        const analyticsCSV = await fs.readFile(path.join(outPath, 'post-analytics.csv'), 'utf8');
        const analyticsRows = analyticsCSV.trim().split('\r\n').length - 1;
        assert.ok(analyticsRows >= EXTRA_POST_COUNT, `expected at least ${EXTRA_POST_COUNT} analytics rows, got ${analyticsRows}`);

        // The nested theme zips are themselves valid archives
        const themeOut = path.join(outPath, 'themes-check');
        await extract(path.join(outPath, 'themes/casper.zip'), themeOut);
        assert.ok(await fs.pathExists(path.join(themeOut, 'package.json')), 'theme zip should contain the theme files');
    });

    it('Produces artifacts the existing import surfaces accept', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('exports/download/'))
            .set('Origin', config.get('url'))
            .buffer(true)
            .parse(binaryParser)
            .expect(200);

        const outPath = await extractZipResponse(res.body);

        // export.json → universal importer
        await request
            .post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .attach('importfile', path.join(outPath, 'export.json'))
            .expect(200);

        // members.csv → members importer (existing members show up as
        // per-row duplicates, not a rejected file)
        await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .set('Origin', config.get('url'))
            .attach('membersfile', path.join(outPath, 'members.csv'))
            .expect((response) => {
                assert.ok([201, 202].includes(response.status), `expected 201/202, got ${response.status}`);
            });

        // themes/{name}.zip → theme upload (test-theme rather than casper:
        // overriding default themes is blocked by design)
        await request
            .post(localUtils.API.getApiQuery('themes/upload/'))
            .set('Origin', config.get('url'))
            .attach('file', path.join(outPath, 'themes/test-theme.zip'))
            .expect(200);

        // routes.yaml → routes upload
        await request
            .post(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .attach('routes', path.join(outPath, 'routes.yaml'))
            .expect(200);

        // redirects.yaml → redirects upload
        await request
            .post(localUtils.API.getApiQuery('redirects/upload/'))
            .set('Origin', config.get('url'))
            .attach('redirects', path.join(outPath, 'redirects.yaml'))
            .expect(200);
    });

    it('Can download a subset of components', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('exports/download/?components=content,routes'))
            .set('Origin', config.get('url'))
            .buffer(true)
            .parse(binaryParser)
            .expect('Content-Type', /application\/zip/)
            .expect(200);

        const outPath = await extractZipResponse(res.body);
        const files = await listFiles(outPath);

        assert.deepEqual(files, ['export.json', 'redirects.yaml', 'routes.yaml']);
    });
});
