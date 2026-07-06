const assert = require('node:assert/strict');
const sinon = require('sinon');

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const logging = require('@tryghost/logging');

const CardAssetService = require('../../../../core/frontend/services/assets-minification/card-assets');

const themeDefaults = require('../../../../core/frontend/services/theme-engine/config/defaults.json');

describe('Card Asset Service', function () {
    let testDir,
        srcDir,
        destDir;

    beforeAll(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-tests-'));
        srcDir = path.join(testDir, 'src');
        destDir = path.join(testDir, 'dest');

        await fs.mkdir(srcDir);
        await fs.mkdir(destDir);
        await fs.mkdir(path.join(srcDir, 'css'));
        await fs.mkdir(path.join(srcDir, 'js'));
    });

    afterAll(async function () {
        await fs.rm(testDir, {recursive: true});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can load nothing', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await cardAssets.load();

        assert.deepEqual(cardAssets.files, []);
        assert.deepEqual(cardAssets.outputs, {});
        assert.equal(cardAssets.ready, true);
    });

    it('can load a single css file', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(true);

        assert.deepEqual(cardAssets.files, ['cards.min.css']);
        assert.equal(cardAssets.ready, true);
    });

    it('can correctly load nothing when config is false', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(false);

        assert.deepEqual(cardAssets.files, []);
        assert.deepEqual(cardAssets.outputs, {});
    });

    it('keeps the minified contents in memory and exposes them via getContent', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');
        await fs.writeFile(path.join(srcDir, 'js', 'test.js'), 'const test = "hello world";console.log(test);');

        await cardAssets.load(true);

        assert.deepEqual(cardAssets.files.sort(), ['cards.min.css', 'cards.min.js']);
        assert.match(cardAssets.getContent('cards.min.css'), /\.test\{color:#fff\}/);
        assert.match(cardAssets.getContent('cards.min.js'), /hello world/);
        assert.equal(cardAssets.getContent('unknown.min.js'), null);
        assert.equal(cardAssets.hasFile('css'), true);
        assert.equal(cardAssets.hasFile('js'), true);
    });

    it('writes the minified files to disk as a best-effort side effect', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(true);

        const diskContents = await fs.readFile(path.join(destDir, 'cards.min.css'), 'utf8');
        assert.equal(diskContents, cardAssets.getContent('cards.min.css'));
    });

    it('is still ready + servable when the disk write fails', async function () {
        const loggingStub = sinon.stub(logging, 'warn');

        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        const eaccesError = new Error('permission denied');
        eaccesError.code = 'EACCES';
        sinon.stub(cardAssets.minifier, 'writeFile').rejects(eaccesError);

        await cardAssets.load(true);

        assert.equal(cardAssets.ready, true, 'a failed disk write must not affect readiness');
        assert.match(cardAssets.getContent('cards.min.css'), /\.test\{color:#fff\}/);
        assert.equal(cardAssets.hasFile('css'), true);
        sinon.assert.called(loggingStub);
    });

    describe('Generate the correct glob strings', function () {
        it('CARD ASSET SERVICE DEFAULT CASE: do nothing', function () {
            const cardAssets = new CardAssetService();

            assert.deepEqual(cardAssets.generateGlobs(), {});
        });

        it('GHOST DEFAULT CASE: exclude bookmark and gallery', function () {
            const cardAssets = new CardAssetService({
                config: themeDefaults.card_assets
            });

            assert.deepEqual(cardAssets.generateGlobs(), {
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            });
        });

        it('CASE: card_assets = true, all cards assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: true
            });

            assert.deepEqual(cardAssets.generateGlobs(), {
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            });
        });

        it('CASE: card_assets = false, no card assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: false
            });

            assert.deepEqual(cardAssets.generateGlobs(), {});
        });

        it('CASE: card_assets is an object with an exclude property, generate inverse match strings', function () {
            const cardAssets = new CardAssetService({
                config: {
                    exclude: ['bookmarks']
                }
            });

            assert.deepEqual(cardAssets.generateGlobs(), {
                'cards.min.css': 'css/!(bookmarks).css',
                'cards.min.js': 'js/!(bookmarks).js'
            });
        });

        it('CASE: card_assets is an object with an include property, generate match strings', function () {
            const cardAssets = new CardAssetService({
                config: {
                    include: ['gallery']
                }
            });

            assert.deepEqual(cardAssets.generateGlobs(), {
                'cards.min.css': 'css/@(gallery).css',
                'cards.min.js': 'js/@(gallery).js'
            });
        });

        it('CASE: card_assets has include and exclude, include should win', function () {
            const cardAssets = new CardAssetService({
                config: {
                    include: ['gallery'],
                    exclude: ['bookmark']
                }
            });

            assert.deepEqual(cardAssets.generateGlobs(), {
                'cards.min.css': 'css/@(gallery).css',
                'cards.min.js': 'js/@(gallery).js'
            });
        });
    });
});
