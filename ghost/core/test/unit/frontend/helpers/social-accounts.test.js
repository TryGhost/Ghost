const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;
const helpers = require('../../../../core/frontend/services/helpers');
const social_accounts = require('../../../../core/frontend/helpers/social_accounts');

const socialData = {
    facebook: 'testuser-fb',
    twitter: 'testuser-tw',
    linkedin: 'testuser-li',
    threads: 'testuser-th',
    bluesky: 'testuser.bsky.social',
    mastodon: 'mastodon.social/@testuser',
    tiktok: 'testuser-tt',
    youtube: 'testuser-yt',
    instagram: 'testuser-ig'
};

let defaultGlobals;

function compile(templateString) {
    const template = handlebars.compile(templateString);
    template.with = (locals = {}, globals) => {
        globals = globals || defaultGlobals;
        return template(locals, globals);
    };
    return template;
}

describe('{{#social_accounts}} helper', function () {
    before(function () {
        helpers.registerHelper('social_accounts', social_accounts);

        defaultGlobals = {
            data: {
                site: {...socialData}
            }
        };
    });

    it('iterates over @site accounts in canonical order', function () {
        const out = compile(`{{#social_accounts @site}}{{type}}|{{/social_accounts}}`).with({});
        assert.equal(out, 'twitter|facebook|linkedin|bluesky|threads|mastodon|tiktok|youtube|instagram|');
    });

    it('exposes type, href, username, and name per iteration', function () {
        const out = compile(`{{#social_accounts @site}}{{type}}={{href}}|{{name}}|{{username}};{{/social_accounts}}`)
            .with({}, {data: {site: {twitter: 'testuser-tw', linkedin: 'testuser-li'}}});
        assert.equal(out, 'twitter=https://x.com/testuser-tw|X|testuser-tw;linkedin=https://www.linkedin.com/in/testuser-li|LinkedIn|testuser-li;');
    });

    it('uses `href` (not `url`) for the link to avoid collision with the {{url}} helper', function () {
        // Register a stub `url` helper to ensure that {{href}} inside the block
        // resolves to the per-iteration property and not the global helper.
        // Use handlebars directly (not Ghost's idempotent registerHelper) so we
        // can override and then restore the previous registration.
        const originalUrlHelper = handlebars.helpers.url;
        handlebars.registerHelper('url', () => 'WRONG');
        try {
            const out = compile(`{{#social_accounts @site}}{{href}};{{/social_accounts}}`)
                .with({}, {data: {site: {twitter: 'me'}}});
            assert.equal(out, 'https://x.com/me;');
        } finally {
            if (originalUrlHelper) {
                handlebars.registerHelper('url', originalUrlHelper);
            } else {
                delete handlebars.helpers.url;
            }
        }
    });

    it('skips platforms without a username', function () {
        const out = compile(`{{#social_accounts @site}}{{type}},{{/social_accounts}}`)
            .with({}, {data: {site: {twitter: 'me', instagram: 'me-ig'}}});
        assert.equal(out, 'twitter,instagram,');
    });

    it('renders the {{else}} block when nothing is set', function () {
        const out = compile(`{{#social_accounts @site}}link{{else}}none{{/social_accounts}}`)
            .with({}, {data: {site: {}}});
        assert.equal(out, 'none');
    });

    it('returns an empty string when nothing is set and no else block is provided', function () {
        const out = compile(`{{#social_accounts @site}}link{{/social_accounts}}`)
            .with({}, {data: {site: {}}});
        assert.equal(out, '');
    });

    it('iterates over a passed author object', function () {
        const out = compile(`{{#social_accounts author}}{{type}}={{username}};{{/social_accounts}}`)
            .with({author: {twitter: 'author-tw', bluesky: 'author.bsky.social'}});
        assert.equal(out, 'twitter=author-tw;bluesky=author.bsky.social;');
    });

    it('iterates over the current context with `this`', function () {
        const out = compile(`{{#social_accounts this}}{{type}}={{username}};{{/social_accounts}}`)
            .with({twitter: 'ctx-tw', mastodon: 'mastodon.social/@me'});
        assert.equal(out, 'twitter=ctx-tw;mastodon=mastodon.social/@me;');
    });

    it('exposes @first, @last, @index iteration vars', function () {
        const out = compile(`{{#social_accounts @site}}{{@index}}:{{type}}{{#if @first}}!{{/if}}{{#if @last}}*{{/if}} {{/social_accounts}}`)
            .with({}, {data: {site: {twitter: 'tw', facebook: 'fb', instagram: 'ig'}}});
        assert.equal(out, '0:twitter! 1:facebook 2:instagram* ');
    });

    it('throws an IncorrectUsageError when called with no source', function () {
        assert.throws(
            () => compile(`{{#social_accounts}}x{{/social_accounts}}`).with({}),
            err => err instanceof errors.IncorrectUsageError && /requires a source argument/.test(err.message)
        );
    });

    it('throws an IncorrectUsageError when used as an inline helper', function () {
        assert.throws(
            () => compile(`{{social_accounts @site}}`).with({}),
            err => err instanceof errors.IncorrectUsageError && /must be used as a block helper/.test(err.message)
        );
    });

    it('renders nothing when source is undefined (variable not in scope)', function () {
        const out = compile(`{{#social_accounts missingVar}}x{{else}}none{{/social_accounts}}`)
            .with({});
        assert.equal(out, 'none');
    });
});
