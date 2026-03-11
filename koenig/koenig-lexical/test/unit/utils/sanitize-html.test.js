import {describe, expect, test} from 'vitest';
import {sanitizeHtml} from '../../../src/utils/sanitize-html';

describe('Utils: sanitize-html', () => {
    test('can replace scripts', function () {
        const sanitizedHtml = sanitizeHtml('<span>Hey</span><script>alert("hello");</script>');
        expect(sanitizedHtml).toEqual('<span>Hey</span><pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });

    it('can render html', function () {
        const sanitizedHtml = sanitizeHtml('<strong>bold</strong>');
        expect(sanitizedHtml).toEqual('<strong>bold</strong>');
    });

    it('strips style elements but keeps style attributes', function () {
        const sanitizedHtml = sanitizeHtml('<span style="color: red;">Hey</span><style>span {color: blue;}</style>');
        expect(sanitizedHtml).toEqual('<span style="color: red;">Hey</span>');
    });

    it('allows https URLs', function () {
        const sanitizedHtml = sanitizeHtml('<a href="https://example.com">link</a>');
        expect(sanitizedHtml).toEqual('<a href="https://example.com">link</a>');
    });

    it('allows root URLs', function () {
        const sanitizedHtml = sanitizeHtml('<a href="/foo">link</a>');
        expect(sanitizedHtml).toEqual('<a href="/foo">link</a>');
    });

    it('allows blob URLs', function () {
        const sanitizedHtml = sanitizeHtml('<a href="blob:https://example.com/123">link</a>');
        expect(sanitizedHtml).toEqual('<a href="blob:https://example.com/123">link</a>');
    });

    it.each([
        'ftp://example.com',
        'javascript:alert(1)',
        'mailto:hello@example.com',
        'data:text/plain,hello'
    ])('disallows non-http protocols: %s', (href) => {
        const sanitizedHtml = sanitizeHtml(`<a href="${href}">link</a>`);
        expect(sanitizedHtml).toEqual('<a>link</a>');
    });

    it('disallows javascript URLs that contain blob text', function () {
        const sanitizedHtml = sanitizeHtml('<a href=\'javascript:alert("blob:")\'>link</a>');
        expect(sanitizedHtml).toEqual('<a>link</a>');
    });

    it.each([
        'foo/bar',
        './foo',
        '../foo'
    ])('disallows relative links: %s', (href) => {
        const sanitizedHtml = sanitizeHtml(`<a href="${href}">link</a>`);
        expect(sanitizedHtml).toEqual('<a>link</a>');
    });
});
