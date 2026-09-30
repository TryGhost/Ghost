const assert = require('node:assert/strict');
const i18nLib = require('@tryghost/i18n').default;
const CommentsServiceEmailRenderer = require('../../../../../core/server/services/comments/comments-service-email-renderer');

describe('Comments Service Email Renderer', function () {
  describe('renderEmail Template with different locales', function () {
    it('should render html and text templates with English locale', async function () {
      // arrange
      const i18n = i18nLib('en', 'ghost');
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t });

      const templateData = {
        postTitle: 'Test Post',
        postUrl: 'https://ghost.org/post',
        siteUrl: 'https://ghost.org',
      };

      // act
      const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

      // assert
      assert(result.html.includes('Hey there,</p>'));
      assert(
        result.html.includes(
          'This message was sent from <a class="small" href="https://ghost.org"',
        ),
      );
      assert(
        result.html.includes(
          'Someone just replied to your comment on <a href="https://ghost.org/post"',
        ),
      );
      assert(result.text.includes('Hey there,'));
      assert(result.text.includes('Someone just replied to your comment on Test Post.'));
    });

    it('should correctly handle apostrophes in post titles and site names', async function () {
      // arrange
      const i18n = i18nLib('en', 'ghost');
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t });

      const templateData = {
        postTitle: "Test post's the best post",
        siteUrl: 'https://ghost.org',
        siteDomain: "Cathy's blog",
      };

      // act
      const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

      // assert
      assert(result.html.includes('Hey there,</p>'));
      assert(
        result.html.includes(
          'This message was sent from <a class="small" href="https://ghost.org" style="text-decoration: underline; color: #738A94; font-size: 11px;">Cathy&#x27;s blog</a>',
        ),
      );
      assert(
        result.text.includes("Someone just replied to your comment on Test post's the best post."),
      );
    });

    it('should render html and text templates with German locale', async function () {
      // arrange
      const i18n = i18nLib('de', 'ghost');
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t });

      const templateData = {
        postTitle: 'Testbeitrag',
        postUrl: 'https://ghost.de/post',
        siteUrl: 'https://ghost.de',
      };

      // act
      const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

      // assert
      assert(result.html.includes('Hallo,</p>'));
      assert(
        result.html.includes('Diese Nachricht wurde von <a class="small" href="https://ghost.de"'),
      );
      assert(
        result.html.includes('Jemand hat auf deinen Kommentar zu <a href="https://ghost.de/post"'),
      );
      assert(result.text.includes('Hallo,'));
      assert(result.text.includes('Jemand hat auf deinen Kommentar zu Testbeitrag geantwortet.'));
    });
  });

  describe('link helper', function () {
    let renderLink;

    beforeEach(function () {
      const renderer = new CommentsServiceEmailRenderer({ t: (key) => key });
      renderLink = (template, data) => renderer.Handlebars.compile(template)(data);
    });

    it('renders plain values unchanged', function () {
      const html = renderLink(
        '{{link href text target="_blank" class="small" style="color: red;"}}',
        {
          href: 'https://ghost.org/post/',
          text: 'Test Post',
        },
      );

      assert.equal(
        html,
        '<a class="small" href="https://ghost.org/post/" target="_blank" style="color: red;">Test Post</a>',
      );
    });

    it('escapes href, text and attribute values', function () {
      const html = renderLink('{{link href text class=cls style=style}}', {
        href: '"><script>alert(1)</script>',
        text: '<img src=x onerror=alert(1)>',
        cls: '"onmouseover="x',
        style: '"><b>',
      });

      assert.equal(
        html,
        '<a class="&quot;onmouseover&#x3D;&quot;x" href="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" style="&quot;&gt;&lt;b&gt;">&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;</a>',
      );
    });

    it('omits attributes that were not passed', function () {
      const html = renderLink('{{link href text}}', { href: 'https://ghost.org', text: 'Ghost' });

      assert.equal(html, '<a href="https://ghost.org">Ghost</a>');
    });

    it('escapes ampersands exactly once', function () {
      const html = renderLink('{{link href text}}', {
        href: 'https://ghost.org/?a&b',
        text: 'Tom & Jerry',
      });

      assert.equal(html, '<a href="https://ghost.org/?a&amp;b">Tom &amp; Jerry</a>');
    });

    it('escapes the prefixed href', function () {
      const html = renderLink('{{link email email prefix="mailto:"}}', {
        email: 'jo@example.com"><b>',
      });

      assert.equal(
        html,
        '<a href="mailto:jo@example.com&quot;&gt;&lt;b&gt;">jo@example.com&quot;&gt;&lt;b&gt;</a>',
      );
    });
  });

  describe('new-comment-reply links', function () {
    const i18n = i18nLib('en', 'ghost');

    it('renders the current markup for normal values', async function () {
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t });

      const { html } = await renderer.renderEmailTemplate('new-comment-reply', {
        postTitle: 'Test Post',
        postUrl: 'https://ghost.org/post/',
        siteUrl: 'https://ghost.org',
        siteDomain: 'ghost.org',
        toEmail: 'jo@example.com',
      });

      assert(
        html.includes(
          'Someone just replied to your comment on <a href="https://ghost.org/post/" target="_blank" style="font-weight: bold; text-decoration: underline; color: #15212A;">Test Post</a>.</p>',
        ),
      );
      assert(
        html.includes(
          'This message was sent from <a class="small" href="https://ghost.org" style="text-decoration: underline; color: #738A94; font-size: 11px;">ghost.org</a> to <a class="small" href="mailto:jo@example.com" style="text-decoration: underline; color: #738A94; font-size: 11px;">jo@example.com</a>.</p>',
        ),
      );
    });

    it('escapes HTML in the post title and url', async function () {
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t });

      const { html } = await renderer.renderEmailTemplate('new-comment-reply', {
        postTitle: '<img src=x onerror=alert(1)>',
        postUrl: '"><script>alert(1)</script>',
        siteUrl: 'https://ghost.org',
        siteDomain: 'ghost.org',
        toEmail: 'jo@example.com',
      });

      assert(!html.includes('<img src=x'));
      assert(!html.includes('<script>'));
      assert(
        html.includes(
          'Someone just replied to your comment on <a href="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" target="_blank" style="font-weight: bold; text-decoration: underline; color: #15212A;">&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;</a>.</p>',
        ),
      );
    });
  });
});
