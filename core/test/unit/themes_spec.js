var should          = require('should'),
    sinon           = require('sinon'),
    _               = require('lodash'),
    fs              = require('fs'),
    tmp             = require('tmp'),
    join            = require('path').join,
    themeList      = require('../../server/themes').list,
    readThemes      = require('../../server/themes/read'),

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Read All', function () {
        it('should read directory and include only folders', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.mkdirSync(join(themePath.name, 'casper', 'partials'));
            fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'casper', 'partials', 'navigation.hbs'));

            readThemes.all(themePath.name)
                .then(function (themeList) {
                    themeList.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should read directory and read package.json if present', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'README.md'));
            fs.writeFileSync(join(themePath.name, 'Thumbs.db'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.mkdirSync(join(themePath.name, 'not-casper'));
            fs.writeFileSync(
                join(themePath.name, 'casper', 'package.json'),
                JSON.stringify({name: 'casper', version: '0.1.2'})
            );

            readThemes.all(themePath.name)
                .then(function (themeList) {
                    themeList.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': {name: 'casper', version: '0.1.2'}
                        },
                        'not-casper': {
                            name: 'not-casper',
                            path: join(themePath.name, 'not-casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });
    });

    describe('Read One', function () {
        it('should read directory and include only single requested theme', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(
                join(themePath.name, 'casper', 'package.json'),
                JSON.stringify({name: 'casper', version: '0.1.2'})
            );
            fs.mkdirSync(join(themePath.name, 'not-casper'));
            fs.writeFileSync(join(themePath.name, 'not-casper', 'index.hbs'));

            readThemes.one(themePath.name, 'casper')
                .then(function (themeList) {
                    themeList.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': {name: 'casper', version: '0.1.2'}
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should return empty object if theme cannot be found', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            readThemes.one(themePath.name, 'casper')
                .then(function (themeList) {
                    themeList.should.eql({});

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });
    });

    describe('List', function () {
        beforeEach(function () {
            themeList.init({
                casper: {foo: 'bar'},
                'not-casper': {bar: 'baz'}
            });
        });

        it('get() allows getting a single theme', function () {
            themeList.get('casper').should.eql({foo: 'bar'});
        });

        it('get() with no args should do nothing', function () {
            should.not.exist(themeList.get());
        });

        it('getAll() returns all themes', function () {
            themeList.getAll().should.be.an.Object().with.properties('casper', 'not-casper');
            Object.keys(themeList.getAll()).should.have.length(2);
        });

        it('set() updates an existing theme', function () {
            var origCasper = _.cloneDeep(themeList.get('casper'));
            themeList.set('casper', {magic: 'update'});

            themeList.get('casper').should.not.eql(origCasper);
            themeList.get('casper').should.eql({magic: 'update'});
        });

        it('set() can add a new theme', function () {
            themeList.set('rasper', {color: 'red'});
            themeList.get('rasper').should.eql({color: 'red'});
        });

        it('del() removes a key from the list', function () {
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
            themeList.del('casper');
            should.not.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
        });

        it('del() with no argument does nothing', function () {
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
            themeList.del();
            should.exist(themeList.get('casper'));
            should.exist(themeList.get('not-casper'));
        });

        it('init() calls set for each theme', function () {
            var setSpy = sandbox.spy(themeList, 'set');

            themeList.init({test: {a: 'b'}, casper: {c: 'd'}});
            setSpy.calledTwice.should.be.true();
            setSpy.firstCall.calledWith('test', {a: 'b'}).should.be.true();
            setSpy.secondCall.calledWith('casper', {c: 'd'}).should.be.true();
        });

        it('init() with empty object resets the list', function () {
            themeList.init();
            var result = themeList.getAll();
            should.exist(result);
            result.should.be.an.Object();
            result.should.eql({});
            Object.keys(result).should.have.length(0);
        });
    });
});
