// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const Minifier = require('../lib/minifier');

describe('Minifier', function () {
    let minifier;
    let testDir;

    before(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minifier-tests-'));

        minifier = new Minifier({
            src: path.join(__dirname, 'fixtures', 'basic-cards'),
            dest: path.join(os.tmpdir(), 'minifier-tests')
        });
    });

    after(async function () {
        await fs.rmdir(testDir);
    });

    describe('getMatchingFiles expands globs correctly', function () {
        it('star glob e.g. css/*.css', async function () {
            let result = await minifier.getMatchingFiles('css/*.css');

            result.should.be.an.Array().with.lengthOf(2);
            result[0].should.eql('test/fixtures/basic-cards/css/bookmark.css');
            result[1].should.eql('test/fixtures/basic-cards/css/gallery.css');
        });

        it('reverse match glob e.g. css/!(bookmark).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark).css');

            result.should.be.an.Array().with.lengthOf(1);
            result[0].should.eql('test/fixtures/basic-cards/css/gallery.css');
        });
        it('reverse match glob e.g. css/!(bookmark|gallery).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark|gallery).css');

            result.should.be.an.Array().with.lengthOf(0);
        });
    });

    describe('Minify', function () {
        it('single type, single file', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js'
            });
            result.should.be.an.Array().with.lengthOf(1);
        });

        it('single type, multi file', async function () {
            let result = await minifier.minify({
                'card.min.css': 'css/*.css'
            });
            result.should.be.an.Array().with.lengthOf(1);
        });

        it('both css and js types + multiple files', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js',
                'card.min.css': 'css/*.css'
            });

            result.should.be.an.Array().with.lengthOf(2);
        });
    });
});
