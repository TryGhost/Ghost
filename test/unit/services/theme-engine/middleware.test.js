const should = require('should');
const sinon = require('sinon');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const middleware = require('../../../../core/frontend/services/theme-engine').middleware;
// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../core/frontend/services/theme-engine/active');
const settingsCache = require('../../../../core/shared/settings-cache');

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
            members: true
        };

        sandbox.stub(activeTheme, 'get')
            .returns(fakeActiveTheme);

        sandbox.stub(settingsCache, 'get')
            .withArgs('labs').returns(fakeLabsData)
            .withArgs('active_theme').returns(fakeActiveThemeName);

        sandbox.stub(settingsCache, 'getPublic')
            .returns(fakeSiteData);

        sandbox.stub(hbs, 'updateTemplateOptions');
    });

    it('mounts active theme if not yet mounted', function (done) {
        fakeActiveTheme.mounted = false;

        executeMiddleware(middleware, req, res, function next(err) {
            should.not.exist(err);

            fakeActiveTheme.mount.called.should.be.true();
            fakeActiveTheme.mount.calledWith(req.app).should.be.true();

            done();
        });
    });

    it('does not mounts the active theme if it is already mounted', function (done) {
        fakeActiveTheme.mounted = true;

        executeMiddleware(middleware, req, res, function next(err) {
            should.not.exist(err);

            fakeActiveTheme.mount.called.should.be.false();

            done();
        });
    });

    it('throws error if theme is missing', function (done) {
        activeTheme.get.restore();
        sandbox.stub(activeTheme, 'get')
            .returns(undefined);

        executeMiddleware(middleware, req, res, function next(err) {
            // Did throw an error
            should.exist(err);
            err.message.should.eql('The currently active theme "bacon-sensation" is missing.');

            activeTheme.get.called.should.be.true();
            fakeActiveTheme.mount.called.should.be.false();

            done();
        });
    });

    it('Sets res.locals.secure to the value of req.secure', function (done) {
        req.secure = Math.random() < 0.5;

        executeMiddleware(middleware, req, res, function next(err) {
            should.not.exist(err);

            should.equal(res.locals.secure, req.secure);

            done();
        });
    });

    describe('updateTemplateOptions', function () {
        it('is called with correct data', function (done) {
            const themeDataExpectedProps = ['posts_per_page', 'image_sizes'];

            executeMiddleware(middleware, req, res, function next(err) {
                should.not.exist(err);

                hbs.updateTemplateOptions.calledOnce.should.be.true();
                const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                const data = templateOptions.data;

                data.should.be.an.Object().with.properties('site', 'labs', 'config');

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

                done();
            });
        });

        it('switches @site.signup_url to RSS when signup is disabled', function (done) {
            settingsCache.get
                .withArgs('members_signup_access').returns('none');

            executeMiddleware(middleware, req, res, function next(err) {
                const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                const data = templateOptions.data;

                should.exist(data.site.signup_url);
                data.site.signup_url.should.equal('https://feedly.com/i/subscription/feed/http%3A%2F%2F127.0.0.1%3A2369%2Frss%2F');

                done();
            });
        });
    });

    describe('Preview Mode', function () {
        it('calls updateTemplateOptions with correct data when one parameter is set', function (done) {
            const previewString = 'c=%23000fff';
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                should.not.exist(err);

                hbs.updateTemplateOptions.calledOnce.should.be.true();
                const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                const data = templateOptions.data;

                data.should.be.an.Object().with.properties('site', 'labs', 'config');

                should.equal(data.site, fakeSiteData);

                data.site.should.be.an.Object().with.properties('accent_color', '_preview');
                data.site._preview.should.eql(previewString);
                data.site.accent_color.should.eql('#000fff');

                done();
            });
        });

        it('calls updateTemplateOptions with correct data when two parameters are set', function (done) {
            const previewString = 'c=%23000fff&icon=%2Fcontent%2Fimages%2Fmyimg.png';
            req.header = () => {
                return previewString;
            };

            executeMiddleware(middleware, req, res, function next(err) {
                should.not.exist(err);

                hbs.updateTemplateOptions.calledOnce.should.be.true();
                const templateOptions = hbs.updateTemplateOptions.firstCall.args[0];
                const data = templateOptions.data;

                data.should.be.an.Object().with.properties('site', 'labs', 'config');

                should.equal(data.site, fakeSiteData);

                data.site.should.be.an.Object().with.properties('accent_color', 'icon', '_preview');
                data.site._preview.should.eql(previewString);
                data.site.accent_color.should.eql('#000fff');
                data.site.icon.should.eql('/content/images/myimg.png');

                done();
            });
        });
    });
});
