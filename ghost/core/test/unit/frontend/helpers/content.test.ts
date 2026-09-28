import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import handlebarsService from '../../../../core/frontend/services/handlebars';
// @ts-expect-error This module lacks type definitions.
import proxy from '../../../../core/frontend/services/proxy';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../utils/config-utils';
import path from 'path';
import { promisify } from 'node:util';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import content from '../../../../core/frontend/helpers/content';
// @ts-expect-error This module lacks type definitions.
import has from '../../../../core/frontend/helpers/has';
// @ts-expect-error This module lacks type definitions.
import is from '../../../../core/frontend/helpers/is';
// @ts-expect-error This module lacks type definitions.
import t from '../../../../core/frontend/helpers/t';
// @ts-expect-error This module lacks type definitions.
import { setupI18nTest, initLocale } from '../../../utils/i18n-test-utils';

const { hbs } = handlebarsService;

describe('{{content}} helper', function () {
  beforeAll(async function () {
    hbs.express4({ partialsDir: [configUtils.config.get('paths').helperTemplates] });

    const cachePartials = promisify(hbs.cachePartials.bind(hbs));
    await cachePartials();
  });

  it('renders empty string when null', function () {
    const html = null;
    const rendered = content.call({ html: html });

    assertExists(rendered);
    assert.equal(rendered.string, '');
  });

  it('can render content', function () {
    const html = 'Hello World';
    const rendered = content.call({ html: html });

    assertExists(rendered);
    assert.equal(rendered.string, html);
  });

  it('can truncate html by word', function () {
    const html = "<p>Hello <strong>World! It's me!</strong></p>";

    const rendered = content.call({ html: html }, { hash: { words: 2 } });

    assertExists(rendered);
    assert.equal(rendered.string, '<p>Hello <strong>World!</strong></p>');
  });

  it('can truncate html to 0 words', function () {
    const html = "<p>Hello <strong>World! It's me!</strong></p>";

    const rendered = content.call({ html: html }, { hash: { words: '0' } });

    assertExists(rendered);
    assert.equal(rendered.string, '');
  });

  it('can truncate html by character', function () {
    const html = "<p>Hello <strong>World! It's me!</strong></p>";

    const rendered = content.call({ html: html }, { hash: { characters: 8 } });

    assertExists(rendered);
    assert.equal(rendered.string, '<p>Hello <strong>Wo</strong></p>');
  });
});

