import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import handlebarsService from '../../../../core/frontend/services/handlebars';
// @ts-expect-error This module lacks type definitions.
import helpers from '../../../../core/frontend/services/helpers';
// @ts-expect-error This module lacks type definitions.
import social_url from '../../../../core/frontend/helpers/social_url';

const { handlebars } = handlebarsService.hbs;

const socialData = {
  facebook: 'testuser-fb',
  twitter: 'testuser-tw',
  linkedin: 'testuser-li',
  threads: 'testuser-th',
  bluesky: 'testuser.bsky.social', // Example Bluesky handle
  mastodon: 'mastodon.social/@testuser', // Example Mastodon URL
  tiktok: 'testuser-tt',
  youtube: 'testuser-yt',
  instagram: 'testuser-ig',
};

let defaultGlobals: Record<string, unknown>;

function compile(templateString: string) {
  const template = handlebars.compile(templateString);
  template.with = (locals: Record<string, unknown> = {}, globals?: Record<string, unknown>) => {
    globals = globals || defaultGlobals;

    return template(locals, globals);
  };

  return template;
}

describe('{{social_url}} helper', function () {
  beforeAll(function () {
    // Register the helper using an object structure
    helpers.registerHelper('social_url', social_url);
    helpers.registerAlias('facebook_url', 'social_url');

    defaultGlobals = {
      data: {
        site: {
          ...socialData,
        },
      },
    };
  });

  const platforms = [
    { name: 'facebook', expectedUrl: 'https://www.facebook.com/testuser-fb' },
    { name: 'twitter', expectedUrl: 'https://x.com/testuser-tw' },
    { name: 'linkedin', expectedUrl: 'https://www.linkedin.com/in/testuser-li' }, // Assuming /in/ structure
    { name: 'threads', expectedUrl: 'https://www.threads.net/@testuser-th' },
    { name: 'bluesky', expectedUrl: 'https://bsky.app/profile/testuser.bsky.social' }, // Assuming profile URL structure
    { name: 'mastodon', expectedUrl: 'https://mastodon.social/@testuser' }, // Assuming helper returns full URL if provided
    { name: 'tiktok', expectedUrl: 'https://www.tiktok.com/@testuser-tt' },
    { name: 'youtube', expectedUrl: 'https://www.youtube.com/testuser-yt' },
    { name: 'instagram', expectedUrl: 'https://www.instagram.com/testuser-ig' },
  ];

  platforms.forEach((platform) => {
    it(`should output the ${platform.name} url when 'type="${platform.name}"' is provided`, function () {
      assert.equal(
        compile(`{{social_url type="${platform.name}"}}`).with(socialData),
        platform.expectedUrl,
      );
    });
  });

  it('should return empty string if the type hash parameter is missing', function () {
    const templateString = `{{social_url}}`; // No type hash
    assert.equal(compile(templateString).with(socialData), '');
  });

  it('should return empty string if the type hash parameter is not a supported platform', function () {
    const templateString = `{{social_url type="unknownplatform"}}`;
    assert.equal(compile(templateString).with(socialData), '');
  });

  it('should return empty string if neither the user nor the publication has a platform set', function () {
    const templateString = `{{social_url type="instagram"}}`;
    assert.equal(
      compile(templateString).with(
        {},
        {
          data: {
            site: {},
          },
        },
      ),
      '',
    );
  });

  platforms.forEach((platform) => {
    it(`falls back to site data for publication ${platform.name} when post-context is empty`, function () {
      assert.equal(
        compile(`{{social_url type="${platform.name}"}}`).with({}),
        platform.expectedUrl,
      );
    });
  });
});
