const assert = require('node:assert/strict');
const should = require('should');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/config-utils');
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
        assert.equal(rendered.string, '');
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

describe('{{content}} helper with member UUID replacement', function () {
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });
    });

    it('replaces URL-encoded %7Buuid%7D placeholder with member UUID', function () {
        const html = '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>';
        const rendered = content.call({html: html}, {
            data: {
                member: {
                    uuid: 'test-member-uuid-123'
                }
            }
        });

        should.exist(rendered);
        assert.equal(rendered.string, '<iframe src="https://partner.transistor.fm/ghost/embed/test-member-uuid-123"></iframe>');
    });

    it('does not replace non-encoded {uuid} placeholder', function () {
        const html = '<iframe src="https://partner.transistor.fm/ghost/embed/{uuid}"></iframe>';
        const rendered = content.call({html: html}, {
            data: {
                member: {
                    uuid: 'test-member-uuid-456'
                }
            }
        });

        should.exist(rendered);
        // Non-encoded {uuid} should NOT be replaced
        assert.equal(rendered.string, '<iframe src="https://partner.transistor.fm/ghost/embed/{uuid}"></iframe>');
    });

    it('does not replace placeholder when no member is present', function () {
        const html = '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>';
        const rendered = content.call({html: html}, {
            data: {}
        });

        should.exist(rendered);
        assert.equal(rendered.string, '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>');
    });

    it('does not replace placeholder when member has no UUID', function () {
        const html = '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>';
        const rendered = content.call({html: html}, {
            data: {
                member: {
                    id: '123'
                }
            }
        });

        should.exist(rendered);
        assert.equal(rendered.string, '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>');
    });

    it('replaces multiple %7Buuid%7D placeholders', function () {
        const html = '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe><a href="https://example.com/%7Buuid%7D">Link</a>';
        const rendered = content.call({html: html}, {
            data: {
                member: {
                    uuid: 'multi-uuid-789'
                }
            }
        });

        should.exist(rendered);
        assert.equal(rendered.string, '<iframe src="https://partner.transistor.fm/ghost/embed/multi-uuid-789"></iframe><a href="https://example.com/multi-uuid-789">Link</a>');
    });

    it('replaces UUID placeholder with truncation', function () {
        const html = '<p>Hello World</p><iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>';
        const rendered = content.call({html: html}, {
            hash: {words: 2},
            data: {
                member: {
                    uuid: 'truncate-uuid-test'
                }
            }
        });

        should.exist(rendered);
        // Truncation happens after UUID replacement
        assert.equal(rendered.string, '<p>Hello World</p>');
    });
});
