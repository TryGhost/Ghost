var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),
    fs = require('fs'),
    tmp = require('tmp'),
    join = require('path').join,
    hbs = require('express-hbs'),

    config = require('../../server/config'),
    themes = require('../../server/themes'),
    // is only exposed via themes.getActive()
    activeTheme = require('../../server/themes/active'),
    settingsCache = require('../../server/settings/cache'),
    themeList = themes.list,
    middleware = themes.middleware,

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Loader', function () {
        var themePath;

        beforeEach(function () {
            themePath = tmp.dirSync({unsafeCleanup: true});
            sandbox.stub(config, 'getContentPath').withArgs('themes').returns(themePath.name);
        });

        afterEach(function () {
            themePath.removeCallback();
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

    describe('Middleware', function () {
        var req, res, blogApp, getActiveThemeStub, settingsCacheStub;

        beforeEach(function () {
            req = sandbox.spy();
            res = sandbox.spy();

            blogApp = {test: 'obj'};
            req.app = blogApp;
            res.locals = {};

            getActiveThemeStub = sandbox.stub(activeTheme, 'get');
            settingsCacheStub = sandbox.stub(settingsCache, 'get');
        });

        describe('ensureActiveTheme', function () {
            var ensureActiveTheme = middleware[0],
                mountThemeSpy;

            beforeEach(function () {
                mountThemeSpy = sandbox.spy();
                settingsCacheStub.withArgs('activeTheme').returns('casper');
            });

            it('mounts active theme if not yet mounted', function (done) {
                getActiveThemeStub.returns({
                    mounted: false,
                    mount: mountThemeSpy
                });

                ensureActiveTheme(req, res, function next(err) {
                    // Did not throw an error
                    should.not.exist(err);

                    settingsCacheStub.called.should.be.false();
                    getActiveThemeStub.called.should.be.true();
                    mountThemeSpy.called.should.be.true();
                    mountThemeSpy.calledWith(blogApp).should.be.true();

                    done();
                });
            });

            it('does not mounts the active theme if it is already mounted', function (done) {
                getActiveThemeStub.returns({
                    mounted: true,
                    mount: mountThemeSpy
                });

                ensureActiveTheme(req, res, function next(err) {
                    // Did not throw an error
                    should.not.exist(err);

                    settingsCacheStub.called.should.be.false();
                    getActiveThemeStub.called.should.be.true();
                    mountThemeSpy.called.should.be.false();

                    done();
                });
            });

            it('throws error if theme is missing', function (done) {
                getActiveThemeStub.returns(undefined);

                ensureActiveTheme(req, res, function next(err) {
                    // Did throw an error
                    should.exist(err);
                    err.message.should.eql('The currently active theme "casper" is missing.');

                    settingsCacheStub.calledWith('activeTheme').should.be.true();
                    getActiveThemeStub.called.should.be.true();
                    mountThemeSpy.called.should.be.false();

                    done();
                });
            });
        });

        describe('updateTemplateData', function () {
            var updateTemplateData = middleware[1],
                themeDataExpectedProps = ['posts_per_page'],
                blogDataExpectedProps = [
                    'url', 'title', 'description', 'logo', 'cover', 'icon', 'twitter', 'facebook', 'navigation',
                    'permalinks', 'timezone', 'amp'
                ],
                updateOptionsStub;

            beforeEach(function () {
                updateOptionsStub = sandbox.stub(hbs, 'updateTemplateOptions');

                settingsCacheStub.withArgs('title').returns('Bloggy McBlogface');
                settingsCacheStub.withArgs('labs').returns({});

                getActiveThemeStub.returns({
                    config: sandbox.stub().returns(2)
                });
            });

            it('calls updateTemplateOptions with correct data', function (done) {
                updateTemplateData(req, res, function next(err) {
                    var templateOptions;
                    should.not.exist(err);

                    updateOptionsStub.calledOnce.should.be.true();
                    templateOptions = updateOptionsStub.firstCall.args[0];
                    templateOptions.should.be.an.Object().with.property('data');
                    templateOptions.data.should.be.an.Object().with.properties('blog', 'labs', 'config');

                    // Check Theme Config
                    templateOptions.data.config.should.be.an.Object()
                        .with.properties(themeDataExpectedProps)
                        .and.size(themeDataExpectedProps.length);
                    // posts per page should be set according to the stub
                    templateOptions.data.config.posts_per_page.should.eql(2);

                    // Check blog config
                    // blog should have all the right properties
                    templateOptions.data.blog.should.be.an.Object()
                        .with.properties(blogDataExpectedProps)
                        .and.size(blogDataExpectedProps.length);
                    // url should be correct
                    templateOptions.data.blog.url.should.eql('http://127.0.0.1:2369/');
                    // should get the title
                    templateOptions.data.blog.title.should.eql('Bloggy McBlogface');

                    // Check labs config
                    templateOptions.data.labs.should.be.an.Object();

                    // Check res.locals
                    should.not.exist(res.locals.secure);

                    done();
                });
            });

            it('does not error if there is no active theme', function (done) {
                getActiveThemeStub.returns(undefined);

                updateTemplateData(req, res, function next(err) {
                    var templateOptions;
                    should.not.exist(err);

                    updateOptionsStub.calledOnce.should.be.true();
                    templateOptions = updateOptionsStub.firstCall.args[0];
                    templateOptions.should.be.an.Object().with.property('data');
                    templateOptions.data.should.be.an.Object().with.properties('blog', 'labs', 'config');

                    // Check Theme Config
                    templateOptions.data.config.should.be.an.Object();
                    // posts per page should NOT be set as there's no active theme
                    should.not.exist(templateOptions.data.config.posts_per_page);

                    // Check blog config
                    // blog should have all the right properties
                    templateOptions.data.blog.should.be.an.Object()
                        .with.properties(blogDataExpectedProps)
                        .and.size(blogDataExpectedProps.length);
                    // url should be correct
                    templateOptions.data.blog.url.should.eql('http://127.0.0.1:2369/');
                    // should get the title
                    templateOptions.data.blog.title.should.eql('Bloggy McBlogface');

                    // Check labs config
                    templateOptions.data.labs.should.be.an.Object();

                    done();
                });
            });

            it('calls updateTempalateOptions with correct info for secure context', function (done) {
                req.secure = true;

                updateTemplateData(req, res, function next(err) {
                    var templateOptions;
                    should.not.exist(err);

                    updateOptionsStub.calledOnce.should.be.true();
                    templateOptions = updateOptionsStub.firstCall.args[0];
                    templateOptions.should.be.an.Object().with.property('data');
                    templateOptions.data.should.be.an.Object().with.properties('blog', 'labs', 'config');

                    // Check Theme Config
                    templateOptions.data.config.should.be.an.Object()
                        .with.properties(themeDataExpectedProps)
                        .and.size(themeDataExpectedProps.length);
                    // posts per page should be set according to the stub
                    templateOptions.data.config.posts_per_page.should.eql(2);

                    // Check blog config
                    // blog should have all the right properties
                    templateOptions.data.blog.should.be.an.Object()
                        .with.properties(blogDataExpectedProps)
                        .and.size(blogDataExpectedProps.length);
                    // url should be correct HTTPS!
                    templateOptions.data.blog.url.should.eql('https://127.0.0.1:2369/');
                    // should get the title
                    templateOptions.data.blog.title.should.eql('Bloggy McBlogface');

                    // Check labs config
                    templateOptions.data.labs.should.be.an.Object();

                    // Check res.locals
                    should.exist(res.locals.secure);
                    res.locals.secure.should.be.true();

                    done();
                });
            });
        });
    });

    describe('Active', function () {
        describe('Mount', function () {
            var hbsStub, configStub,
                fakeBlogApp, fakeLoadedTheme, fakeCheckedTheme;

            beforeEach(function () {
                hbsStub = sandbox.stub(hbs, 'express3');
                configStub = sandbox.stub(config, 'set');

                fakeBlogApp = {
                    cache: ['stuff'],
                    set: sandbox.stub(),
                    engine: sandbox.stub()
                };

                fakeLoadedTheme = {
                    name: 'casper',
                    path: 'my/fake/theme/path'
                };
                fakeCheckedTheme = {};
            });

            it('should mount active theme with partials', function () {
                // setup partials
                fakeCheckedTheme.partials = ['loop', 'navigation'];

                var theme = activeTheme.set(fakeLoadedTheme, fakeCheckedTheme);

                // Check the theme is not yet mounted
                activeTheme.get().mounted.should.be.false();

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                configStub.calledOnce.should.be.true();
                configStub.calledWith('assetHash', null).should.be.true();

                // Check te view cache was cleared
                fakeBlogApp.cache.should.eql({});

                // Check the views were set correctly
                fakeBlogApp.set.calledOnce.should.be.true();
                fakeBlogApp.set.calledWith('views', 'my/fake/theme/path').should.be.true();

                // Check handlebars was initialised correctly
                hbsStub.calledOnce.should.be.true();
                hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
                hbsStub.firstCall.args[0].partialsDir.should.be.an.Array().with.lengthOf(2);
                hbsStub.firstCall.args[0].partialsDir[1].should.eql('my/fake/theme/path/partials');

                // Check the theme is now mounted
                activeTheme.get().mounted.should.be.true();
            });

            it('should mount active theme without partials', function () {
                // setup partials
                fakeCheckedTheme.partials = [];

                var theme = activeTheme.set(fakeLoadedTheme, fakeCheckedTheme);

                // Check the theme is not yet mounted
                activeTheme.get().mounted.should.be.false();

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                configStub.calledOnce.should.be.true();
                configStub.calledWith('assetHash', null).should.be.true();

                // Check te view cache was cleared
                fakeBlogApp.cache.should.eql({});

                // Check the views were set correctly
                fakeBlogApp.set.calledOnce.should.be.true();
                fakeBlogApp.set.calledWith('views', 'my/fake/theme/path').should.be.true();

                // Check handlebars was initialised correctly
                hbsStub.calledOnce.should.be.true();
                hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
                hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(1);

                // Check the theme is now mounted
                activeTheme.get().mounted.should.be.true();
            });
        });
    });
});
