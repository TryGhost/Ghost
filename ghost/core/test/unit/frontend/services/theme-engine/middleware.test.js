const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const hbs = require('../../../../../core/frontend/services/theme-engine/engine');
const middleware = require('../../../../../core/frontend/services/theme-engine').middleware;
// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const settingsCache = require('../../../../../core/shared/settings-cache');
const customThemeSettingsCache = require('../../../../../core/shared/custom-theme-settings-cache');
const config = require('../../../../../core/shared/config');
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
    let activeThemeGetStub;
    let settingsCacheGetStub;
    let hbsUpdateTemplateOptionsStub;
    let hbsUpdateLocalTemplateOptionsStub;

    beforeEach(function () {
        req = {app: {}, header: () => {}};
        res = {locals: {}};

        fakeActiveTheme = {
            config: sandbox.stub().returns(2),
            mount: sandbox.stub()
        };

        fakeActiveThemeName = 'bacon-sensation';

        fakeSiteData = {
            comments_enabled: 'all'
        };

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

        activeThemeGetStub = sandbox.stub(activeTheme, 'get')
            .returns(fakeActiveTheme);

        settingsCacheGetStub = sandbox.stub(settingsCache, 'get')
            .withArgs('active_theme').returns(fakeActiveThemeName);

        sandbox.stub(labs, 'getAll').returns(fakeLabsData);

        sandbox.stub(settingsCache, 'getPublic')
            .returns(fakeSiteData);

        sandbox.stub(customThemeSettingsCache, 'getAll')
            .returns(fakeCustomThemeSettingsData);

        hbsUpdateTemplateOptionsStub = sandbox.stub(hbs, 'updateTemplateOptions');
        hbsUpdateLocalTemplateOptionsStub = sandbox.stub(hbs, 'updateLocalTemplateOptions');
    });

    it('mounts active theme if not yet mounted', function (done) {
        fakeActiveTheme.mounted = false;

        executeMiddleware(middleware, req, res, function next(err) {
            try {
                assert.equal(err, undefined);

                assert.equal(fakeActiveTheme.mount.called, true);
                assert.equal(fakeActiveTheme.mount.calledWith(req.app), true);

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
                assert.equal(err, undefined);

                assert.equal(fakeActiveTheme.mount.called, false);

                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it('throws error if theme is missing', function (done) {
        activeThemeGetStub.restore();
        activeThemeGetStub = sandbox.stub(activeTheme, 'get')
            .returns(undefined);

        executeMiddleware(middleware, req, res, function next(err) {
            try {
                // Did throw an error
                assertExists(err);
                assert.equal(err.message, 'The currently active theme "bacon-sensation" is missing.');

                assert.equal(activeThemeGetStub.called, true);
                assert.equal(fakeActiveTheme.mount.called, false);

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateTemplateOptionsStub.firstCall.args[0];
                    const data = templateOptions.data;

                    assert(data && typeof data === 'object');
                    assert('site' in data);
                    assert('labs' in data);
                    assert('config' in data);
                    assert('custom' in data);

                    // Check Theme Config
                    assert(data.config && typeof data.config === 'object');
                    assert('posts_per_page' in data.config);
                    assert('image_sizes' in data.config);
                    assert.equal(Object.keys(data.config).length, themeDataExpectedProps.length);
                    // posts per page should be set according to the stub
                    assert.equal(data.config.posts_per_page, 2);

                    // Check labs config
                    assert.deepEqual(data.labs, fakeLabsData);

                    assert.deepEqual(data.site, {
                        ...fakeSiteData,

                        // signup_url should get added
                        signup_url: '#/portal',

                        // the comments_enabled setting should be mapped to comments_access, and comments_enabled should be a boolean
                        comments_enabled: true,
                        comments_access: 'all'
                    });

                    assert.deepEqual(data.custom, fakeCustomThemeSettingsData);

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('switches @site.signup_url to RSS when signup is disabled', function (done) {
            settingsCacheGetStub.withArgs('members_signup_access').returns('none');

            executeMiddleware(middleware, req, res, function next() {
                try {
                    const templateOptions = hbsUpdateTemplateOptionsStub.firstCall.args[0];
                    const data = templateOptions.data;

                    assertExists(data.site.signup_url);
                    assert.equal(data.site.signup_url, `https://feedly.com/i/subscription/feed/${encodeURIComponent(config.get('url') + '/rss/')}`);

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert.equal(data.site._preview, previewString);
                    assert.equal(data.site.accent_color, '#000fff');

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert.equal(data.site._preview, previewString);
                    assert.equal(data.site.accent_color, '#000fff');
                    assert.equal(data.site.icon, '/content/images/myimg.png');

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert(data && typeof data === 'object');
                    assert('site' in data);
                    assert.equal(data.custom.header_typography, 'Serif');

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert(data && typeof data === 'object');
                    assert('site' in data);
                    assert('custom' in data);

                    assert.equal(data.custom.header_typography, 'Serif');

                    assert(!('unknown_setting' in data.custom));

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert(data && typeof data === 'object');
                    assert('site' in data);
                    assert.deepEqual(data.custom, {});

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
                    assert.equal(err, undefined);

                    assert.equal(hbsUpdateLocalTemplateOptionsStub.calledOnce, true);
                    const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
                    const data = templateOptions.data;

                    assert(data && typeof data === 'object');
                    assert('site' in data);
                    assert.deepEqual(data.custom, {});

                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });
});
