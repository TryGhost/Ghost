import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import themeList from '../../../../core/server/services/themes/list';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import body_class from '../../../../core/frontend/helpers/body_class';

// Stubs
// @ts-expect-error This module lacks type definitions.
import proxy from '../../../../core/frontend/services/proxy';
const { settingsCache } = proxy;

describe('{{body_class}} helper', function () {
  let options: {
    data: {
      root: { context: string[]; settings: { active_theme: string } };
      site?: { heading_font?: string; body_font?: string; _preview?: string };
    };
    site?: Record<string, unknown>;
  };

  function getSite() {
    const site = options.data.site;
    assertExists(site);
    return site;
  }

  beforeAll(function () {
    themeList.init({
      casper: {
        assets: null,
        'default.hbs': '/content/themes/casper/default.hbs',
        'index.hbs': '/content/themes/casper/index.hbs',
        'page.hbs': '/content/themes/casper/page.hbs',
        'page-about.hbs': '/content/themes/casper/page-about.hbs',
        'post.hbs': '/content/themes/casper/post.hbs',
      },
    });
  });

  beforeEach(function () {
    options = {
      data: {
        root: {
          context: [],
          settings: { active_theme: 'casper' },
        },
      },
      site: {},
    };
  });

  afterAll(function () {
    themeList.init();
  });

  it('can render class string', function () {
    options.data.root.context = ['home'];

    const rendered = body_class.call({}, options);
    assertExists(rendered);

    assert.equal(rendered.string, 'home-template');
  });

  describe('can render class string for context', function () {
    function callBodyClassWithContext(context: string[], self: Record<string, unknown>) {
      options.data.root.context = context;
      return body_class.call(self, options);
    }

    it('Standard home page', function () {
      const rendered = callBodyClassWithContext(['home', 'index'], { relativeUrl: '/' });

      assert.equal(rendered.string, 'home-template');
    });

    it('a post', function () {
      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/a-post-title',
        post: {},
      });

      assert.equal(rendered.string, 'post-template');
    });

    it('paginated index', function () {
      const rendered = callBodyClassWithContext(['index', 'paged'], { relativeUrl: '/page/4' });

      assert.equal(rendered.string, 'paged');
    });

    it('tag page', function () {
      const rendered = callBodyClassWithContext(['tag'], {
        relativeUrl: '/tag/foo',
        tag: { slug: 'foo' },
      });

      assert.equal(rendered.string, 'tag-template tag-foo');
    });

    it('paginated tag page', function () {
      const rendered = callBodyClassWithContext(['tag', 'paged'], {
        relativeUrl: '/tag/foo/page/2',
        tag: { slug: 'foo' },
      });

      assert.equal(rendered.string, 'tag-template tag-foo paged');
    });

    it('author page', function () {
      const rendered = callBodyClassWithContext(['author'], {
        relativeUrl: '/author/bar',
        author: { slug: 'bar' },
      });

      assert.equal(rendered.string, 'author-template author-bar');
    });

    it('paginated author page', function () {
      const rendered = callBodyClassWithContext(['author', 'paged'], {
        relativeUrl: '/author/bar/page/2',
        author: { slug: 'bar' },
      });

      assert.equal(rendered.string, 'author-template author-bar paged');
    });

    it('private route for password protection', function () {
      const rendered = callBodyClassWithContext(['private'], { relativeUrl: '/private/' });

      assert.equal(rendered.string, 'private-template');
    });

    it('post with tags', function () {
      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/my-awesome-post/',
        post: { tags: [{ slug: 'foo' }, { slug: 'bar' }] },
      });

      assert.equal(rendered.string, 'post-template tag-foo tag-bar');
    });

    it('a static page', function () {
      const rendered = callBodyClassWithContext(['page'], {
        relativeUrl: '/about',
        page: { page: true, slug: 'about' },
      });

      assert.equal(rendered.string, 'page-template page-about');
    });

    it('a static page with custom template (is now the same as one without)', function () {
      const rendered = callBodyClassWithContext(['page'], {
        relativeUrl: '/about',
        post: { slug: 'about' },
        page: { slug: 'about' },
      });

      assert.equal(rendered.string, 'page-template page-about');
    });
  });

  describe('custom fonts', function () {
    let settingsCacheStub: SinonStub;

    function callBodyClassWithContext(context: string[], self: Record<string, unknown>) {
      options.data.root.context = context;
      return body_class.call(self, options);
    }

    beforeEach(function () {
      settingsCacheStub = sinon.stub(settingsCache, 'get');
      options = {
        data: {
          root: {
            context: [],
            settings: { active_theme: 'casper' },
          },
          site: {},
        },
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it('includes custom font for post when set in options data object', function () {
      getSite().heading_font = 'Space Grotesk';
      getSite().body_font = 'Noto Sans';
      getSite()._preview = 'test';

      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/my-awesome-post/',
        post: { tags: [{ slug: 'foo' }, { slug: 'bar' }] },
      });

      assert.equal(
        rendered.string,
        'post-template tag-foo tag-bar gh-font-heading-space-grotesk gh-font-body-noto-sans',
      );
    });

    it('includes custom font for post when set in settings cache and no preview', function () {
      settingsCacheStub.withArgs('heading_font').returns('Space Grotesk');
      settingsCacheStub.withArgs('body_font').returns('Noto Sans');

      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/my-awesome-post/',
        post: { tags: [{ slug: 'foo' }, { slug: 'bar' }] },
      });

      assert.equal(
        rendered.string,
        'post-template tag-foo tag-bar gh-font-heading-space-grotesk gh-font-body-noto-sans',
      );
    });

    it('does not include custom font classes when custom fonts are not enabled', function () {
      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/my-awesome-post/',
        post: { tags: [{ slug: 'foo' }, { slug: 'bar' }] },
      });

      assert.equal(rendered.string, 'post-template tag-foo tag-bar');
    });

    it('includes custom font classes for home page when set in options data object', function () {
      getSite().heading_font = 'Space Grotesk';
      getSite().body_font = '';
      getSite()._preview = 'test';

      const rendered = callBodyClassWithContext(['home'], { relativeUrl: '/' });

      assert.equal(rendered.string, 'home-template gh-font-heading-space-grotesk');
    });

    it('does not inject custom fonts when preview is set and default font was selected (empty string)', function () {
      // The site has fonts set up, but we override them with Theme default fonts (empty string)
      settingsCacheStub.withArgs('heading_font').returns('Space Grotesk');
      settingsCacheStub.withArgs('body_font').returns('Noto Sans');

      getSite().heading_font = '';
      getSite().body_font = '';
      getSite()._preview = 'test';

      const rendered = callBodyClassWithContext(['home'], { relativeUrl: '/' });

      assert.equal(rendered.string, 'home-template');
    });

    it('can handle preview being set and custom font keys missing', function () {
      getSite()._preview = 'test';
      // The site has fonts set up, but we override them with Theme default fonts (empty string)
      settingsCacheStub.withArgs('heading_font').returns('Space Grotesk');
      settingsCacheStub.withArgs('body_font').returns('Noto Sans');

      const rendered = callBodyClassWithContext(['post'], {
        relativeUrl: '/my-awesome-post/',
        post: { tags: [{ slug: 'foo' }, { slug: 'bar' }] },
      });

      assert.equal(rendered.string, 'post-template tag-foo tag-bar');
    });
  });
});
