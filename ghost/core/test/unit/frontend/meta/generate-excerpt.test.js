const assert = require('assert');
const generateExcerpt = require('../../../../core/frontend/meta/generate-excerpt');

describe('generateExcerpt', function () {
    it('should fallback to 50 words if not specified', function () {
        const html = 'This is an auto-generated excerpt. It contains a plaintext version of the first part of your content. Images, footnotes and links are all stripped out as the excerpt is not HTML, but plaintext as I already mentioned. This excerpt will be stripped down to 50 words if it is longer and no options are provided to tell us to do otherwise.';

        const expected = 'This is an auto-generated excerpt. It contains a plaintext version of the first part of your content. Images, footnotes and links are all stripped out as the excerpt is not HTML, but plaintext as I already mentioned. This excerpt will be stripped down to 50 words if it is longer';

        assert.equal(generateExcerpt(html), expected);
    });

    it('should truncate by words if specified', function () {
        const html = 'This is an auto-generated excerpt. It contains a plaintext version of the first part of your content. Images, footnotes and links are all stripped out as the excerpt is not HTML, but plaintext as I already mentioned. This excerpt will be stripped down to 50 words if it is longer and no options are provided to tell us to do otherwise.';

        const expected = 'This is an auto-generated excerpt.';

        assert.equal(generateExcerpt(html, {words: 5}), expected);
    });

    it('should truncate by characters if specified', function () {
        const html = 'This is an auto-generated excerpt. It contains a plaintext version of the first part of your content. Images, footnotes and links are all stripped out as the excerpt is not HTML, but plaintext as I already mentioned. This excerpt will be stripped down to 50 words if it is longer and no options are provided to tell us to do otherwise.';

        const expected = 'This is an auto-generated excerpt. It contains a plaintext version of the first part of your content';

        assert.equal(generateExcerpt(html, {characters: 100}), expected);
    });
});
