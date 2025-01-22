import * as assert from 'assert/strict';
import {formatUrl} from '@/lib/utils';

describe('formatUrl', function () {
    it('displays empty string if the input is empty and nullable is true', function () {
        const formattedUrl = formatUrl('', undefined, true);
        assert.deepEqual(formattedUrl, {save: null, display: ''});
    });

    it('displays empty string value if the input has only whitespace', function () {
        const formattedUrl = formatUrl('');
        assert.deepEqual(formattedUrl, {save: '', display: ''});
    });

    it('displays base value if the input has only whitespace and base url is available', function () {
        const formattedUrl = formatUrl('', 'http://example.com');
        assert.deepEqual(formattedUrl, {save: '/', display: 'http://example.com'});
    });

    it('displays a mailto address for an email address', function () {
        const formattedUrl = formatUrl('test@example.com');
        assert.deepEqual(formattedUrl, {save: 'mailto:test@example.com', display: 'mailto:test@example.com'});
    });

    it('displays an anchor link without formatting', function () {
        const formattedUrl = formatUrl('#section');
        assert.deepEqual(formattedUrl, {save: '#section', display: '#section'});
    });

    it('displays a protocol-relative link without formatting', function () {
        const formattedUrl = formatUrl('//example.com');
        assert.deepEqual(formattedUrl, {save: '//example.com', display: '//example.com'});
    });

    it('adds https:// automatically', function () {
        const formattedUrl = formatUrl('example.com');
        assert.deepEqual(formattedUrl, {save: 'https://example.com/', display: 'https://example.com/'});
    });

    it('saves a relative URL if the input is a pathname', function () {
        const formattedUrl = formatUrl('/path', 'http://example.com');
        assert.deepEqual(formattedUrl, {save: '/path/', display: 'http://example.com/path/'});
    });

    it('saves a relative URL if the input is a pathname, even if the base url has an non-empty pathname', function () {
        const formattedUrl = formatUrl('/path', 'http://example.com/blog');
        assert.deepEqual(formattedUrl, {save: '/path/', display: 'http://example.com/blog/path/'});
    });

    it('saves a relative URL if the input includes the base url', function () {
        const formattedUrl = formatUrl('http://example.com/path', 'http://example.com');
        assert.deepEqual(formattedUrl, {save: '/path/', display: 'http://example.com/path/'});
    });

    it('saves a relative URL if the input includes the base url, even if the base url has an non-empty pathname', function () {
        const formattedUrl = formatUrl('http://example.com/blog/path', 'http://example.com/blog');
        assert.deepEqual(formattedUrl, {save: '/path/', display: 'http://example.com/blog/path/'});
    });

    it('saves an absolute URL if the input has a different pathname to the base url', function () {
        const formattedUrl = formatUrl('http://example.com/path', 'http://example.com/blog');
        assert.deepEqual(formattedUrl, {save: 'http://example.com/path', display: 'http://example.com/path'});
    });

    it('saves an absolte URL if the input has a different hostname to the base url', function () {
        const formattedUrl = formatUrl('http://another.com/path', 'http://example.com');
        assert.deepEqual(formattedUrl, {save: 'http://another.com/path', display: 'http://another.com/path'});
    });
});