describe('{{content}} helper with no access', function () {
  beforeAll(async function () {
    hbs.express4({ partialsDir: [configUtils.config.get('paths').helperTemplates] });

    const cachePartials = promisify(hbs.cachePartials.bind(hbs));
    await cachePartials();

    hbs.registerHelper('has', has);
    hbs.registerHelper('is', is);
    hbs.registerHelper('t', t);
  });

  // Run tests with both i18n implementations
  const i18nImplementations = [
    { name: 'themeI18n (legacy)', useNewTranslation: false },
    { name: 'themeI18next (new)', useNewTranslation: true },
  ];

  i18nImplementations.forEach(({ name, useNewTranslation }) => {
    describe(`with ${name}`, function () {
      let optionsData: {
        data: {
          site: { accent_color: string };
          root?: { post?: Record<string, unknown>; context?: string[] };
          member?: { id: string };
        };
      };
      let i18nSetup: { teardown: () => void };

      beforeEach(function () {
        i18nSetup = setupI18nTest({ useNewTranslation, locale: 'en' });
      });

      afterEach(function () {
        // Reset locale to English after each test to prevent leaking
        initLocale({ useNewTranslation, locale: 'en' });
        i18nSetup.teardown();
        proxy.labs.isSet.restore();
      });

      beforeEach(function () {
        optionsData = {
          data: {
            site: {
              accent_color: '#abcdef',
            },
          },
        };
      });

      it('can render default template', function () {
        const html = '';
        const rendered = content.call({ html: html, access: false }, optionsData);
        assert(rendered.string.includes('gh-post-upgrade-cta'));
        assert(rendered.string.includes('gh-post-upgrade-cta-content'));
        assert(rendered.string.includes('"background-color: #abcdef"'));
        assert(rendered.string.includes('"color:#abcdef"'));

        assertExists(rendered);
      });

      it('outputs free content if available via paywall card', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        const rendered = content.call({ html: html, access: false }, optionsData);
        assert(rendered.string.includes('Free content'));
        assert(rendered.string.includes('gh-post-upgrade-cta'));
        assert(rendered.string.includes('gh-post-upgrade-cta-content'));
        assert(rendered.string.includes('"background-color: #abcdef"'));
      });

      it('can render default template with right message for post resource', function () {
        // html will be included when there is free content available
        const html = 'Free content';
        optionsData.data.root = {
          post: {},
        };
        const rendered = content.call(
          { html: html, access: false, visibility: 'members' },
          optionsData,
        );
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
          context: ['page'],
        };
        const rendered = content.call(
          { html: html, access: false, visibility: 'members' },
          optionsData,
        );
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
          id: '123',
        };
        const rendered = content.call(
          { html: html, access: false, visibility: 'members' },
          optionsData,
        );
        assert(rendered.string.includes('Free content'));
        assert(rendered.string.includes('Upgrade your account'));
        assert(rendered.string.includes('color:#abcdef'));
      });

      it('translates paywall message when locale is German', function () {
        initLocale({ useNewTranslation, locale: 'de' });
        const html = 'Free content';
        optionsData.data.root = { context: ['page'] };
        const rendered = content.call(
          { html: html, access: false, visibility: 'paid' },
          optionsData,
        );
        assert(rendered.string.includes('Diese Seite ist nur für bezahlte Abonnenten.'));
      });

      it('translates sign-in prompt when locale is German', function () {
        initLocale({ useNewTranslation, locale: 'de' });
        const html = '';
        const rendered = content.call({ html: html, access: false }, optionsData);
        assert(rendered.string.includes('Hast du bereits ein Konto?'));
      });

      it('falls back to English when locale is fr (no fr.json)', function () {
        initLocale({ useNewTranslation, locale: 'fr' });
        const html = 'Free content';
        optionsData.data.root = { context: ['page'] };
        const renderedPaid = content.call(
          { html: html, access: false, visibility: 'paid' },
          optionsData,
        );
        assert(renderedPaid.string.includes('This page is for paying subscribers only'));
        const renderedNoMember = content.call({ html: '', access: false }, optionsData);
        assert(renderedNoMember.string.includes('Already have an account?'));
      });
    });
  });
});

describe('{{content}} helper with custom template', function () {
  let optionsData: undefined;
  beforeAll(async function () {
    hbs.express4({ partialsDir: [path.resolve(__dirname, './test_tpl')] });

    const cachePartials = promisify(hbs.cachePartials.bind(hbs));
    await cachePartials();

    hbs.registerHelper('has', has);
    hbs.registerHelper('is', is);
  });

  it('can render custom template', function () {
    const html = 'Hello World';
    const rendered = content.call({ html: html, access: false }, optionsData);
    assert(!rendered.string.includes('gh-post-upgrade-cta'));
    assert(rendered.string.includes('custom-post-upgrade-cta'));
    assert(rendered.string.includes('custom-post-upgrade-cta-content'));

    assertExists(rendered);
  });

  it('can correctly render message for page', function () {
    // html will be included when there is free content available
    const html = 'Free content';
    const rendered = content.call(
      { html: html, access: false, visibility: 'members' },
      {
        data: {
          root: {
            context: ['page'],
          },
        },
      },
    );
    assert(!rendered.string.includes('gh-post-upgrade-cta'));
    assert(rendered.string.includes('custom-post-upgrade-cta'));
    assert(rendered.string.includes('custom-post-upgrade-cta-content'));
    assert(rendered.string.includes('This page is for'));
  });
});
