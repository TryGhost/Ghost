const assert = require('node:assert/strict');

const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const os = require('os');

const CardAssetService = require('../../../../core/frontend/services/assets-minification/card-assets');

const themeDefaults = require('../../../../core/frontend/services/theme-engine/config/defaults.json');

const MANIFEST = {
    css: {
        audio: '.audio{color:#fff}',
        bookmark: '.bookmark{color:#000}',
        gallery: '.gallery{color:red}'
    },
    js: {
        audio: 'a();',
        gallery: 'g();'
    }
};

const expectedHash = content => crypto.createHash('sha256').update(content).digest('base64url').substring(0, 16);

describe('Card Asset Service', function () {
    let testDir,
        srcDir,
        manifestPath;

    const service = config => new CardAssetService(Object.assign({manifest: manifestPath}, config === undefined ? {} : {config}));

    beforeAll(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-tests-'));
        srcDir = path.join(testDir, 'src');
        manifestPath = path.join(testDir, 'cards.manifest.json');

        await fs.mkdir(path.join(srcDir, 'css'), {recursive: true});
        await fs.mkdir(path.join(srcDir, 'js'), {recursive: true});
        await fs.writeFile(manifestPath, JSON.stringify(MANIFEST));
    });

    afterAll(async function () {
        await fs.rm(testDir, {recursive: true});
    });

    describe('Selecting cards from the manifest', function () {
        it('CARD ASSET SERVICE DEFAULT CASE: do nothing', function () {
            const cardAssets = service();

            assert.deepEqual(cardAssets.getCardNames('css'), []);
            assert.deepEqual(cardAssets.getCardNames('js'), []);
        });

        it('GHOST DEFAULT CASE: include everything', function () {
            const cardAssets = service(themeDefaults.card_assets);

            assert.deepEqual(cardAssets.getCardNames('css'), ['audio', 'bookmark', 'gallery']);
            assert.deepEqual(cardAssets.getCardNames('js'), ['audio', 'gallery']);
        });

        it('CASE: card_assets = true, all cards assets should be included', function () {
            const cardAssets = service(true);

            assert.deepEqual(cardAssets.getCardNames('css'), ['audio', 'bookmark', 'gallery']);
            assert.deepEqual(cardAssets.getCardNames('js'), ['audio', 'gallery']);
        });

        it('CASE: card_assets = false, no card assets should be included', function () {
            const cardAssets = service(false);

            assert.deepEqual(cardAssets.getCardNames('css'), []);
            assert.deepEqual(cardAssets.getCardNames('js'), []);
        });

        it('CASE: card_assets is an object with an exclude property', function () {
            const cardAssets = service({exclude: ['bookmark']});

            assert.deepEqual(cardAssets.getCardNames('css'), ['audio', 'gallery']);
            assert.deepEqual(cardAssets.getCardNames('js'), ['audio', 'gallery']);
        });

        it('CASE: card_assets is an object with an include property', function () {
            const cardAssets = service({include: ['gallery']});

            assert.deepEqual(cardAssets.getCardNames('css'), ['gallery']);
            assert.deepEqual(cardAssets.getCardNames('js'), ['gallery']);
        });

        it('CASE: card_assets has include and exclude, include should win', function () {
            const cardAssets = service({include: ['gallery'], exclude: ['bookmark']});

            assert.deepEqual(cardAssets.getCardNames('css'), ['gallery']);
            assert.deepEqual(cardAssets.getCardNames('js'), ['gallery']);
        });

        it('ignores names that this Ghost version does not ship', function () {
            const cardAssets = service({include: ['gallery', 'nope']});

            assert.deepEqual(cardAssets.getCardNames('css'), ['gallery']);
        });
    });

    describe('Bundling', function () {
        it('concatenates the selected chunks and hashes the result', function () {
            const cardAssets = service({include: ['audio', 'gallery']});
            const expectedContent = `${MANIFEST.css.audio}\n${MANIFEST.css.gallery}`;

            assert.deepEqual(cardAssets.getBundle('css'), {
                content: expectedContent,
                hash: expectedHash(expectedContent)
            });
        });

        it('terminates js chunks so they cannot run into each other', function () {
            const cardAssets = service(true);

            assert.equal(cardAssets.getBundle('js').content, `${MANIFEST.js.audio};\n${MANIFEST.js.gallery}`);
        });

        it('produces the same hash from a separate instance', function () {
            assert.equal(service(true).getHash('css'), service(true).getHash('css'));
        });

        it('produces a different hash for a different selection', function () {
            assert.notEqual(service(true).getHash('css'), service({exclude: ['bookmark']}).getHash('css'));
        });

        it('has no bundle, hash or file when nothing is selected', function () {
            const cardAssets = service(false);

            assert.equal(cardAssets.getBundle('css'), null);
            assert.equal(cardAssets.getHash('css'), null);
            assert.equal(cardAssets.hasFile('css'), false);
        });

        it('has a file for each type that resolves to content', function () {
            const cardAssets = service(true);

            assert.equal(cardAssets.hasFile('css'), true);
            assert.equal(cardAssets.hasFile('js'), true);
        });

        it('has no js file when the selection only matches css', function () {
            const cardAssets = service({include: ['bookmark']});

            assert.equal(cardAssets.hasFile('css'), true);
            assert.equal(cardAssets.hasFile('js'), false);
        });
    });

    describe('Invalidation', function () {
        it('rebundles with the new config', function () {
            const cardAssets = service(true);
            const before = cardAssets.getHash('css');

            cardAssets.invalidate({include: ['gallery']});

            assert.deepEqual(cardAssets.getCardNames('css'), ['gallery']);
            assert.notEqual(cardAssets.getHash('css'), before);
        });

        it('applies a falsy config', function () {
            const cardAssets = service(true);

            cardAssets.invalidate(false);

            assert.equal(cardAssets.hasFile('css'), false);
        });

        it('keeps the existing config when called without one', function () {
            const cardAssets = service({include: ['gallery']});

            cardAssets.invalidate();

            assert.deepEqual(cardAssets.getCardNames('css'), ['gallery']);
        });
    });

    describe('Without a built manifest', function () {
        it('falls back to the unminified sources', async function () {
            await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');
            await fs.writeFile(path.join(srcDir, 'js', 'test.js'), 'window.test = true;');

            const cardAssets = new CardAssetService({
                src: srcDir,
                manifest: path.join(testDir, 'does-not-exist.json'),
                config: true
            });

            assert.deepEqual(cardAssets.getBundle('css'), {
                content: '.test { color: #fff }',
                hash: expectedHash('.test { color: #fff }')
            });
            assert.equal(cardAssets.hasFile('js'), true);
        });
    });
});
