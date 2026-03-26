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
const color_to_rgba = require('../../../../../core/frontend/helpers/color_to_rgba');
const contrast_text_color = require('../../../../../core/frontend/helpers/contrast_text_color');
const json = require('../../../../../core/frontend/helpers/json');
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
        hbs.registerHelper('color_to_rgba', color_to_rgba);
        hbs.registerHelper('contrast_text_color', contrast_text_color);
        hbs.registerHelper('json', json);
        hbs.registerHelper('asset', function (assetPath) {
            return new hbs.SafeString(`/${assetPath.split('/').pop()}`);
        });
        hbs.registerHelper('img_url', function () {
            return new hbs.SafeString('');
        });
    });

    after(function () {
        hbs.handlebars.unregisterHelper('input_password');
        hbs.handlebars.unregisterHelper('color_to_rgba');
        hbs.handlebars.unregisterHelper('contrast_text_color');
        hbs.handlebars.unregisterHelper('json');
        hbs.handlebars.unregisterHelper('asset');
        hbs.handlebars.unregisterHelper('img_url');
    });

    function renderPrivateTemplate(context) {
        return compiledTemplate(context, {
            data: context
        });
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

            it('renders the site icon above the site title when an icon exists', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', icon: '/content/images/icon.png', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(/<header>[\s\S]*<img class="site-icon"[\s\S]*<h1>\s*Test\s*<\/h1>[\s\S]*<\/header>/.test(html));
            });

            it('renders the site description below the site title when present', function () {
                const context = {
                    site: {title: 'Test', description: 'A private publication', url: 'http://test.local', locale: 'en', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(/<h1>\s*Test\s*<\/h1>[\s\S]*<p class="gh-private-description">A private publication<\/p>/.test(html));
            });

            it('renders the signup form when self signup is enabled', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', allow_self_signup: true, admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(/<form class="gh-private-signup-form gh-signin"[^>]*data-ghost-private-subscribe-form[^>]*data-members-form="subscribe"/.test(html));
                assert(html.includes('data-state="idle"'));
                assert(html.includes('placeholder="Your email address"'));
                assert(html.includes('class="gh-private-signup-btn-label">Subscribe</b>'));
                assert(html.includes('class="gh-private-signup-btn-loading"'));
                assert(html.includes('class="gh-private-signup-btn-success"'));
                assert(html.includes('data-ghost-private-subscribe-feedback'));
                assert(html.includes('id="gh-private-config"'));
                assert(html.includes('src="/private.js"'));
            });

            it('uses the site accent color for the signup button when available', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', allow_self_signup: true, accent_color: '#FFFFFF', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(html.includes('style="--gh-private-accent-color: #FFFFFF; --gh-private-accent-color-rgba: rgba(255, 255, 255, 0.25); --gh-private-accent-contrast-color: #000000;"'));
            });

            it('does not render the signup form when self signup is disabled', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', allow_self_signup: false, admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(!/<form class="gh-private-signup-form gh-signin"[^>]*data-ghost-private-subscribe-form/.test(html));
            });

            it('renders English strings when locale is en', function () {
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(/<h1>\s*Test\s*<\/h1>/.test(html));
                assert(/<div class="gh-private-footer-links">[\s\S]*<a class="gh-private-powered" href="https:\/\/ghost\.org"[\s\S]*Powered by Ghost[\s\S]*\|[\s\S]*<a class="gh-private-trigger"[^>]*data-ghost-private-trigger[\s\S]*Enter access code[\s\S]*\|[\s\S]*<a href="https?:\/\/[^"]+">Site owner login<\/a>/.test(html));
                assert(html.includes('id="access"'));
                assert(html.includes('href="#access"'));
                assert(html.includes('placeholder="Access code"'));
                assert(html.includes('data-1p-ignore'));
                assert(html.includes('Enter'));
                assert(html.includes('data-ghost-private-trigger'));
                assert(html.includes('Enter access code'));
                assert(html.includes('Something went wrong, please try again.'));
                assert(html.includes('Subscription confirmed!'));
            });

            it('renders German strings when locale is de', function () {
                initLocale({useNewTranslation, locale: 'de'});
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'de', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(/<h1>\s*Test\s*<\/h1>/.test(html));
                assert(html.includes('placeholder="Zugangscode"'));
                assert(html.includes('Eingeben'));
                assert(html.includes('Zugangscode eingeben'));
                assert(html.includes('Eigentümer-Login'));
            });

            it('falls back to English when locale is fr (no fr.json)', function () {
                initLocale({useNewTranslation, locale: 'fr'});
                const context = {
                    site: {title: 'Test', url: 'http://test.local', locale: 'fr', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);
                assertExists(html);
                assert(/<h1>\s*Test\s*<\/h1>/.test(html));
                assert(html.includes('placeholder="Access code"'));
                assert(html.includes('data-1p-ignore'));
                assert(html.includes('Enter'));
                assert(html.includes('Enter access code'));
            });

            it('auto-opens the dialog when an error is present', function () {
                const context = {
                    error: {message: 'Wrong code'},
                    site: {title: 'Test', url: 'http://test.local', locale: 'en', admin_url: 'http://test.local/ghost/'}
                };
                const html = renderPrivateTemplate(context);

                assertExists(html);
                assert(html.includes('data-auto-open="true"'));
                assert(html.includes('Wrong code'));
            });
        });
    });
});
