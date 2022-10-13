const should = require('should');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/configUtils');
const path = require('path');

// Stuff we are testing
const content = require('../../../../core/frontend/helpers/content');
const has = require('../../../../core/frontend/helpers/has');
const is = require('../../../../core/frontend/helpers/is');

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
        rendered.string.should.equal('');
    });

    it('can render content', function () {
        const html = 'Hello World';
        const rendered = content.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(html);
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
        rendered.string.should.equal('<p>Hello <strong>World!</strong></p>');
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
        rendered.string.should.equal('');
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
        rendered.string.should.equal('<p>Hello <strong>Wo</strong></p>');
    });
});

describe('{{content}} helper with no access', function () {
    let optionsData;
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });

        hbs.registerHelper('has', has);
        hbs.registerHelper('is', is);
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
        rendered.string.should.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('gh-post-upgrade-cta-content');
        rendered.string.should.containEql('"background-color: #abcdef"');
        rendered.string.should.containEql('"color:#abcdef"');

        should.exist(rendered);
    });

    it('outputs free content if available via paywall card', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        const rendered = content.call({html: html, access: false}, optionsData);
        rendered.string.should.containEql('Free content');
        rendered.string.should.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('gh-post-upgrade-cta-content');
        rendered.string.should.containEql('"background-color: #abcdef"');
    });

    it('can render default template with right message for post resource', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        optionsData.data.root = {
            post: {}
        };
        const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
        rendered.string.should.containEql('Free content');
        rendered.string.should.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('gh-post-upgrade-cta-content');
        rendered.string.should.containEql('"background-color: #abcdef"');
        rendered.string.should.containEql('This post is for');
    });

    it('can render default template with right message for page resource', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        optionsData.data.root = {
            context: ['page']
        };
        const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
        rendered.string.should.containEql('Free content');
        rendered.string.should.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('gh-post-upgrade-cta-content');
        rendered.string.should.containEql('"background-color: #abcdef"');
        rendered.string.should.containEql('This page is for');
    });

    it('can render default template for upgrade case', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        optionsData.data.member = {
            id: '123'
        };
        const rendered = content.call({html: html, access: false, visibility: 'members'}, optionsData);
        rendered.string.should.containEql('Free content');
        rendered.string.should.containEql('Upgrade your account');
        rendered.string.should.containEql('color:#abcdef');
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
        rendered.string.should.not.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('custom-post-upgrade-cta');
        rendered.string.should.containEql('custom-post-upgrade-cta-content');

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
        rendered.string.should.not.containEql('gh-post-upgrade-cta');
        rendered.string.should.containEql('custom-post-upgrade-cta');
        rendered.string.should.containEql('custom-post-upgrade-cta-content');
        rendered.string.should.containEql('This page is for');
    });
});
