const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/config-utils');
const path = require('path');

// Stuff we are testing
const content = require('../../../../core/frontend/helpers/content');
const has = require('../../../../core/frontend/helpers/has');
const is = require('../../../../core/frontend/helpers/is');
const t = require('../../../../core/frontend/helpers/t');
const themeI18n = require('../../../../core/frontend/services/theme-engine/i18n');
const themeI18next = require('../../../../core/frontend/services/theme-engine/i18next');
const labs = require('../../../../core/shared/labs');

describe('{{content}} helper', function () {
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });
    });

    it('renders empty string when null', function () {
        const html = null;
        const rendered = content.call({html: html});

        should.exist(rendered);
        assert.equal(rendered.string, '');
    });

    it('can render content', function () {
        const html = 'Hello World';
        const rendered = content.call({html: html});

        should.exist(rendered);
        assert.equal(rendered.string, html);
    });

    it('can truncate html by word', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            content
                .call(
                    {html: html},
                    {hash: {words: 2}}
                )
        );

        should.exist(rendered);
        assert.equal(rendered.string, '<p>Hello <strong>World!</strong></p>');
    });

    it('can truncate html to 0 words', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            content
                .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
        );

        should.exist(rendered);
        assert.equal(rendered.string, '');
    });

    it('can truncate html by character', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            content
                .call(
                    {html: html},
                    {hash: {characters: 8}}
                )
        );

        should.exist(rendered);
        assert.equal(rendered.string, '<p>Hello <strong>Wo</strong></p>');
    });
});

describe('{{content}} helper with no access', function () {
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });

        hbs.registerHelper('has', has);
        hbs.registerHelper('is', is);
        hbs.registerHelper('t', t);
    });

    // Run tests with both i18n implementations
    const i18nImplementations = [
        {name: 'themeI18n (legacy)', useNewTranslation: false},
        {name: 'themeI18next (new)', useNewTranslation: true}
    ];

    i18nImplementations.forEach(({name, useNewTranslation}) => {
        describe(`with ${name}`, function () {
            let optionsData;
            let ogI18nBasePath;
            let ogI18nextBasePath;

            before(function () {
                sinon.stub(labs, 'isSet').withArgs('themeTranslation').returns(useNewTranslation);

                ogI18nBasePath = themeI18n.basePath;
                ogI18nextBasePath = themeI18next.basePath;
                const themesPath = path.join(__dirname, '../../../utils/fixtures/themes/');
                themeI18n.basePath = themesPath;
                themeI18next.basePath = themesPath;

                if (useNewTranslation) {
                    themeI18next.init({activeTheme: 'locale-theme', locale: 'en'});
                } else {
                    themeI18n.init({activeTheme: 'locale-theme', locale: 'en'});
                }
            });

            after(function () {
                sinon.restore();
                themeI18n.basePath = ogI18nBasePath;
                themeI18next.basePath = ogI18nextBasePath;
            });

            beforeEach(function () {
                optionsData = {
                    data: {
                        site: {
                            accent_color: '#abcdef'
                        }
                    }
                };
            });

            it('can render default template', function () {
                const html = '';
                const rendered = content.call({html: html, access: false}, optionsData);
                assert(rendered.string.includes('gh-post-upgrade-cta'));
                assert(rendered.string.includes('gh-post-upgrade-cta-content'));
                assert(rendered.string.includes('"background-color: #abcdef"'));
                assert(rendered.string.includes('"color:#abcdef"'));

                should.exist(rendered);
            });

            it('outputs free content if available via paywall card', function () {
                // html will be included when there is free content available
                const html = 'Free content';
                const rendered = content.call({html: html, access: false}, optionsData);
                assert(rendered.string.includes('Free content'));
                assert(rendered.string.includes('gh-post-upgrade-cta'));
                assert(rendered.string.includes('gh-post-upgrade-cta-content'));
                assert(rendered.string.includes('"background-color: #abcdef"'));
            });

            it('can render default template with right message for post resource', function () {
                // html will be included when there is free content available
                const html = 'Free content';
                optionsData.data.root = {
                    post: {}
                };
                const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
                assert(rendered.string.includes('Free content'));
                assert(rendered.string.includes('gh-post-upgrade-cta'));
                assert(rendered.string.includes('gh-post-upgrade-cta-content'));
                assert(rendered.string.includes('"background-color: #abcdef"'));
                assert(rendered.string.includes('This post is for'));
            });

            it('can render default template with right message for page resource', function () {
                // html will be included when there is free content available
                const html = 'Free content';
                optionsData.data.root = {
                    context: ['page']
                };
                const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
                assert(rendered.string.includes('Free content'));
                assert(rendered.string.includes('gh-post-upgrade-cta'));
                assert(rendered.string.includes('gh-post-upgrade-cta-content'));
                assert(rendered.string.includes('"background-color: #abcdef"'));
                assert(rendered.string.includes('This page is for'));
            });

            it('can render default template for upgrade case', function () {
                // html will be included when there is free content available
                const html = 'Free content';
                optionsData.data.member = {
                    id: '123'
                };
                const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
                assert(rendered.string.includes('Free content'));
                assert(rendered.string.includes('Upgrade your account'));
                assert(rendered.string.includes('color:#abcdef'));
            });
        });
    });
});

describe('{{content}} helper with custom template', function () {
    let optionsData;
    before(function (done) {
        hbs.express4({partialsDir: [path.resolve(__dirname, './test_tpl')]});

        hbs.cachePartials(function () {
            done();
        });

        hbs.registerHelper('has', has);
        hbs.registerHelper('is', is);
    });

    it('can render custom template', function () {
        const html = 'Hello World';
        const rendered = content.call({html: html, access: false}, optionsData);
        assert(!rendered.string.includes('gh-post-upgrade-cta'));
        assert(rendered.string.includes('custom-post-upgrade-cta'));
        assert(rendered.string.includes('custom-post-upgrade-cta-content'));

        should.exist(rendered);
    });

    it('can correctly render message for page', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        const rendered = content.call({html: html, access: false, visibility: 'members'}, {
            data: {
                root: {
                    context: ['page']
                }
            }
        });
        assert(!rendered.string.includes('gh-post-upgrade-cta'));
        assert(rendered.string.includes('custom-post-upgrade-cta'));
        assert(rendered.string.includes('custom-post-upgrade-cta-content'));
        assert(rendered.string.includes('This page is for'));
    });
});
