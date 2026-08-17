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
        manifestPath;

    const service = config => new CardAssetService(Object.assign({manifest: manifestPath}, config === undefined ? {} : {config}));

    beforeAll(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-tests-'));
        manifestPath = path.join(testDir, 'cards.manifest.json');

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

    describe('Without a usable manifest', function () {
        const assertThrows = (manifestPathArg) => {
            assert.throws(() => new CardAssetService({manifest: manifestPathArg, config: true}), {
                errorType: 'InternalServerError',
                message: /Could not use the card asset manifest/
            });
        };

        it('throws when the manifest is missing', function () {
            assertThrows(path.join(testDir, 'does-not-exist.json'));
        });

        it('throws when the manifest is truncated or corrupt', async function () {
            const corruptPath = path.join(testDir, 'corrupt.json');
            await fs.writeFile(corruptPath, '{"css":{"audio":".audio{co');

            assertThrows(corruptPath);
        });

        it('throws when the manifest is empty', async function () {
            const emptyPath = path.join(testDir, 'empty.json');
            await fs.writeFile(emptyPath, '');

            assertThrows(emptyPath);
        });

        // Well-formed JSON that isn't a manifest
        const unusable = {
            'is null': 'null',
            'is a number': '42',
            'is a string': '"cards"',
            'is an array': '[]',
            'has neither css nor js': '{}',
            'has a type that is not a chunk map': '{"css":"abc","js":{}}',
            'has a type holding a non-string chunk': '{"css":{"bookmark":123},"js":{}}'
        };

        Object.entries(unusable).forEach(([name, contents]) => {
            it(`throws when the manifest ${name}`, async function () {
                const unusablePath = path.join(testDir, `unusable-${name.replace(/\W+/g, '-')}.json`);
                await fs.writeFile(unusablePath, contents);

                assertThrows(unusablePath);
            });
        });

        it('still serves a manifest that omits a type', async function () {
            const cssOnlyPath = path.join(testDir, 'css-only.json');
            await fs.writeFile(cssOnlyPath, '{"css":{"bookmark":".bookmark{}"}}');

            const cardAssets = new CardAssetService({manifest: cssOnlyPath, config: true});

            assert.equal(cardAssets.hasFile('css'), true);
            assert.equal(cardAssets.hasFile('js'), false);
        });
    });
});
