const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const configUtils = require('../../../../utils/config-utils');
const themeEngine = require('../../../../../core/frontend/services/theme-engine');
const privateController = require('../../../../../core/frontend/apps/private-blogging/lib/router');
const hbs = require('../../../../../core/frontend/services/theme-engine/engine');
const t = require('../../../../../core/frontend/helpers/t');
const input_password = require('../../../../../core/frontend/apps/private-blogging/lib/helpers/input_password');
const {setupI18nTest, initLocale} = require('../../../../utils/i18n-test-utils');

describe('Private Controller', function () {
    let res;
    let req;
    let defaultPath;
    let hasTemplateStub;

    // Helper function to prevent unit tests
    // from failing via timeout when they
    // should just immediately fail
    function failTest(done) {
        return function (err) {
            done(err);
        };
    }

    beforeEach(function () {
        hasTemplateStub = sinon.stub().returns(false);
        hasTemplateStub.withArgs('index').returns(true);

        sinon.stub(themeEngine, 'getActive').returns({
            hasTemplate: hasTemplateStub
        });

        res = {
            locals: {version: ''},
            render: sinon.spy()
        };

        req = {
            route: {path: '/private/?r=/'},
            query: {r: ''},
            params: {}
        };

        defaultPath = path.join(configUtils.config.get('paths').appRoot, '/core/frontend/apps/private-blogging/lib/views/private.hbs');

        configUtils.set({
            theme: {
                permalinks: '/:slug/'
            }
        });
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('Should render default password page when theme has no password template', function (done) {
        res.render = function (view, context) {
            assert.equal(view, defaultPath);
            assertExists(context);
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });

    it('Should render theme password page when it exists', function (done) {
        hasTemplateStub.withArgs('private').returns(true);

        res.render = function (view, context) {
            assert.equal(view, 'private');
            assertExists(context);
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });

    it('Should render with error when error is passed in', function (done) {
        res.error = 'Test Error';

        res.render = function (view, context) {
            assert.equal(view, defaultPath);
            assert.deepEqual(context, {error: 'Test Error'});
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });
});

describe('private.hbs template translation', function () {
    const privateViewPath = path.join(__dirname, '../../../../../core/frontend/apps/private-blogging/lib/views/private.hbs');
    let compiledTemplate;

    before(function () {
        const templateStr = fs.readFileSync(privateViewPath, 'utf8');
        compiledTemplate = hbs.handlebars.compile(templateStr);

        hbs.registerHelper('t', t);
        hbs.registerHelper('input_password', input_password);
        hbs.registerHelper('asset', function () {
            return new hbs.SafeString('/ghost.css');
        });
        hbs.registerHelper('img_url', function () {
            return new hbs.SafeString('');
        });
    });

    after(function () {
        hbs.handlebars.unregisterHelper('input_password');
        hbs.handlebars.unregisterHelper('asset');
        hbs.handlebars.unregisterHelper('img_url');
    });

    function renderPrivateTemplate(context) {
        return compiledTemplate(context);
    }

    const i18nImplementations = [
        {name: 'themeI18n (legacy)', useNewTranslation: false},
        {name: 'themeI18next (new)', useNewTranslation: true}
    ];

    i18nImplementations.forEach(({name, useNewTranslation}) => {
        describe(`with ${name}`, function () {
            let i18nSetup;

            before(function () {
                i18nSetup = setupI18nTest({useNewTranslation, locale: 'en'});
            });

            afterEach(function () {
                // Reset locale to English after each test to prevent leaking
                initLocale({useNewTranslation, locale: 'en'});
            });

            after(function () {
                i18nSetup.teardown();
                sinon.restore();
            });

            it('renders English strings when locale is en', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(html.includes('This site is private.'));
                assert(html.includes('placeholder="Password"'));
                assert(html.includes('Access site'));
            });

            it('renders German strings when locale is de', function () {
                initLocale({useNewTranslation, locale: 'de'});
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'de'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(html.includes('Diese Seite ist privat.'));
                assert(html.includes('placeholder="Passwort"'));
                assert(html.includes('Seite aufrufen'));
            });

            it('falls back to English when locale is fr (no fr.json)', function () {
                initLocale({useNewTranslation, locale: 'fr'});
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'fr'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(html.includes('This site is private.'));
                assert(html.includes('placeholder="Password"'));
                assert(html.includes('Access site'));
            });
        });
    });
});
