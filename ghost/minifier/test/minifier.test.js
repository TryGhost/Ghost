// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const Minifier = require('../');

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

            result.should.be.an.Array().with.lengthOf(3);
            result[0].should.eql(path.join('test','fixtures','basic-cards','css','bookmark.css'));
            result[1].should.eql(path.join('test','fixtures','basic-cards','css','empty.css'));
            result[2].should.eql(path.join('test','fixtures','basic-cards','css','gallery.css'));
        });

        it('match glob range e.g. css/bookmark.css and css/empty.css (css/@(bookmark|empty).css)', async function () {
            let result = await minifier.getMatchingFiles('css/@(bookmark|empty).css');
            
            result.should.be.an.Array().with.lengthOf(2);
            result[0].should.eql(path.join('test','fixtures','basic-cards','css','bookmark.css'));
            result[1].should.eql(path.join('test','fixtures','basic-cards','css','empty.css'));
        });

        it('reverse match glob e.g. css/!(bookmark).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark).css');

            result.should.be.an.Array().with.lengthOf(2);
            result[0].should.eql(path.join('test','fixtures','basic-cards','css','empty.css'));
            result[1].should.eql(path.join('test','fixtures','basic-cards','css','gallery.css'));
        });
        it('reverse match glob e.g. css/!(bookmark|gallery).css', async function () {
            let result = await minifier.getMatchingFiles('css/!(bookmark|gallery).css');

            result.should.be.an.Array().with.lengthOf(1);
            result[0].should.eql(path.join('test','fixtures','basic-cards','css','empty.css'));
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

        it('can replace the content', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/*.js'
            }, {
                replacements: {
                    '.kg-gallery-image': 'randomword'
                }
            });
            result.should.be.an.Array().with.lengthOf(1);

            const outputPath = minifier.getFullDest(result[0]);
            const content = await fs.readFile(outputPath, {encoding: 'utf8'});
            content.should.match(/randomword/);
        });
    });

    describe('Bad inputs', function () {
        it('cannot create a minifier without src and dest', function () {
            (function noObject(){
                new Minifier();
            }).should.throw();

            (function emptyObject() {
                new Minifier({});
            }).should.throw();

            (function missingSrc() {
                new Minifier({dest: 'a'});
            }).should.throw();

            (function missingDest() {
                new Minifier({src: 'a'});
            }).should.throw();
        });

        it('can only handle css and js files', async function () {
            try {
                await minifier.minify({
                    'card.min.ts': 'js/*.ts'
                });
                should.fail(minifier, 'Should have errored');
            } catch (err) {
                should.exist(err);
                err.errorType.should.eql('IncorrectUsageError');
                err.message.should.match(/Unexpected destination/);
            }
        });

        it('can handle missing files and folders gracefully', async function () {
            try {
                await minifier.minify({
                    'card.min.ts': 'ts/*.ts',
                    'card.min.js': 'js/fake.js'
                });
                should.fail(minifier, 'Should have errored');
            } catch (err) {
                should.exist(err);
                err.errorType.should.eql('IncorrectUsageError');
                err.message.should.match(/Unable to read/);
            }
        });

        it('can minify empty js correctly to no result', async function () {
            let result = await minifier.minify({
                'card.min.js': 'js/empty.js'
            });

            result.should.be.an.Array().with.lengthOf(0);
        });

        it('can minify empty css correctly to no result', async function () {
            let result = await minifier.minify({
                'card.min.css': 'css/empty.css'
            });

            result.should.be.an.Array().with.lengthOf(0);
        });
    });
});
