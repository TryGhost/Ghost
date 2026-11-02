import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import i18nLib from '@tryghost/i18n';
// @ts-expect-error This module lacks type definitions.
import CommentsServiceEmailRenderer from '../../../../../core/server/services/comments/comments-service-email-renderer';

const TEMPLATES_DIR = path.join(
  __dirname,
  '../../../../../core/server/services/comments/email-templates',
);

// The root restricts the reader to the service's own templates; the renderer
// only needs the source of the named template.
function readTemplate(name: string): Promise<string> {
  return readFile(path.join(TEMPLATES_DIR, `${name}.hbs`), 'utf8');
}

describe('Comments Service Email Renderer', function () {
  describe('renderEmail Template with different locales', function () {
    it('should render html and text templates with English locale', async function () {
      // arrange
      const i18n = i18nLib('en', 'ghost');
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t, readTemplate });

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
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t, readTemplate });

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
          'This message was sent from <a class="small" href="https://ghost.org" style="text-decoration: underline; color: #738A94; font-size: 11px;">Cathy\'s blog</a>',
        ),
      );
      assert(
        result.text.includes("Someone just replied to your comment on Test post's the best post."),
      );
    });

    it('should render html and text templates with German locale', async function () {
      // arrange
      const i18n = i18nLib('de', 'ghost');
      const renderer = new CommentsServiceEmailRenderer({ t: i18n.t, readTemplate });

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
});
