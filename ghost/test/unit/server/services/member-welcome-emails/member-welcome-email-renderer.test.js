const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const lexicalLib = require('../../../../../core/server/lib/lexical');
const config = require('../../../../../core/shared/config');
const emailDesign = require('../../../../../core/server/lib/email-rendering/email-design');
const labs = require('../../../../../core/shared/labs');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const {
  registerHelpers,
} = require('../../../../../core/server/services/email-service/helpers/register-helpers');
const MemberWelcomeEmailRenderer = require('../../../../../core/server/services/member-welcome-emails/member-welcome-email-renderer');
const { readTemplate } = require('../../../../utils/member-welcome-email-templates');
const { malformedCssCases } = require('../../../../utils/fixtures/email-service/malformed-css');

describe('MemberWelcomeEmailRenderer', function () {
  let lexicalRenderStub;

  const defaultSiteSettings = {
    title: 'Test Site',
    url: 'https://example.com',
    accentColor: '#ff0000',
    iconUrl: 'https://example.com/content/images/icon.png',
  };

  // The first real lexicalLib.render lazily loads the Koenig renderer, jsdom and
  // the posts service, which can take longer than the default test timeout on a
  // busy CI runner. Pay that cost once here so tests using the real renderer
  // only measure the render itself.
  beforeAll(async function () {
    await lexicalLib.render(JSON.stringify(lexicalLib.blankDocument), { target: 'email' });
  }, 30000);

  beforeEach(function () {
    lexicalRenderStub = sinon.stub(lexicalLib, 'render').resolves('<p>Hello World</p>');
  });

  afterEach(function () {
    sinon.restore();
  });

  function createRenderer(options = {}) {
    return new MemberWelcomeEmailRenderer({
      t: (key) => key,
      labs,
      urlUtils,
      registerHelpers,
      linkTracking: {
        addAutomationTrackingToUrl: sinon.stub().rejects(new Error('Link tracking not expected')),
      },
      renderLexical: (lexical, renderOptions) => lexicalLib.render(lexical, renderOptions),
      readTemplate,
      ...options,
    });
  }

  // Renders the template and personalizes it for one recipient, as every send does.
  async function renderFor(renderer, { member, automationRunStepId, ...options }) {
    const rendered = await renderer.render(options);
    return renderer.personalize(rendered, { member, automationRunStepId });
  }

  describe('render', function () {
    it('renders Lexical content to HTML via lexicalLib.render', async function () {
      const renderer = createRenderer();
      const lexicalJson = '{"root":{"children":[]}}';

      await renderFor(renderer, {
        lexical: lexicalJson,
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      sinon.assert.calledOnce(lexicalRenderStub);
      sinon.assert.calledWith(lexicalRenderStub, lexicalJson, {
        target: 'email',
        design: {
          accentColor: '#ff0000',
          accentContrastColor: '#FFFFFF',
          backgroundColor: '#ffffff',
          backgroundIsDark: false,
          buttonBorderRadius: '6px',
          buttonColor: '#ff0000',
          buttonCorners: null,
          buttonStyle: null,
          buttonTextColor: '#FFFFFF',
          dividerColor: '#e0e7eb',
          hasOutlineButtons: false,
          hasRoundedImageCorners: false,
          headerBackgroundColor: null,
          headerBackgroundIsDark: false,
          imageCorners: null,
          linkColor: '#ff0000',
          linkStyle: 'underline',
          postTitleColor: '#000000',
          sectionTitleColor: null,
          textColor: '#000000',
          titleFontWeight: null,
          titleStrongWeight: '800',
          titleWeight: '700',
        },
      });
    });

    it('substitutes member template variables', async function () {
      lexicalRenderStub.resolves('<p>Hello {name}, or {first_name}! Contact: {email}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John Doe', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Hello John Doe'));
      assert(result.html.includes('or John!'));
      assert(result.html.includes('Contact: john@example.com'));
    });

    it('substitutes site template variables', async function () {
      lexicalRenderStub.resolves('<p>Welcome to {site_title} at {site_url}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Welcome to Test Site'));
      assert(result.html.includes('at https://example.com'));
    });

    it('substitutes uuid replacement token', async function () {
      lexicalRenderStub.resolves(
        '<p><a href="https://partner.transistor.fm/ghost/%%{uuid}%%">Listen</a></p>',
      );
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com', uuid: 'abc-123-def' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('abc-123-def'), 'should contain member uuid in rendered HTML');
      assert(!result.html.includes('%%{uuid}%%'), 'should not contain raw uuid token');
      assert(!result.html.includes('%%%%'), 'should not contain token wrapping');
      assert(
        !result.html.includes('%7Buuid%7D'),
        'should not contain URL-encoded uuid placeholder',
      );
      assert.match(result.html, /href="https:\/\/partner\.transistor\.fm\/ghost\/abc-123-def"/);
    });

    it('inlines accentColor into link styles', async function () {
      lexicalRenderStub.resolves('<p><a href="https://example.com">Click here</a></p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      const $link = $('a[href="https://example.com"]');
      assert($link.attr('style').includes('color: #ff0000'));
    });

    it.each(malformedCssCases)('renders content with $name', async function ({ name, html }) {
      lexicalRenderStub.resolves(html);
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert.ok(result.html.includes(`Malformed CSS case: ${name}`));
    });

    it('substitutes template variables in subject', async function () {
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome to {site_title}, {first_name}!',
        member: { name: 'John Doe', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert.equal(result.subject, 'Welcome to Test Site, John!');
    });

    it('renders empty when member name is missing and no fallback specified', async function () {
      lexicalRenderStub.resolves('<p>Hello {name}!</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.text.includes('Hello !'));
      assert(!result.html.includes('{name}'));
    });

    it('uses custom fallback when member name is missing', async function () {
      lexicalRenderStub.resolves('<p>Hello {name, "there"}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Hello there'));
    });

    it('applies each fallback of the same token separately', async function () {
      lexicalRenderStub.resolves('<p>{first_name, "friend"} and {first_name, "pal"}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Hi {first_name, "there"}',
        member: { name: '', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('friend and pal'));
      assert.equal(result.subject, 'Hi there');
    });

    it('uses custom fallback for first_name when missing', async function () {
      lexicalRenderStub.resolves('<p>Hey {first_name, "friend"}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Hey friend'));
    });

    it('ignores fallback when member name is present', async function () {
      lexicalRenderStub.resolves('<p>Hello {name, "there"}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'Jane Smith', email: 'jane@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Hello Jane Smith'));
    });

    it('renders empty when member email is missing', async function () {
      lexicalRenderStub.resolves('<p>Email: {email}!</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.text.includes('Email: !'));
      assert(!result.html.includes('{email}'));
    });

    it('extracts first name correctly from full name', async function () {
      lexicalRenderStub.resolves('<p>Hi {first_name}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John Michael Doe', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(result.html.includes('Hi John'));
    });

    it('handles whitespace in name when extracting first_name', async function () {
      lexicalRenderStub.resolves('<p>Hi {first_name, "friend"}</p>');
      const renderer = createRenderer();

      const paddedResult = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: '  Jane  Doe  ', email: 'jane@example.com' },
        siteSettings: defaultSiteSettings,
      });
      assert(paddedResult.html.includes('Hi Jane'));

      const emptyResult = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: '   ', email: 'empty@example.com' },
        siteSettings: defaultSiteSettings,
      });
      assert(emptyResult.html.includes('Hi friend'));
    });

    it('wraps content in wrapper.hbs template', async function () {
      lexicalRenderStub.resolves('<p>Content</p>');
      const renderer = createRenderer();
      const year = new Date().getFullYear();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Test Subject',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert(result.html.toLowerCase().includes('<!doctype html>'));
      assert.equal($('title').text(), 'Test Subject');
      assert.equal($('p:contains("Content")').length, 1);
      assert($.text().includes('Test Site'));
      assert($.text().includes(`© ${year}`));
      assert(
        $('a[href="https://example.com/#/portal/account/newsletters"]')
          .text()
          .includes('Manage your preferences'),
      );
    });

    it('shows an unsubscribe link in the footer when getUnsubscribeUrl is provided', async function () {
      lexicalRenderStub.resolves('<p>Content</p>');
      const renderer = createRenderer();
      const getUnsubscribeUrl = (uuid) =>
        `https://example.com/unsubscribe/?uuid=${uuid}&key=def&updatesandannouncements=1`;

      const template = await renderer.render({
        lexical: '{}',
        subject: 'Test Subject',
        siteSettings: defaultSiteSettings,
        getUnsubscribeUrl,
      });
      assert(template.html.includes('href="%%{unsubscribe_url}%%"'));

      const result = renderer.personalize(template, {
        member: { name: 'John', email: 'john@example.com', uuid: 'abc' },
      });

      const $ = cheerio.load(result.html);
      assert.equal(
        $('a[href="https://example.com/unsubscribe/?uuid=abc&key=def&updatesandannouncements=1"]')
          .text()
          .trim(),
        'Unsubscribe',
      );
      assert(
        result.html.includes(
          // Server-generated, so inserted unescaped, as newsletters do.
          'href="https://example.com/unsubscribe/?uuid=abc&key=def&updatesandannouncements=1"',
        ),
      );
      assert.equal($('a:contains("Manage your preferences")').length, 0);
      assert.equal(
        result.listUnsubscribe,
        'https://example.com/unsubscribe/?uuid=abc&key=def&updatesandannouncements=1',
      );
    });

    it('preserves multiline code block whitespace in the shared email wrapper', async function () {
      lexicalRenderStub.resolves(
        '<pre><code>const firstLine = 1;\nconst secondLine = 2;</code></pre>',
      );
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      const $code = $('pre code');
      assert($code.length, 'Expected rendered welcome email HTML to include a code block');
      assert.equal($code.text(), 'const firstLine = 1;\nconst secondLine = 2;');
    });

    it('resolves relative portal links to absolute URLs', async function () {
      lexicalRenderStub.resolves(
        '<table class="kg-card kg-button-card"><tbody><tr><td><table class="btn"><tbody><tr><td align="center"><a href="#/portal/support">Support us</a></td></tr></tbody></table></td></tr></tbody></table>',
      );
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      const $link = $('a[href="https://example.com/#/portal/support"]');
      assert($link.length, 'Expected a link to the absolute portal support URL');
      assert.equal($link.text(), 'Support us');
    });

    it('resolves transform-ready URLs before rendering Lexical content', async function () {
      lexicalRenderStub.restore();
      const renderer = createRenderer();
      const siteUrl = config.get('url');
      const lexical = JSON.stringify({
        root: {
          children: [
            {
              children: [
                {
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Open the archive',
                      type: 'extended-text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  rel: 'noreferrer',
                  target: null,
                  title: null,
                  type: 'link',
                  url: '__GHOST_URL__/archive/',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      });

      const result = await renderFor(renderer, {
        lexical,
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: {
          ...defaultSiteSettings,
          url: siteUrl,
        },
      });

      const $ = cheerio.load(result.html);
      const $link = $(`a[href="${siteUrl}/archive/"]`);
      assert($link.length, 'Expected a transform-ready URL to resolve against the site URL');
      assert(!result.html.includes('__GHOST_URL__'));
    });

    it('generates plain text from HTML', async function () {
      lexicalRenderStub.resolves('<p>Hello World</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert.equal(typeof result.text, 'string');
      assert(result.text.includes('Hello World'));
    });

    it('throws IncorrectUsageError for invalid Lexical', async function () {
      lexicalRenderStub.rejects(new Error('Invalid JSON'));
      const renderer = createRenderer();

      await assert.rejects(
        renderFor(renderer, {
          lexical: 'invalid',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        }),
        errors.IncorrectUsageError,
      );
    });

    it('includes error context in IncorrectUsageError', async function () {
      lexicalRenderStub.rejects(new Error('Parse error'));
      const renderer = createRenderer();

      await assert.rejects(
        renderFor(renderer, {
          lexical: 'invalid',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        }),
        (err) => {
          assert(err instanceof errors.IncorrectUsageError);
          assert.equal(err.context, 'Parse error');
          return true;
        },
      );
    });

    it('renders a template with member placeholders and their definitions', async function () {
      lexicalRenderStub.resolves(
        '<p>Hi {first_name, "there"}, {name} at {site_title}. {unknown}</p><p><a href="https://partner.example/?u={uuid}">Link</a></p>',
      );
      const renderer = createRenderer();

      const template = await renderer.render({
        lexical: '{}',
        subject: 'Hi {first_name, "there"} from {site_title}',
        siteSettings: defaultSiteSettings,
      });

      assert.match(template.html, /Hi %%\{first_name\w*\}%%, %%\{name\}%% at Test Site\. <\/p>/);
      assert(template.html.includes('href="https://partner.example/?u=%%{uuid}%%"'));
      assert.match(template.text, /Hi %%\{first_name\w*\}%%, %%\{name\}%% at Test Site\./);
      assert.match(template.subject, /^Hi %%\{first_name\w*\}%% from Test Site$/);
      const trusted = Object.fromEntries(
        template.replacementDefinitions.map(({ id, trusted: isTrusted }) => [id, isTrusted]),
      );
      assert.equal(trusted.name, false);
      assert.equal(trusted.uuid, true);

      const personalize = (member) => renderer.personalize(template, { member });
      const ann = personalize({ name: '  Ann  Marie ', uuid: 'member-uuid' });
      assert(ann.html.includes('Hi Ann,   Ann  Marie  at Test Site.'));
      assert(ann.html.includes('href="https://partner.example/?u=member-uuid"'));
      assert.equal(ann.subject, 'Hi Ann from Test Site');
      const anonymous = personalize({ name: '', uuid: 'member-uuid' });
      assert(anonymous.html.includes('Hi there,  at Test Site.'));
      assert.equal(anonymous.subject, 'Hi there from Test Site');
    });

    it('does not fill in placeholders that appear inside a member value', async function () {
      lexicalRenderStub.resolves('<p>Hello {name} / {email} / {first_name, "there"}</p>');
      const renderer = createRenderer();
      const template = await renderer.render({
        lexical: '{}',
        subject: '{name} / {email}',
        siteSettings: defaultSiteSettings,
      });

      // Each value is inserted once and never scanned again, as Mailgun substitutes in one pass.
      const known = renderer.personalize(template, {
        member: { name: '%%{email}%%', email: 'jo@example.com' },
      });
      assert(known.html.includes('Hello %%{email}%% / jo@example.com / %%{email}%%</p>'));
      assert(known.text.includes('Hello %%{email}%% / jo@example.com / %%{email}%%'));
      assert.equal(known.subject, '%%{email}%% / jo@example.com');

      const unknown = renderer.personalize(template, {
        member: { name: 'Ann %%{unknown}%%', email: 'ann@example.com' },
      });
      assert(unknown.html.includes('Hello Ann %%{unknown}%% / ann@example.com / Ann</p>'));
      assert.equal(unknown.subject, 'Ann %%{unknown}%% / ann@example.com');
    });

    it('fills member values into plaintext converted once from the template', async function () {
      // As in newsletters, plaintext is converted from the template before values are filled in,
      // so whitespace in a value is kept and an empty value can leave a double space.
      lexicalRenderStub.resolves(
        '<p>Hi {name} there</p><p><a href="https://example.com/u/{name}">{name}</a></p>',
      );
      const renderer = createRenderer();
      const template = await renderer.render({
        lexical: '{}',
        subject: 'Welcome!',
        siteSettings: defaultSiteSettings,
      });

      const spaced = renderer.personalize(template, {
        member: { name: 'Ann   Lee', email: 'ann@example.com' },
      });
      assert(spaced.text.includes('Hi Ann   Lee there'));
      assert(spaced.text.includes('Ann   Lee [https://example.com/u/Ann   Lee]'));

      const empty = renderer.personalize(template, {
        member: { name: '', email: 'ann@example.com' },
      });
      assert(empty.text.includes('Hi  there'));
    });

    it('fills in placeholder-shaped text in the site title and footer content', async function () {
      // As in newsletters, placeholders are filled in across the whole rendered email.
      lexicalRenderStub.resolves('<p>Content</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        siteSettings: { ...defaultSiteSettings, title: 'Club %%{first_name}%%' },
        designSettings: { footer_content: '<p>Sent to %%{email}%%</p>' },
        member: { name: 'Ann Lee', email: 'ann@example.com' },
      });

      assert(result.html.includes('Club Ann'));
      assert(result.html.includes('Sent to ann@example.com'));
      assert(!result.html.includes('%%{'));
    });

    it('serializes an attribute holding only an empty member value as an empty string', async function () {
      lexicalRenderStub.resolves('<p><img src="https://example.com/a.png" alt="{name}"></p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        siteSettings: defaultSiteSettings,
        member: { name: '', email: 'ann@example.com' },
      });

      assert.match(result.html, /<img src="https:\/\/example\.com\/a\.png" alt=""/);
    });

    it('personalizes one template for several recipients without sharing their values', async function () {
      lexicalRenderStub.resolves('<p>Hi {first_name, "friend"}, {email} / {uuid}</p>');
      const renderer = createRenderer();
      const template = await renderer.render({
        lexical: '{}',
        subject: 'Hi {name}',
        siteSettings: defaultSiteSettings,
      });
      const templateBefore = JSON.stringify(template);

      const ann = renderer.personalize(template, {
        member: { name: 'Ann Lee', email: 'ann@example.com', uuid: 'uuid-ann' },
      });
      const bob = renderer.personalize(template, {
        member: { name: '', email: 'bob@example.com', uuid: 'uuid-bob' },
      });

      assert(ann.html.includes('Hi Ann, ann@example.com / uuid-ann</p>'));
      assert.equal(ann.subject, 'Hi Ann Lee');
      assert(bob.html.includes('Hi friend, bob@example.com / uuid-bob</p>'));
      assert.equal(bob.subject, 'Hi ');
      assert(!/ann|Ann/.test(bob.html + bob.text + bob.subject));
      assert.equal(JSON.stringify(template), templateBefore);
    });

    it('fills placeholders with empty strings when the member has no values', async function () {
      lexicalRenderStub.resolves('<p>N={name}|F={first_name}|E={email}|U={uuid}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Hi {name}{first_name}',
        siteSettings: defaultSiteSettings,
        member: {},
      });

      assert(result.html.includes('N=|F=|E=|U=</p>'));
      assert(result.text.includes('N=|F=|E=|U='));
      assert.equal(result.subject, 'Hi ');
      assert(!/undefined|null|%%\{/.test(result.html + result.text + result.subject));
    });

    it('personalizes member values, escaped only in the HTML body', async function () {
      lexicalRenderStub.resolves(
        '<p>Hello {name}!</p><p><a href="https://partner.example/?u={uuid}">{first_name, "friend"}</a></p>',
      );
      const renderer = createRenderer();
      const template = await renderer.render({
        lexical: '{}',
        subject: 'Welcome {name}',
        siteSettings: defaultSiteSettings,
      });

      const name = '<b>Tom & "Jo"</b> O\'Brien `a=b` Zoë 😀';
      const result = renderer.personalize(template, {
        member: { name, email: 'tom@example.com', uuid: 'abc-123' },
      });

      // Handlebars' escapeExpression, as newsletters use for their `_html` recipient variables:
      // & < > " ' ` = become entities; everything else, including non-ASCII, stays as is.
      const escapedName =
        '&lt;b&gt;Tom &amp; &quot;Jo&quot;&lt;/b&gt; O&#x27;Brien &#x60;a&#x3D;b&#x60; Zoë 😀';
      assert(result.html.includes(`Hello ${escapedName}!`));
      assert(result.html.includes(`<title>Welcome ${escapedName}</title>`));
      assert(result.html.includes('href="https://partner.example/?u=abc-123"'));
      assert(result.html.includes('>&lt;b&gt;Tom</a>'));
      assert(result.text.includes(`Hello ${name}!`));
      assert(result.text.includes('<b>Tom [https://partner.example/?u=abc-123]'));
      assert.equal(result.subject, `Welcome ${name}`);
      assert.equal(result.listUnsubscribe, undefined);
      assert(!/%%\{/.test(result.html + result.text + result.subject));
    });

    it('escapes HTML in member values for body but not subject', async function () {
      lexicalRenderStub.resolves('<p>Hello {name}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome {name}!',
        member: { name: '<script>alert("xss")</script>', email: 'test@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert($.text().includes('<script>alert("xss")</script>'));
      assert.equal($('script').length, 0);
      assert.equal(result.subject, 'Welcome <script>alert("xss")</script>!');
    });

    it('uses &#39;, not &apos;, for Outlook support', async function () {
      lexicalRenderStub.resolves("<p>It's great to have you!</p>");
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(!result.html.includes('&apos;'), 'HTML should not contain &apos;');
      assert(result.html.includes('&#39;'), 'HTML should contain &#39;');
    });

    it('removes unknown tokens from output', async function () {
      lexicalRenderStub.resolves('<p>Hello {unknown_token} and {another}</p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome {invalid}!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      assert(!result.html.includes('%%{'));
      assert(!result.html.includes('}%%'));
      assert.equal(result.subject, 'Welcome !');
    });

    it('removes code wrappers around replacement strings', async function () {
      lexicalRenderStub.resolves('<p>Hello <code>{first_name}</code></p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John Doe', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert.equal($('code').length, 0);
      assert(result.html.includes('Hello John'));
    });

    it('preserves code blocks that are not replacement strings', async function () {
      lexicalRenderStub.resolves(
        '<p>Here is some code: <code>if (x) { return y; }</code> and a greeting for <code>{first_name}</code></p>',
      );
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John Doe', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert.equal($('code').text(), 'if (x) { return y; }');
      assert(result.html.includes('a greeting for John'));
      assert(!result.html.includes('{first_name}'));
    });

    it('removes code wrappers around replacement strings with fallback', async function () {
      lexicalRenderStub.resolves('<p>Hey <code>{first_name, "friend"}</code></p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert.equal($('code').length, 0);
      assert(result.html.includes('Hey friend'));
    });

    it('removes code wrappers around replacement strings with fallback (no comma)', async function () {
      lexicalRenderStub.resolves('<p>Hey <code>{first_name "friend"}</code></p>');
      const renderer = createRenderer();

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert.equal($('code').length, 0);
      assert(result.html.includes('Hey friend'));
    });

    it('translates footer text using the t helper', async function () {
      lexicalRenderStub.resolves('<p>Content</p>');
      const renderer = createRenderer({
        t: (key) => {
          if (key === 'Manage your preferences') {
            return 'Gérer vos préférences';
          }
          return key;
        },
      });

      const result = await renderFor(renderer, {
        lexical: '{}',
        subject: 'Welcome!',
        member: { name: 'John', email: 'john@example.com' },
        siteSettings: defaultSiteSettings,
      });

      const $ = cheerio.load(result.html);
      assert($.text().includes('Gérer vos préférences'));
      assert(!$.text().includes('Manage your preferences'));
    });

    describe('automation click tracking', function () {
      const memberUuid = '00000000-0000-4000-8000-000000000001';
      let addAutomationTrackingToUrl;

      beforeEach(function () {
        // Mirrors LinkClickTrackingService.addAutomationTrackingToUrl.
        addAutomationTrackingToUrl = sinon
          .stub()
          .callsFake(async (url, revisionId, runStepId, uuid) => {
            assert.equal(revisionId, 'revision-id');
            const tracked = new URL('https://example.com/r/abc123');
            tracked.searchParams.set('m', uuid);
            tracked.searchParams.set('step', runStepId);
            return tracked;
          });
      });

      const renderTracked = async (html, options = {}) => {
        lexicalRenderStub.resolves(html);
        return await renderFor(createRenderer({ linkTracking: { addAutomationTrackingToUrl } }), {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com', uuid: memberUuid },
          siteSettings: defaultSiteSettings,
          trackClicks: true,
          automationActionRevisionId: 'revision-id',
          automationRunStepId: 'run-step-id',
          ...options,
        });
      };

      it('rewrites absolute content links in HTML and finalized plaintext', async function () {
        const result = await renderTracked(
          '<p><a href="https://external.example/page">External link</a></p>',
        );

        sinon.assert.calledOnceWithExactly(
          addAutomationTrackingToUrl,
          sinon.match((url) => url.href === 'https://external.example/page'),
          'revision-id',
          sinon.match.string,
          sinon.match.string,
        );
        assert(
          result.html.includes(`https://example.com/r/abc123?m=${memberUuid}&amp;step=run-step-id`),
        );
        assert(
          result.text.includes(`https://example.com/r/abc123?m=${memberUuid}&step=run-step-id`),
        );
      });

      it('resolves relative links before tracking them', async function () {
        await renderTracked('<p><a href="/about">About</a></p>');

        sinon.assert.calledWith(
          addAutomationTrackingToUrl,
          sinon.match((url) => url.href === 'https://example.com/about'),
        );
      });

      it('uses the same redirect destination for repeated URLs', async function () {
        const result = await renderTracked(
          '<p><a href="https://external.example/page">One</a><a href="https://external.example/page">Two</a></p>',
        );

        sinon.assert.calledTwice(addAutomationTrackingToUrl);
        assert.equal(
          (
            result.html.match(
              new RegExp(
                `https://example.com/r/abc123\\?m=${memberUuid}&amp;step=run-step-id`,
                'g',
              ),
            ) || []
          ).length,
          2,
        );
      });

      it('leaves fragment-only, invalid, and non-web links unchanged', async function () {
        const result = await renderTracked(
          '<p><a href="#section">Fragment</a><a href="mailto:hi@example.com">Mail</a><a href="http://[">Invalid</a></p>',
        );

        sinon.assert.notCalled(addAutomationTrackingToUrl);
        assert(result.html.includes('href="#section"'));
        assert(result.html.includes('href="mailto:hi@example.com"'));
        assert(result.html.includes('href="http://["'));
      });

      it('does not touch wrapper and footer links', async function () {
        const result = await renderTracked(
          '<p><a href="https://external.example/page">Content</a></p>',
        );
        const $ = cheerio.load(result.html);

        sinon.assert.calledOnce(addAutomationTrackingToUrl);
        assert.equal($('a[href="https://ghost.org/?via=pbg-newsletter"]').length, 1);
        assert.equal($('a[href*="#/portal/account/newsletters"]').length, 1);
      });

      it('does not rewrite links when click tracking is disabled', async function () {
        const result = await renderTracked(
          '<p><a href="https://external.example/page">Link</a></p>',
          { trackClicks: false },
        );
        const $ = cheerio.load(result.html);

        sinon.assert.notCalled(addAutomationTrackingToUrl);
        assert.equal($('a[href="https://external.example/page"]').text(), 'Link');
      });

      it('looks up one redirect per link and leaves the member UUID and step ID as placeholders', async function () {
        lexicalRenderStub.resolves(
          '<p><a href="https://external.example/page">Link</a> <a href="https://external.example/{uuid}/feed">Feed</a></p>',
        );
        const renderer = createRenderer({ linkTracking: { addAutomationTrackingToUrl } });

        const template = await renderer.render({
          lexical: '{}',
          subject: 'Welcome!',
          siteSettings: defaultSiteSettings,
          trackClicks: true,
          automationActionRevisionId: 'revision-id',
        });

        sinon.assert.calledTwice(addAutomationTrackingToUrl);
        // The redirect fills in %%{uuid}%% from ?m= when a member clicks.
        sinon.assert.calledWith(
          addAutomationTrackingToUrl,
          sinon.match((url) => url.href === 'https://external.example/%%%7Buuid%7D%%/feed'),
        );
        assert.equal(
          template.html.match(
            /https:\/\/example\.com\/r\/abc123\?m=%%\{uuid\}%%&amp;step=%%\{step_id\}%%/g,
          )?.length,
          2,
        );
        assert(
          template.text.includes('https://example.com/r/abc123?m=%%{uuid}%%&step=%%{step_id}%%'),
        );
        assert.deepEqual(
          template.replacementDefinitions.map(({ id, trusted }) => ({ id, trusted })),
          [
            { id: 'uuid', trusted: true },
            { id: 'step_id', trusted: true },
          ],
        );
      });

      it('does not track links that carry member values other than the UUID', async function () {
        // One redirect can't serve every recipient when its destination differs per member.
        const result = await renderTracked(
          '<p><a href="https://forms.example/?email={email}&amp;name={first_name}">Form</a></p>',
        );

        sinon.assert.notCalled(addAutomationTrackingToUrl);
        assert(
          result.html.includes(
            'href="https://forms.example/?email=john@example.com&amp;name=John"',
          ),
        );
      });

      it('fills in a mailto link with the member email, untracked', async function () {
        const result = await renderTracked('<p><a href="mailto:{email}">Reply</a></p>');

        sinon.assert.notCalled(addAutomationTrackingToUrl);
        assert(result.html.includes('href="mailto:john@example.com"'));
        assert(result.text.includes('Reply [john@example.com]'));
      });

      it('inserts member values into link URLs without percent-encoding them', async function () {
        // As with newsletters' Mailgun recipient variables, the raw value is inserted.
        const result = await renderTracked(
          '<p><a href="https://example.com/profile/{name}">Visit</a></p>',
          {
            trackClicks: false,
            member: { name: 'Ric Flair', email: 'ricflair@woo.example', uuid: memberUuid },
          },
        );

        const $ = cheerio.load(result.html);
        const href = $('a')
          .filter((_, link) => $(link).text() === 'Visit')
          .attr('href');
        const expectedUrl = 'https://example.com/profile/Ric Flair';

        assert.deepEqual(
          {
            href,
            plaintextLink: result.text.split('\n').find((line) => line.startsWith('Visit [')),
          },
          { href: expectedUrl, plaintextLink: `Visit [${expectedUrl}]` },
        );
      });

      it('does not recognise a fallback token in a link URL, as before', async function () {
        // Lexical writes the fallback's quotes as &quot; inside an href, which the token pattern
        // does not match, so the token stays literal and the link is tracked to that destination.
        const result = await renderTracked(
          '<p><a href="https://feeds.example/?u={uuid, &quot;anonymous&quot;}">Feed</a></p>',
        );

        sinon.assert.calledOnceWithExactly(
          addAutomationTrackingToUrl,
          sinon.match((url) => url.href === 'https://feeds.example/?u={uuid,%20%22anonymous%22}'),
          'revision-id',
          sinon.match.string,
          sinon.match.string,
        );
        assert(
          result.html.includes(
            `href="https://example.com/r/abc123?m=${memberUuid}&amp;step=run-step-id"`,
          ),
        );
      });

      it('fills in only the m and step values when the redirect path contains the marker text', async function () {
        // A site installed under a path such as /--uuid--/ puts that path in every redirect URL.
        addAutomationTrackingToUrl.callsFake(async (url, revisionId, runStepId, uuid) => {
          const tracked = new URL('https://example.com/--uuid--/--step-id--/r/abc123');
          tracked.searchParams.set('m', uuid);
          tracked.searchParams.set('step', runStepId);
          return tracked;
        });

        const result = await renderTracked(
          '<p><a href="https://external.example/page">Link</a></p>',
        );

        assert(
          result.html.includes(
            `href="https://example.com/--uuid--/--step-id--/r/abc123?m=${memberUuid}&amp;step=run-step-id"`,
          ),
        );
      });

      it('tracks a link with the member UUID in its query string through one shared redirect', async function () {
        const result = await renderTracked(
          '<p><a href="https://partner.example/feed?u={uuid}&amp;x=1">Feed</a></p>',
        );

        // The redirect fills in %%{uuid}%% from ?m= when a member clicks.
        sinon.assert.calledOnceWithExactly(
          addAutomationTrackingToUrl,
          sinon.match((url) => url.href === 'https://partner.example/feed?u=%%{uuid}%%&x=1'),
          'revision-id',
          sinon.match.string,
          sinon.match.string,
        );
        assert(
          result.html.includes(
            `href="https://example.com/r/abc123?m=${memberUuid}&amp;step=run-step-id"`,
          ),
        );
      });

      it('leaves a link whose whole href is a member value as that value, untracked', async function () {
        // As in newsletters, the value is only known per recipient, so neither the site URL nor
        // tracking is added to it.
        const html =
          '<p><a href="{email}">Email</a> <a href="{uuid}">Uuid</a> <a href="{name}">Name</a></p>';
        const hrefs = (result) =>
          [...result.html.matchAll(/<a href="([^"]*)"[^>]*>(?:Email|Uuid|Name)<\/a>/g)].map(
            ([, href]) => href,
          );

        for (const trackClicks of [false, true]) {
          const fullUrl = await renderTracked(html, {
            trackClicks,
            member: {
              name: 'https://other.example/go?a=1&b=2',
              email: 'john@example.com',
              uuid: memberUuid,
            },
          });
          assert.deepEqual(hrefs(fullUrl), [
            'john@example.com',
            memberUuid,
            // Handlebars' escapeExpression turns = into &#x3D; and & into &amp;.
            'https://other.example/go?a&#x3D;1&amp;b&#x3D;2',
          ]);

          const anchor = await renderTracked(html, {
            trackClicks,
            member: { name: '#section', email: 'john@example.com', uuid: memberUuid },
          });
          assert.equal(hrefs(anchor)[2], '#section');
        }
        sinon.assert.notCalled(addAutomationTrackingToUrl);
      });
    });

    describe('design customization', function () {
      it('builds the email design from database-backed design settings', async function () {
        const getEmailDesignStub = sinon
          .stub(emailDesign, 'getEmailDesign')
          .returns({ accentColor: '#123456' });

        const renderer = createRenderer();
        const designSettings = {
          background_color: '#111111',
          button_color: '#222222',
          button_corners: 'pill',
          button_style: 'outline',
          divider_color: '#333333',
          header_background_color: '#444444',
          image_corners: 'rounded',
          link_color: '#555555',
          link_style: 'bold',
          section_title_color: '#666666',
          title_font_weight: 'medium',
        };

        await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          designSettings,
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        sinon.assert.calledOnceWithExactly(getEmailDesignStub, {
          accentColor: '#ff0000',
          backgroundColor: '#111111',
          buttonColor: '#222222',
          buttonCorners: 'pill',
          buttonStyle: 'outline',
          dividerColor: '#333333',
          headerBackgroundColor: '#444444',
          imageCorners: 'rounded',
          linkColor: '#555555',
          linkStyle: 'bold',
          postTitleColor: null,
          sectionTitleColor: '#666666',
          titleFontWeight: 'medium',
        });

        sinon.assert.calledWith(lexicalRenderStub, '{}', {
          target: 'email',
          design: { accentColor: '#123456' },
        });
      });

      it('passes header and footer settings through to the wrapper template', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            footer_content: '<p>Custom footer</p>',
            header_image: 'https://example.com/header.png',
            show_badge: true,
            show_header_title: false,
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert.equal($('img[src="https://example.com/header.png"]').length, 1);
        assert.equal($('p:contains("Custom footer")').length, 1);
        assert.equal($('a[href="https://ghost.org/?via=pbg-newsletter"]').length, 1);
      });

      it('renders the publication icon when enabled and a site icon exists', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            show_header_icon: true,
            show_header_title: false,
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.header').length);
        assert($('.site-icon').length);
        assert($('img[src="https://example.com/content/images/icon.png"]').length);
      });

      it('does not render the publication icon when disabled', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            show_header_icon: false,
            show_header_title: false,
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert.equal($('.header').length, 0);
        assert.equal($('.site-icon').length, 0);
        assert.equal($('img[src="https://example.com/content/images/icon.png"]').length, 0);
      });

      it('does not render the publication icon when the site icon is missing', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            show_header_icon: true,
            show_header_title: false,
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: {
            ...defaultSiteSettings,
            iconUrl: null,
          },
        });

        const $ = cheerio.load(result.html);
        assert.equal($('.header').length, 0);
        assert.equal($('.site-icon').length, 0);
        assert.equal($('img[src="https://example.com/content/images/icon.png"]').length, 0);
      });

      it('uses the sans-serif content-shell class by default when design customization is enabled', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('tr.post-content-row').length);
        assert($('.post-content-sans-serif').length);
        assert(
          $('.post-content-sans-serif')
            .attr('style')
            .includes(
              'font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
            ),
        );
      });

      it('uses the serif content-shell class when a serif body font is explicitly configured', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            body_font_category: 'serif',
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('tr.post-content-row').length);
        assert($('.post-content').length);
        assert($('.post-content').attr('style').includes('font-family: Georgia, serif'));
      });

      it('applies custom link colors when design customization is enabled', async function () {
        lexicalRenderStub.resolves('<p><a href="https://example.com">Custom link</a></p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            link_color: '#000000',
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('a:contains("Custom link")').attr('style').includes('color: #000000'));
      });

      it('applies header image styles and preserves header background color', async function () {
        lexicalRenderStub.resolves('<p>Content</p>');
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Test Subject',
          designSettings: {
            header_background_color: '#123456',
            header_image: 'https://example.com/header.png',
            show_badge: false,
            show_header_title: false,
          },
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.header').attr('style').includes('background-color: #123456'));
        assert($('.header-image').length);
        assert($('img[src="https://example.com/header.png"]').length);
      });

      it('applies shared Koenig card styles used by newsletters', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td class="kg-card-spacing">
                                    <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <a href="https://example.com">Click me</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="kg-card kg-callout-card kg-callout-card-blue">
                        <div class="kg-callout-emoji">💡</div>
                        <div class="kg-callout-text">Shared styles</div>
                    </div>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.kg-callout-card').attr('style').includes('padding: 24px'));
        assert($('table.btn [style*="background-color: #ff0000"]').length);
      });

      it('applies transistor card styles in welcome emails', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 24px; text-align: center;">
                                <a href="https://partner.transistor.fm/ghost/%%{uuid}%%" class="kg-transistor-title">
                                    Listen to your podcasts
                                </a>
                                <a href="https://partner.transistor.fm/ghost/%%{uuid}%%" class="kg-transistor-description">
                                    Subscribe and listen to your personal podcast feed in your favorite app.
                                </a>
                            </td>
                        </tr>
                    </table>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com', uuid: 'abc-123-def' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.kg-card.kg-transistor-card').attr('style').includes('border-radius: 10px'));
        assert(
          $('.kg-card.kg-transistor-card')
            .attr('style')
            .includes('border: 1px solid rgba(0, 0, 0, 0.12)'),
        );
        assert($('.kg-transistor-title').attr('style').includes('display: block'));
        assert($('.kg-transistor-title').attr('style').includes('text-decoration: none'));
        assert($('.kg-transistor-description').attr('style').includes('max-width: 400px'));
        assert($('a[href="https://partner.transistor.fm/ghost/abc-123-def"]').length);
        assert(!result.html.includes('%%abc-123-def%%'));
      });

      it('applies bookmark and YouTube embed card styles', async function () {
        lexicalRenderStub.resolves(`
                    <figure class="kg-card kg-bookmark-card">
                        <a class="kg-bookmark-container" href="https://example.com">
                            <div class="kg-bookmark-content">
                                <div class="kg-bookmark-title">Example title</div>
                                <div class="kg-bookmark-description">Example description</div>
                                <div class="kg-bookmark-metadata">
                                    <span class="kg-bookmark-author">Example author</span>
                                </div>
                            </div>
                            <div class="kg-bookmark-thumbnail">
                                <img src="https://example.com/thumb.jpg" alt="">
                            </div>
                        </a>
                    </figure>
                    <figure class="kg-card kg-embed-card kg-card-hascaption">
                        <a class="kg-video-preview" href="https://youtube.com/watch?v=abc123" aria-label="Play video">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation">
                                <tr>
                                    <td width="50%" align="center" valign="middle">
                                        <div class="kg-video-play-button"><div></div></div>
                                    </td>
                                </tr>
                            </table>
                        </a>
                        <figcaption>Embed note</figcaption>
                    </figure>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.kg-bookmark-container').attr('style').includes('display: flex'));
        assert($('.kg-video-preview').attr('style').includes('background-color: #1d1f21'));
        assert($.text().includes('Embed note'));
      });

      it('applies call-to-action and product card styles', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-cta-card kg-cta-bg-none kg-cta-immersive kg-cta-link-accent" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td class="kg-cta-sponsor-label"><p><a href="https://example.com/sponsor">Sponsor</a></p></td>
                        </tr>
                        <tr>
                            <td class="kg-cta-content">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="kg-cta-content-wrapper">
                                    <tr>
                                        <td class="kg-cta-text"><p>CTA body with <a href="https://example.com/cta">link</a></p></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td class="kg-product-card-container">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td class="kg-product-image" align="center">
                                            <img src="https://example.com/product.jpg" border="0"/>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td valign="top">
                                            <h4 class="kg-product-title">Product title</h4>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="kg-product-description-wrapper"><p>Product description</p></td>
                                    </tr>
                                    <tr>
                                        <td class="kg-product-button-wrapper">
                                            <table class="btn" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center"><a href="https://example.com/buy">Buy now</a></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert($('.kg-cta-card').attr('style').includes('border-bottom: 1px solid #e0e7eb'));
        assert(
          $('.kg-cta-sponsor-label').attr('style').includes('border-bottom: 1px solid #e0e7eb'),
        );
        assert(
          $('.kg-product-card')
            .attr('style')
            .includes('background-color: rgba(255, 255, 255, 0.25)'),
        );
        assert(
          $('.kg-product-button-wrapper table.btn').attr('style').includes('width: 100%'),
          'product button table should have width: 100%',
        );
      });

      it('does not inline margin 0 auto on button tables that would override alignment', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td class="kg-card-spacing">
                                    <table class="btn" border="0" cellspacing="0" cellpadding="0" align="left">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <a href="https://example.com">Left</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        const $button = $('table.btn');
        assert($button.length, 'should have a btn table');
        assert.equal($button.attr('align'), 'left');
        assert(
          !$button.attr('style')?.includes('margin: 0 auto'),
          'button should not have margin: 0 auto',
        );
      });

      it('uses <div>s with inline styles for image cards', async function () {
        lexicalRenderStub.resolves(`
                    <figure class="kg-card kg-image-card kg-card-hascaption">
                        <img src="https://example.com/photo.jpg" class="kg-image" alt="alt text" loading="lazy" width="600" height="400">
                        <figcaption>A caption</figcaption>
                    </figure>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);

        assert.equal($('figure').length, 0);
        assert.equal($('figcaption').length, 0);

        const $caption = $('.kg-image-card .kg-card-figcaption');
        assert.equal($caption.text(), 'A caption');
        assert($caption.attr('style').includes('text-align: center'), 'caption should be centered');
        assert($caption.attr('style').includes('font-size: 13px'), 'caption should have 13px font');
        assert(
          $caption.attr('style').includes('font-family: -apple-system'),
          'caption should keep caption font family',
        );
      });

      it('inlines figure margin and image max-width for image cards', async function () {
        lexicalRenderStub.resolves(`
                    <figure class="kg-card kg-image-card">
                        <img src="https://example.com/photo.jpg" class="kg-image" alt="alt text" loading="lazy" width="600" height="400">
                    </figure>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        const $figure = $('.kg-image-card');
        assert(
          $figure.attr('style').includes('margin: 0 0 1.5em'),
          'figure should have bottom margin',
        );
        assert(
          $figure.find('img').attr('style').includes('max-width: 100%'),
          'img should have max-width: 100%',
        );
      });

      it('inlines width 100% on button card outer table', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td class="kg-card-spacing">
                                    <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <a href="https://example.com">Click</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert(
          $('table.kg-card.kg-button-card').attr('style').includes('width: 100%'),
          'button card table should have width: 100%',
        );
      });

      it('preserves explicit right alignment values', async function () {
        lexicalRenderStub.resolves(`
                    <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td class="kg-card-spacing">
                                    <table class="btn" border="0" cellspacing="0" cellpadding="0" align="right">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <a href="https://example.com">Right</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                `);
        const renderer = createRenderer();

        const result = await renderFor(renderer, {
          lexical: '{}',
          subject: 'Welcome!',
          member: { name: 'John', email: 'john@example.com' },
          siteSettings: defaultSiteSettings,
        });

        const $ = cheerio.load(result.html);
        assert.equal($('table.btn').attr('align'), 'right');
      });
    });
  });
});
