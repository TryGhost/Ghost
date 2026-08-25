import assert from 'node:assert/strict';
import { postImportRowSchema } from '../../../../../../core/server/services/content-import/import/row';

// The schema is where the raw string cells the CSV reader emits become typed post
// fields. Coercion rules live here so the importer reads precise values without
// re-checking them.
describe('post import row schema', function () {
  it('trims the title, because the model skips its own trim when importing', function () {
    assert.equal(postImportRowSchema.parse({ title: '  Padded  ' }).title, 'Padded');
    assert.equal(postImportRowSchema.parse({ title: '   ' }).title, '');
  });

  it('defaults a missing title to the empty string rather than undefined', function () {
    assert.equal(postImportRowSchema.parse({}).title, '');
  });

  it('defaults a missing html cell to the empty string', function () {
    assert.equal(postImportRowSchema.parse({}).html, '');
    assert.equal(postImportRowSchema.parse({ html: '<p>Hi</p>' }).html, '<p>Hi</p>');
  });

  it('defaults a missing markdown cell to the empty string', function () {
    assert.equal(postImportRowSchema.parse({}).markdown, '');
    assert.equal(postImportRowSchema.parse({ markdown: '# Hi' }).markdown, '# Hi');
  });

  it('reads an empty (or literally "undefined") published_at cell as absent', function () {
    assert.equal(postImportRowSchema.parse({ published_at: '' }).published_at, undefined);
    assert.equal(postImportRowSchema.parse({ published_at: 'undefined' }).published_at, undefined);
    assert.equal(
      postImportRowSchema.parse({ published_at: '2025-01-01T00:00:00.000Z' }).published_at,
      '2025-01-01T00:00:00.000Z',
    );
  });

  it('reads empty optional editorial cells as absent', function () {
    const parsed = postImportRowSchema.parse({
      slug: '',
      feature_image: 'undefined',
      meta_title: '',
      frontmatter: '',
      comment_id: '',
    });

    assert.equal(parsed.slug, undefined);
    assert.equal(parsed.feature_image, undefined);
    assert.equal(parsed.meta_title, undefined);
    assert.equal(parsed.frontmatter, undefined);
    assert.equal(parsed.comment_id, undefined);
    assert.equal(postImportRowSchema.parse({ comment_id: 'undefined' }).comment_id, undefined);
  });

  it('passes unknown columns through for later milestones to consume', function () {
    const parsed = postImportRowSchema.parse({ title: 'T', custom_thing: 'kept' });
    assert.equal(parsed.custom_thing, 'kept');
  });
});
