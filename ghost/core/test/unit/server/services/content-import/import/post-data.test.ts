import assert from 'node:assert/strict';
import { cleanHTML as officialCleanHTML } from '@tryghost/mg-clean-html';
import buildPostData, {
  RowSkipped,
} from '../../../../../../core/server/services/content-import/import/post-data';
import { postImportRowSchema } from '../../../../../../core/server/services/content-import/import/row';

// A stand-in converter that shows what it was given, so the test can assert both the
// wiring (called with the row's html) and the stringification.
const htmlToLexical = (html: string) => ({ converted: html });
const markdownToHtml = (markdown: string) => `<h1>${markdown.slice(2)}</h1>`;

const row = (cells: Record<string, string>) => postImportRowSchema.parse(cells);

const TAGS = ['#Import 2026-01-01 10:00', '#Import Run run_test'];

describe('buildPostData', function () {
  it('sets lexical from the html cell and never html itself', function () {
    const data = buildPostData(row({ title: 'T', html: '<p>Hello</p>' }), htmlToLexical, TAGS);

    assert.equal(data.lexical, JSON.stringify({ converted: '<p>Hello</p>' }));
    // the model strips client-supplied html when importing, so passing it would be a no-op
    assert.equal('html' in data, false);
  });

  it('runs opinionated HTML cleanup before lexical conversion', function () {
    const source =
      '<p style="text-align: center; color: red; background: blue"><span style="font-weight: bold">Hello</span></p><p><br></p><h2><strong>Header</strong></h2>';
    const data = buildPostData(
      row({ title: 'T', html: source }),
      htmlToLexical,
      TAGS,
      markdownToHtml,
      officialCleanHTML,
    );

    assert.equal(data.lexical, JSON.stringify({ converted: '<p><b>Hello</b></p><h2>Header</h2>' }));
  });

  it('preserves protected Instagram embed markup during cleanup', function () {
    const source =
      '<blockquote class="instagram-media"><p style="text-align: center; color: red">Protected</p></blockquote>';
    const data = buildPostData(
      row({ title: 'T', html: source }),
      htmlToLexical,
      TAGS,
      markdownToHtml,
      officialCleanHTML,
    );

    assert.equal(data.lexical, JSON.stringify({ converted: source }));
  });

  it('slugs the title with the standard rules, not the importing-mode pass', function () {
    const data = buildPostData(
      row({ title: 'A post with a comma, in its title' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.slug, 'a-post-with-a-comma-in-its-title');
  });

  it('sanitizes an explicit slug instead of deriving it from the title', function () {
    const data = buildPostData(
      row({ title: 'Different title', slug: ' Custom Slug, Here ' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.slug, 'custom-slug-here');
  });

  it('omits lexical for an empty html cell, leaving the model its blank document', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal('lexical' in data, false);
  });

  it('renders markdown to html before converting it to lexical', function () {
    const data = buildPostData(
      row({ title: 'T', markdown: '# Hello' }),
      htmlToLexical,
      TAGS,
      markdownToHtml,
    );

    assert.equal(data.lexical, JSON.stringify({ converted: '<h1>Hello</h1>' }));
  });

  it('skips markdown when no renderer is available', function () {
    assert.throws(
      () => buildPostData(row({ title: 'T', markdown: '# Hello' }), htmlToLexical, TAGS),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'markdown could not be converted');
        return true;
      },
    );
  });

  it('cleans markdown-rendered HTML before converting it to lexical', function () {
    const styledMarkdownRenderer = () => '<p style="text-align: right; color: red">Hello</p>';
    const data = buildPostData(
      row({ title: 'T', markdown: 'Hello' }),
      htmlToLexical,
      TAGS,
      styledMarkdownRenderer,
      officialCleanHTML,
    );

    assert.equal(data.lexical, JSON.stringify({ converted: '<p>Hello</p>' }));
  });

  it('skips a row that supplies both html and markdown', function () {
    assert.throws(
      () =>
        buildPostData(
          row({ title: 'T', html: '<p>HTML</p>', markdown: 'Markdown' }),
          htmlToLexical,
          TAGS,
          markdownToHtml,
        ),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'html and markdown cannot both be provided');
        return true;
      },
    );
  });

  it('skips a row when markdown rendering fails', function () {
    const throwingRenderer = () => {
      throw new Error('renderer exploded');
    };

    assert.throws(
      () =>
        buildPostData(row({ title: 'T', markdown: 'bad' }), htmlToLexical, TAGS, throwingRenderer),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'markdown could not be converted');
        return true;
      },
    );
  });

  it('dates the whole post from the CSV date: published_at, created_at and updated_at', function () {
    const data = buildPostData(
      row({ title: 'T', published_at: '2025-01-01T00:00:00.000Z' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.published_at, '2025-01-01T00:00:00.000Z');
    assert.equal(data.created_at, '2025-01-01T00:00:00.000Z');
    assert.equal(data.updated_at, '2025-01-01T00:00:00.000Z');
  });

  it('fills every unspecified field with the import defaults', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal(data.status, 'published');
    assert.equal(data.type, 'post');
    assert.equal(
      data.visibility,
      'public',
      'explicit: the model would read the default_content_visibility setting',
    );
    assert.deepEqual(
      data.tags,
      TAGS.map((name) => ({ name })),
    );
    assert.equal('comment_id' in data, false);
    assert.equal('authors' in data, false);
  });

  it('imports publishing, image, and advanced post fields', function () {
    const data = buildPostData(
      row({
        title: 'Full post',
        type: 'page',
        status: 'draft',
        visibility: 'members',
        featured: '1',
        show_title_and_feature_image: 'false',
        custom_excerpt: 'Summary',
        feature_image: 'https://example.com/image.jpg',
        canonical_url: 'https://example.com/original',
        custom_template: 'wide',
        codeinjection_head: '<style>body{color:red}</style>',
        codeinjection_foot: '<script>window.test=true</script>',
        comment_id: 'legacy-source-123',
      }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.type, 'page');
    assert.equal(data.status, 'draft');
    assert.equal(data.visibility, 'members');
    assert.equal(data.featured, true);
    assert.equal(data.show_title_and_feature_image, false);
    assert.equal(data.custom_excerpt, 'Summary');
    assert.equal(data.feature_image, 'https://example.com/image.jpg');
    assert.equal(data.canonical_url, 'https://example.com/original');
    assert.equal(data.custom_template, 'wide');
    assert.equal(data.codeinjection_head, '<style>body{color:red}</style>');
    assert.equal(data.codeinjection_foot, '<script>window.test=true</script>');
    assert.equal(data.comment_id, 'legacy-source-123');
  });

  it('puts feature metadata, SEO, social fields, and frontmatter in posts_meta', function () {
    const data = buildPostData(
      row({
        title: 'Metadata post',
        feature_image_alt: 'Alt text',
        feature_image_caption: 'Caption',
        meta_title: 'Meta title',
        meta_description: 'Meta description',
        og_image: 'https://example.com/og.jpg',
        og_title: 'OG title',
        og_description: 'OG description',
        twitter_image: 'https://example.com/twitter.jpg',
        twitter_title: 'Twitter title',
        twitter_description: 'Twitter description',
        frontmatter: 'key: value',
      }),
      htmlToLexical,
      TAGS,
    );

    assert.deepEqual(data.posts_meta, {
      feature_image_alt: 'Alt text',
      feature_image_caption: 'Caption',
      meta_title: 'Meta title',
      meta_description: 'Meta description',
      og_image: 'https://example.com/og.jpg',
      og_title: 'OG title',
      og_description: 'OG description',
      twitter_image: 'https://example.com/twitter.jpg',
      twitter_title: 'Twitter title',
      twitter_description: 'Twitter description',
      frontmatter: 'key: value',
    });
  });

  it('omits every date when the cell is absent, leaving the model to stamp now', function () {
    const data = buildPostData(row({ title: 'T' }), htmlToLexical, TAGS);

    assert.equal('published_at' in data, false);
    assert.equal('created_at' in data, false);
    assert.equal('updated_at' in data, false);
  });

  it('lets explicit created and updated dates override the published date fallback', function () {
    const data = buildPostData(
      row({
        title: 'T',
        published_at: '2025-01-01',
        created_at: '2024-01-01',
        updated_at: '2025-02-01',
      }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.published_at, '2025-01-01');
    assert.equal(data.created_at, '2024-01-01');
    assert.equal(data.updated_at, '2025-02-01');
  });

  const skipsWith = (cells: Record<string, string>, reason: string | RegExp) => {
    assert.throws(
      () => buildPostData(row(cells), htmlToLexical, TAGS),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped, 'skipped, not a hard failure');
        if (reason instanceof RegExp) {
          assert.match(error.message, reason);
        } else {
          assert.equal(error.message, reason);
        }
        return true;
      },
    );
  };

  it('skips a row without a title', function () {
    skipsWith({ html: '<p>No title</p>' }, 'title is required');
  });

  it('skips a row whose title is only whitespace', function () {
    skipsWith({ title: '   ' }, 'title is required');
  });

  it('skips a row whose title is longer than 255 characters', function () {
    skipsWith({ title: 'x'.repeat(256) }, 'title must be 255 characters or fewer');
  });

  it('accepts a title of exactly 255 characters', function () {
    const data = buildPostData(row({ title: 'x'.repeat(255) }), htmlToLexical, TAGS);

    assert.equal(data.title.length, 255);
  });

  it('accepts a source ID of exactly 50 characters', function () {
    const data = buildPostData(
      row({ title: 'T', comment_id: 'x'.repeat(50) }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.comment_id, 'x'.repeat(50));
  });

  it('skips a row whose source ID is longer than 50 characters', function () {
    skipsWith(
      { title: 'T', comment_id: 'x'.repeat(51) },
      'comment_id must be 50 characters or fewer',
    );
  });

  it('skips a row whose published_at is not a date, quoting the cell', function () {
    skipsWith(
      { title: 'T', published_at: 'not-a-date' },
      'published_at is not a valid date: "not-a-date"',
    );
  });

  it('skips a row whose published_at is a rolled-over calendar date', function () {
    // new Date() would normalize this to March 2 and quietly mis-date the post
    skipsWith(
      { title: 'T', published_at: '2025-02-30T00:00:00.000Z' },
      'published_at is not a valid date: "2025-02-30T00:00:00.000Z"',
    );
  });

  it('accepts a non-ISO date format that new Date can parse', function () {
    const data = buildPostData(
      row({ title: 'T', published_at: 'May 1, 2024' }),
      htmlToLexical,
      TAGS,
    );

    assert.equal(data.published_at, 'May 1, 2024');
  });

  for (const [field, value, reason] of [
    ['type', 'article', 'type must be one of: post, page'],
    ['status', 'scheduled', 'status must be one of: draft, published'],
    ['visibility', 'private', 'visibility must be one of: public, members, paid'],
    ['featured', 'yes', 'featured must be true, false, 1, or 0'],
    [
      'show_title_and_feature_image',
      'sometimes',
      'show_title_and_feature_image must be true, false, 1, or 0',
    ],
  ] as const) {
    it(`skips a row with an invalid ${field}`, function () {
      skipsWith({ title: 'T', [field]: value }, reason);
    });
  }

  it('skips a row whose html cannot be converted', function () {
    const throwingConverter = () => {
      throw new Error('parser exploded');
    };

    assert.throws(
      () => buildPostData(row({ title: 'T', html: '<p>bad</p>' }), throwingConverter, TAGS),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'html could not be converted');
        return true;
      },
    );
  });

  it('skips a row whose html cannot be cleaned', function () {
    const throwingCleaner = () => {
      throw new Error('cleaner exploded');
    };

    assert.throws(
      () =>
        buildPostData(
          row({ title: 'T', html: '<p>bad</p>' }),
          htmlToLexical,
          TAGS,
          markdownToHtml,
          throwingCleaner,
        ),
      (error: unknown) => {
        assert.ok(error instanceof RowSkipped);
        assert.equal(error.message, 'html could not be cleaned');
        return true;
      },
    );
  });
});
