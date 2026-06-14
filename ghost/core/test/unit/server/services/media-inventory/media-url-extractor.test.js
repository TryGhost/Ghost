const assert = require('node:assert/strict');
const {extractMediaUrls} = require('../../../../../core/server/services/media-inventory/media-url-extractor');

const M = '__GHOST_URL__';

// These cover the pure-logic edges that are easy to silently break and that the
// service-level tests cannot reach cleanly. Each fires on a distinct failure.
describe('media-url-extractor', function () {
    it('returns [] for null/empty/non-string content (columns are frequently null)', function () {
        assert.deepEqual(extractMediaUrls(null), []);
        assert.deepEqual(extractMediaUrls(''), []);
        assert.deepEqual(extractMediaUrls({}), []);
    });

    it('finds site media and ignores external URLs (no transform-ready marker)', function () {
        const blob = `{"a":"https://images.unsplash.com/x.jpg","b":"${M}/content/images/2024/06/keep.jpg"}`;
        assert.deepEqual(extractMediaUrls(blob), [{
            url: `${M}/content/images/2024/06/keep.jpg`,
            type: 'image',
            filename: 'keep.jpg'
        }]);
    });

    it('collapses size variants and the _o original to one canonical URL', function () {
        const blob = [
            `"${M}/content/images/size/w600/2024/06/photo.jpg"`,
            `"${M}/content/images/2024/06/photo_o.jpg"`,
            `"${M}/content/images/2024/06/photo.jpg"`
        ].join(' ');
        const result = extractMediaUrls(blob);
        assert.equal(result.length, 1);
        assert.equal(result[0].url, `${M}/content/images/2024/06/photo.jpg`);
    });

    it('stops at JSON-escaped quotes so the URL has no trailing garbage', function () {
        const lexical = `{"caption":"<img src=\\"${M}/content/images/2024/06/inline.jpg\\">"}`;
        assert.deepEqual(extractMediaUrls(lexical), [{
            url: `${M}/content/images/2024/06/inline.jpg`,
            type: 'image',
            filename: 'inline.jpg'
        }]);
    });

    it('skips video/audio poster thumbnails (image files under the media prefix)', function () {
        const blob = `"${M}/content/media/2024/06/clip.mp4" "${M}/content/media/2024/06/clip_thumb.jpg"`;
        assert.deepEqual(extractMediaUrls(blob), [{
            url: `${M}/content/media/2024/06/clip.mp4`,
            type: 'media',
            filename: 'clip.mp4'
        }]);
    });

    it('classifies image, media and file types', function () {
        const blob = `"${M}/content/images/a.jpg" "${M}/content/media/b.mp4" "${M}/content/files/c.pdf"`;
        const byType = Object.fromEntries(extractMediaUrls(blob).map(m => [m.type, m.filename]));
        assert.deepEqual(byType, {image: 'a.jpg', media: 'b.mp4', file: 'c.pdf'});
    });
});
