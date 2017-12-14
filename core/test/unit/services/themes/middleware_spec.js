var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    hbs = require('../../../../server/services/themes/engine'),

    themes = require('../../../../server/services/themes'),
    // is only exposed via themes.getActive()
    activeTheme = require('../../../../server/services/themes/active'),
    settingsCache = require('../../../../server/services/settings/cache'),
    middleware = themes.middleware,

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
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
                settingsCacheStub.withArgs('active_theme').returns('casper');
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

                    settingsCacheStub.calledWith('active_theme').should.be.true();
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
                    'url', 'title', 'description', 'logo', 'cover_image', 'icon', 'twitter', 'facebook', 'navigation',
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
                    templateOptions.data.blog.url.should.eql('http://127.0.0.1:2369');
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
                    templateOptions.data.blog.url.should.eql('http://127.0.0.1:2369');
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
                    templateOptions.data.blog.url.should.eql('https://127.0.0.1:2369');
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
});
