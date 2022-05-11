const should = require('should');
const sinon = require('sinon');
const hbs = require('../../../../../core/frontend/services/theme-engine/engine');
const middleware = require('../../../../../core/frontend/services/theme-engine').middleware;
// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const settingsCache = require('../../../../../core/shared/settings-cache');
const customThemeSettingsCache = require('../../../../../core/shared/custom-theme-settings-cache');
const labs = require('../../../../../core/shared/labs');

const sandbox = sinon.createSandbox();

function executeMiddleware(toExecute, req, res, next) {
    const [current, ...rest] = toExecute;

    current(req, res, function (err) {
        if (err) {
            return next(err);
        }
        if (!rest.length) {
            return next();
        }
        return executeMiddleware(rest, req, res, next);
    });
}

describe('Themes middleware', function () {
    afterEach(function () {
        sandbox.restore();
    });

    let req;
    let res;

    let fakeActiveTheme;
    let fakeActiveThemeName;
    let fakeSiteData;
    let fakeLabsData;
    let fakeCustomThemeSettingsData;

    beforeEach(function () {
        req = {app: {}, header: () => {}};
        res = {locals: {}};

        fakeActiveTheme = {
            config: sandbox.stub().returns(2),
            mount: sandbox.stub()
        };

        fakeActiveThemeName = 'bacon-sensation';

        fakeSiteData = {};

        fakeLabsData = {
            // labs data is deep cloned,
            // if we want to compare it
            // we will need some unique content
            members: true,
            offers: true
        };

        fakeCustomThemeSettingsData = {
            header_typography: 'Sans-Serif'
        };

        sandbox.stub(activeTheme, 'get')
            .returns(fakeActiveTheme);

        sandbox.stub(settingsCache, 'get')
            .withArgs('active_theme').returns(fakeActiveThemeName);

        sandbox.stub(labs, 'getAll').returns(fakeLabsData);

        sandbox.stub(settingsCache, 'getPublic')
            .returns(fakeSiteData);

        sandbox.stub(customThemeSettingsCache, 'getAll')
            .returns(fakeCustomThemeSettingsData);

        sandbox.stub(hbs, 'updateTemplateOptions');
        sandbox.stub(hbs, 'updateLocalTemplateOptions');
    });

    it('mounts active theme if not yet mounted', function (done) {
        fakeActiveTheme.mounted = false;

        executeMiddleware(middleware, req, res, function next(err) {
            try {
                should.not.exist(err);

                fakeActiveTheme.mount.called.should.be.true();
                fakeActiveTheme.mount.calledWith(req.app).should.be.true();

                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it('does not mounts the active theme if it is already mounted', function (done) {
        fakeActiveTheme.mounted = true;

        executeMiddleware(middleware, req, res, function next(err) {
            try {
                should.not.exist(err);

                fakeActiveTheme.mount.called.should.be.false();

                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it('throws error if theme is missing', function (done) {
        activeTheme.get.restore();
        sandbox.stub(activeTheme, 'get')
            .returns(undefined);

        executeMiddleware(middleware, req, res, function next(err) {
            try {
                // Did throw an error
                should.exist(err);
                err.message.should.eql('The currently active theme "bacon-sensation" is missing.');

                activeTheme.get.called.should.be.true();
                fakeActiveTheme.mount.called.should.be.false();

                done();
            } catch (error) {
                done(error);
            }
        });
    });

    describe('updateTemplateOptions', function () {
        it('is called with correct data', function (done) {
            const themeDataExpectedProps = ['posts_per_page', 'image_sizes'];

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site', 'labs', 'config', 'custom');

                    // Check Theme Config
                    data.config.should.be.an.Object()
                        .with.properties(themeDataExpectedProps)
                        .and.size(themeDataExpectedProps.length);
                    // posts per page should be set according to the stub
                    data.config.posts_per_page.should.eql(2);

                    // Check labs config
                    should.deepEqual(data.labs, fakeLabsData);

                    should.equal(data.site, fakeSiteData);
                    should.exist(data.site.signup_url);
                    data.site.signup_url.should.equal('#/portal');

                    should.deepEqual(data.custom, fakeCustomThemeSettingsData);

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('switches @site.signup_url to RSS when signup is disabled', function (done) {
            settingsCache.get
                .withArgs('members_signup_access').returns('none');

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                    const data = templateOptions.data;

                    should.exist(data.site.signup_url);
                    data.site.signup_url.should.equal('https://feedly.com/i/subscription/feed/http%3A%2F%2F127.0.0.1%3A2369%2Frss%2F');

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });

    describe('Preview Mode', function () {
        it('calls updateLocalTemplateOptions with correct data when one parameter is set', function (done) {
            const previewString = 'c=%23000fff';
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site');

                    data.site.should.be.an.Object().with.properties('accent_color', '_preview');
                    data.site._preview.should.eql(previewString);
                    data.site.accent_color.should.eql('#000fff');

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('calls updateLocalTemplateOptions with correct data when two parameters are set', function (done) {
            const previewString = 'c=%23000fff&icon=%2Fcontent%2Fimages%2Fmyimg.png';
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site');

                    data.site.should.be.an.Object().with.properties('accent_color', 'icon', '_preview');
                    data.site._preview.should.eql(previewString);
                    data.site.accent_color.should.eql('#000fff');
                    data.site.icon.should.eql('/content/images/myimg.png');

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('calls updateLocalTemplateOptions with correct custom theme settings data', function (done) {
            const customPreviewObject = {header_typography: 'Serif'};
            const previewString = `custom=${encodeURIComponent(JSON.stringify(customPreviewObject))}`;
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site', 'custom');

                    data.custom.should.be.an.Object().with.properties('header_typography');
                    data.custom.header_typography.should.eql('Serif');

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('calls updateLocalTemplateOptions with correct without unknown custom theme settings', function (done) {
            const customPreviewObject = {header_typography: 'Serif', unknown_setting: true};
            const previewString = `custom=${encodeURIComponent(JSON.stringify(customPreviewObject))}`;
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site', 'custom');

                    data.custom.should.be.an.Object().with.properties('header_typography');
                    data.custom.header_typography.should.eql('Serif');

                    data.custom.should.not.have.property('unknown_setting');

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('calls updateLocalTemplateOptions with no custom data when custom param is not parseable JSON', function (done) {
            const previewString = `custom=${encodeURIComponent('<html>')}`;
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site', 'custom');

                    data.custom.should.be.an.Object();
                    data.custom.should.be.empty();

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('calls updateLocalTemplateOptions with no custom data when custom param is not an object', function (done) {
            const previewString = `custom=${encodeURIComponent('"header_typography"')}`;
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                try {
                    should.not.exist(err);

                    hbs.updateLocalTemplateOptions.calledOnce.should.be.true();
                    const templateOptions = hbs.updateLocalTemplateOptions.firstCall.args[1];
                    const data = templateOptions.data;

                    data.should.be.an.Object().with.properties('site', 'custom');

                    data.custom.should.be.an.Object();
                    data.custom.should.be.empty();

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });
});
