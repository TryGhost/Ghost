const assert = require('node:assert/strict');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;
const helpers = require('../../../../core/frontend/services/helpers');
const social_url = require('../../../../core/frontend/helpers/social_url');

const socialData = {
    facebook: 'testuser-fb',
    twitter: 'testuser-tw',
    linkedin: 'testuser-li',
    threads: 'testuser-th',
    bluesky: 'testuser.bsky.social', // Example Bluesky handle
    mastodon: 'mastodon.social/@testuser', // Example Mastodon URL
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

describe('{{social_url}} helper', function () {
    before(function () {
        // Register the helper using an object structure
        helpers.registerHelper('social_url', social_url);
        helpers.registerAlias('facebook_url', 'social_url');

        defaultGlobals = {
            data: {
                site: {
                    // @TODO: add all social platforms here if we add them to general settings
                    twitter: socialData.twitter,
                    facebook: socialData.facebook
                }
            }
        };
    });

    const platforms = [
        {name: 'facebook', expectedUrl: 'https://www.facebook.com/testuser-fb'},
        {name: 'twitter', expectedUrl: 'https://x.com/testuser-tw'},
        {name: 'linkedin', expectedUrl: 'https://www.linkedin.com/in/testuser-li'}, // Assuming /in/ structure
        {name: 'threads', expectedUrl: 'https://www.threads.net/@testuser-th'},
        {name: 'bluesky', expectedUrl: 'https://bsky.app/profile/testuser.bsky.social'}, // Assuming profile URL structure
        {name: 'mastodon', expectedUrl: 'https://mastodon.social/@testuser'}, // Assuming helper returns full URL if provided
        {name: 'tiktok', expectedUrl: 'https://www.tiktok.com/@testuser-tt'},
        {name: 'youtube', expectedUrl: 'https://www.youtube.com/testuser-yt'},
        {name: 'instagram', expectedUrl: 'https://www.instagram.com/testuser-ig'}
    ];

    platforms.forEach((platform) => {
        it(`should output the ${platform.name} url when 'type="${platform.name}"' is provided`, function () {
            assert.equal(compile(`{{social_url type="${platform.name}"}}`)
                .with(socialData), platform.expectedUrl);
        });
    });

    it('should return empty string if the type hash parameter is missing', function () {
        const templateString = `{{social_url}}`; // No type hash
        assert.equal(compile(templateString)
            .with(socialData), '');
    });

    it('should return empty string if the type hash parameter is not a supported platform', function () {
        const templateString = `{{social_url type="unknownplatform"}}`;
        assert.equal(compile(templateString)
            .with(socialData), '');
    });

    it('should return empty string if the user does not have a new platform set in their profile', function () {
        const templateString = `{{social_url type="instagram"}}`;
        assert.equal(compile(templateString)
            .with({}), '');
    });

    it('but for facebook and twitter, we do fall back to site data, same as the facebook and twitter url helpers', function () {
        assert.equal(compile(`{{social_url type="facebook"}}`)
            .with({}), 'https://www.facebook.com/testuser-fb');

        assert.equal(compile(`{{social_url type="twitter"}}`)
            .with({}), 'https://x.com/testuser-tw');
    });
});
