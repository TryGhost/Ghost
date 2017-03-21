var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),
    fs = require('fs'),
    tmp = require('tmp'),
    join = require('path').join,
    config = require('../../server/config'),
    themes = require('../../server/themes'),
    themeList = themes.list,

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    describe('Loader', function () {
        var themePath;

        beforeEach(function () {
            themePath = tmp.dirSync({unsafeCleanup: true});
            sandbox.stub(config, 'getContentPath').withArgs('themes').returns(themePath.name);
        });

        afterEach(function () {
            themePath.removeCallback();
            sandbox.restore();
        });

        describe('Load All', function () {
            it('should load directory and include only folders', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'));
                fs.writeFileSync(join(themePath.name, '.DS_Store'));

                // create actual theme
                fs.mkdirSync(join(themePath.name, 'casper'));
                fs.mkdirSync(join(themePath.name, 'casper', 'partials'));
                fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'));
                fs.writeFileSync(join(themePath.name, 'casper', 'partials', 'navigation.hbs'));

                themes.loadAll()
                    .then(function (result) {
                        var themeResult = themeList.getAll();

                        // Loader doesn't return anything
                        should.not.exist(result);

                        themeResult.should.eql({
                            casper: {
                                name: 'casper',
                                path: join(themePath.name, 'casper'),
                                'package.json': null
                            }
                        });

                        done();
                    })
                    .catch(done);
            });

            it('should read directory and read package.json if present', function (done) {
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

                themes.loadAll()
                    .then(function (result) {
                        var themeResult = themeList.getAll();

                        // Loader doesn't return anything
                        should.not.exist(result);

                        themeResult.should.eql({
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
                    .catch(done);
            });
        });

        describe('Load One', function () {
            it('should read directory and include only single requested theme', function (done) {
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

                themes.loadOne('casper')
                    .then(function (themeResult) {
                        themeResult.should.eql({
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': {name: 'casper', version: '0.1.2'}
                        });

                        done();
                    })
                    .catch(done);
            });

            it('should throw an error if theme cannot be found', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'));
                fs.writeFileSync(join(themePath.name, '.DS_Store'));

                themes.loadOne('casper')
                    .then(function () {
                        done('Should have thrown an error');
                    })
                    .catch(function (err) {
                        err.message.should.eql('Package not found');
                        done();
                    });
            });
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
