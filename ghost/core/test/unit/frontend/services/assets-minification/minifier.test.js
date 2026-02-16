const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const Minifier = require('../../../../../core/frontend/services/assets-minification/minifier');

describe('Minifier', function () {
    let minifier;
    let testDir;

    before(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minifier-tests-'));

        minifier = new Minifier({
            src: path.join(__dirname, 'fixtures', 'basic-cards'),
            dest: testDir
        });
    });

    after(async function () {
        await fs.rmdir(testDir, {recursive: true});
    });

    describe('getMatchingFiles expands globs correctly', function () {
        it('star glob e.g. css/*.css', async function () {
            let result = await minifier.getMatchingFiles('css/*.css');

            assert(Array.isArray(result));
            assert.equal(result.length, 3);
            result[0].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','bookmark.css'));
            result[1].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','empty.css'));
            result[2].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','gallery.css'));
        });

        it('match glob range e.g. css/bookmark.css and css/empty.css (css/@(bookmark|empty).css)', async function () {
            let result = await minifier.getMatchingFiles('css/@(bookmark|empty).css');

            assert(Array.isArray(result));
            assert.equal(result.length, 2);
            result[0].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','bookmark.css'));
            result[1].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','empty.css'));
        });

        it('reverse match glob e.g. css/!(bookmark).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark).css');

            assert(Array.isArray(result));
            assert.equal(result.length, 2);
            result[0].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','empty.css'));
            result[1].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','gallery.css'));
        });
        it('reverse match glob e.g. css/!(bookmark|gallery).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark|gallery).css');

            assert(Array.isArray(result));
            assert.equal(result.length, 1);
            result[0].should.eql(path.join('test','unit','frontend','services','assets-minification','fixtures','basic-cards','css','empty.css'));
        });
    });

    describe('Minify', function () {
        it('single type, single file', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js'
            });
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
        });

        it('single type, multi file', async function () {
            let result = await minifier.minify({
                'card.min.css': 'css/*.css'
            });
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
        });

        it('both css and js types + multiple files', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js',
                'card.min.css': 'css/*.css'
            });

            assert(Array.isArray(result));
            assert.equal(result.length, 2);
        });

        it('can replace the content', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js'
            }, {
                replacements: {
                    '.kg-gallery-image': 'randomword'
                }
            });
            assert(Array.isArray(result));
            assert.equal(result.length, 1);

            const outputPath = minifier.getFullDest(result[0]);
            const content = await fs.readFile(outputPath, {encoding: 'utf8'});
            assert.match(content, /randomword/);
        });
    });

    describe('Bad inputs', function () {
        it('cannot create a minifier without src and dest', function () {
            assert.throws((function noObject(){
                new Minifier();
            }));

            assert.throws((function emptyObject() {
                new Minifier({});
            }));

            assert.throws((function missingSrc() {
                new Minifier({dest: 'a'});
            }));

            assert.throws((function missingDest() {
                new Minifier({src: 'a'});
            }));
        });

        it('can only handle css and js files', async function () {
            try {
                await minifier.minify({
                    'card.min.ts': 'js/*.ts'
                });
                assert.fail('Should have errored');
            } catch (err) {
                assertExists(err);
                assert.equal(err.errorType, 'IncorrectUsageError');
                assert.match(err.message, /Unexpected destination/);
            }
        });

        it('can handle missing files and folders gracefully', async function () {
            try {
                await minifier.minify({
                    'card.min.ts': 'ts/*.ts',
                    'card.min.js': 'js/fake.js'
                });
                assert.fail('Should have errored');
            } catch (err) {
                assertExists(err);
                assert.equal(err.errorType, 'IncorrectUsageError');
                assert.match(err.message, /Unable to read/);
            }
        });

        it('can minify empty js correctly to no result', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/empty.js'
            });

            assert.deepEqual(result, []);
        });

        it('can minify empty css correctly to no result', async function () {
            let result = await minifier.minify({
                'card.min.css': 'css/empty.css'
            });

            assert.deepEqual(result, []);
        });
    });
});
