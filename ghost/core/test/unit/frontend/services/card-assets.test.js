const should = require('should');

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const CardAssetService = require('../../../../core/frontend/services/assets-minification/CardAssets');

const themeDefaults = require('../../../../core/frontend/services/theme-engine/config/defaults.json');

describe('Card Asset Service', function () {
    let testDir,
        srcDir,
        destDir;

    before(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-tests-'));
        srcDir = path.join(testDir, 'src');
        destDir = path.join(testDir, 'dest');

        await fs.mkdir(srcDir);
        await fs.mkdir(destDir);
        await fs.mkdir(path.join(srcDir, 'css'));
        await fs.mkdir(path.join(srcDir, 'js'));
    });

    after(async function () {
        await fs.rm(testDir, {recursive: true});
    });

    it('can load nothing', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await cardAssets.load();

        cardAssets.files.should.eql([]);
    });

    it('can load a single css file', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(true);

        cardAssets.files.should.eql(['cards.min.css']);
    });

    it('can correctly load nothing when config is false', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(false);

        cardAssets.files.should.eql([]);
    });

    it('can clearFiles', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir,
            config: true
        });

        await fs.writeFile(path.join(destDir, 'cards.min.css'), 'test-css');
        await fs.writeFile(path.join(destDir, 'cards.min.js'), 'test-js');

        await cardAssets.clearFiles();

        try {
            await fs.readFile(path.join(destDir, 'cards.min.css'), 'utf-8');
            should.fail(cardAssets, 'CSS file should not exist');
        } catch (error) {
            if (error instanceof should.AssertionError) {
                throw error;
            }

            error.code.should.eql('ENOENT');
        }

        try {
            await fs.readFile(path.join(destDir, 'cards.min.js'), 'utf-8');
            should.fail(cardAssets, 'JS file should not exist');
        } catch (error) {
            if (error instanceof should.AssertionError) {
                throw error;
            }

            error.code.should.eql('ENOENT');
        }
    });

    describe('Generate the correct glob strings', function () {
        it('CARD ASSET SERVICE DEFAULT CASE: do nothing', function () {
            const cardAssets = new CardAssetService();

            cardAssets.generateGlobs().should.eql({});
        });

        it('GHOST DEFAULT CASE: exclude bookmark and gallery', function () {
            const cardAssets = new CardAssetService({
                config: themeDefaults.card_assets
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            });
        });

        it('CASE: card_assets = true, all cards assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: true
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            });
        });

        it('CASE: card_assets = false, no card assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: false
            });

            cardAssets.generateGlobs().should.eql({});
        });

        it('CASE: card_assets is an object with an exclude property, generate inverse match strings', function () {
            const cardAssets = new CardAssetService({
                config: {
                    exclude: ['bookmarks']
                }
            });

            cardAssets.generateGlobs().should.eql({
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

            cardAssets.generateGlobs().should.eql({
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

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/@(gallery).css',
                'cards.min.js': 'js/@(gallery).js'
            });
        });
    });
});
