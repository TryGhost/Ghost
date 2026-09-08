const assert = require('node:assert/strict');
const {
  AUTO_EXCERPT_LENGTH,
  computeAutoExcerpt,
  computeReadingTime,
} = require('../../../../core/server/lib/post-meta');

describe('post-meta helpers', function () {
  describe('computeAutoExcerpt', function () {
    it('returns null for empty plaintext', function () {
      assert.equal(computeAutoExcerpt(null), null);
      assert.equal(computeAutoExcerpt(undefined), null);
      assert.equal(computeAutoExcerpt(''), null);
    });

    it('returns plaintext unchanged when shorter than the limit', function () {
      assert.equal(computeAutoExcerpt('Short excerpt'), 'Short excerpt');
    });

    it('truncates plaintext to the automatic excerpt length', function () {
      const plaintext = 'a'.repeat(AUTO_EXCERPT_LENGTH + 50);
      const excerpt = computeAutoExcerpt(plaintext);
      assert.equal(excerpt.length, AUTO_EXCERPT_LENGTH);
      assert.equal(excerpt, 'a'.repeat(AUTO_EXCERPT_LENGTH));
    });
  });

  describe('computeReadingTime', function () {
    it('returns null when html is missing', function () {
      assert.equal(computeReadingTime(null, null), null);
      assert.equal(computeReadingTime('', 'https://example.com/image.jpg'), null);
    });

    it('returns a non-negative integer for html content', function () {
      const html = `<p>${'word '.repeat(300)}</p>`;
      const readingTime = computeReadingTime(html, null);
      assert.equal(typeof readingTime, 'number');
      assert.ok(readingTime >= 0);
    });

    it('increases when a feature image is present', function () {
      const html = `<p>${'word '.repeat(300)}</p>`;
      const withoutImage = computeReadingTime(html, null);
      const withImage = computeReadingTime(html, 'https://example.com/image.jpg');
      assert.ok(withImage >= withoutImage);
    });
  });
});
