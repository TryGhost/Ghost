import assert from 'node:assert/strict';
import {cssUrl} from '../../src/utils/css-url.js';
import {createDocument} from '../test-utils/index.js';

describe('utils/css-url', function () {
    it('writes ordinary URLs unchanged, in a quoted url()', function () {
        const urls = [
            '/content/images/2022/11/image.jpg',
            '../image.jpg',
            '//cdn.example/image.jpg',
            'https://cdn.example/t.jpg?w=1#top',
            'https://cdn.example/café.jpg',
            'https://cdn.example/a%20b%27c.jpg',
            'https://cdn.example/a(b).png?sig=(x)',
            'https://cdn.example/a;b,c!d*e~f@g$h=i+j.jpg',
            'blob:https://example.org/5b0f3c1e-7d1a-4c53-9b1a-2f0d7c9e1a11',
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        ];

        for (const url of urls) {
            assert.equal(cssUrl(url), `url('${url}')`);
        }
    });

    it('percent-encodes quotes, backslashes and whitespace', function () {
        assert.equal(cssUrl('a\'b"c\\d e\u000cf'), 'url(\'a%27b%22c%5Cd%20e%0Cf\')');
        // Other whitespace too, encoded as a browser would
        assert.equal(cssUrl('https://cdn.example/t.jpg?key=x y z'), 'url(\'https://cdn.example/t.jpg?key=x%C2%A0y%E2%80%A8z\')');
    });

    it('percent-encodes control characters', function () {
        assert.equal(cssUrl('a\u0000b\u0001c\u001fd\u007fe'), 'url(\'a%00b%01c%1Fd%7Fe\')');
    });

    it('drops the whitespace a URL parser drops, rather than encoding it into the path', function () {
        assert.equal(cssUrl(' https://cdn.example/t.jpg\n'), 'url(\'https://cdn.example/t.jpg\')');
        assert.equal(cssUrl('\u0000https://cdn.example/t.jpg\u0000'), 'url(\'https://cdn.example/t.jpg\')');
        assert.equal(cssUrl('https://cdn.example/t\n.j\tp\rg'), 'url(\'https://cdn.example/t.jpg\')');
    });

    it('keeps a query string whose parameters look like legacy entities', function () {
        assert.equal(
            cssUrl('https://cdn.example/t.jpg?w=1&region=us&param=2'),
            'url(\'https://cdn.example/t.jpg?w=1&amp;region=us&amp;param=2\')'
        );
    });

    it('escapes characters that are special in an HTML attribute', function () {
        assert.equal(cssUrl('https://example.org/?a=1&b=<2>'), 'url(\'https://example.org/?a=1&amp;b=&lt;2&gt;\')');
    });

    it('decodes HTML entities once before encoding', function () {
        assert.equal(cssUrl('a&#39;b&#x27;c&apos;d&quot;e&amp;f'), 'url(\'a%27b%27c%27d%22e&amp;f\')');
        assert.equal(cssUrl('a&amp;#39;b'), 'url(\'a&amp;#39;b\')');
    });

    it('keeps an SVG data URL readable by the browser', function () {
        const svg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox=\'0 0 1 1\'><rect width="1" height="1"/></svg>';

        assert.equal(
            decodeURIComponent(readUrl(`<i style="background: ${cssUrl(svg)}"></i>`)),
            svg
        );
    });

    it('stays a single url() in the style attribute it is written into', function () {
        const urls = [
            'https://example.org/it\'s "a" (thumbnail)\\ 1.jpg',
            'https://example.org/a.jpg\'); color: red; x: url(\'b.jpg',
            'https://example.org/a.jpg" title="b',
            'https://example.org/a>b<c.jpg',
            'https://example.org/a.jpg\\',
            'https://example.org/a.jpg/* b */'
        ];

        for (const url of urls) {
            const document = createDocument(`<i style="background: ${cssUrl(url)}; color: blue"></i>`);
            const element = document.querySelector('i') as HTMLElement;

            assert.deepEqual(element.getAttributeNames(), ['style'], url);
            assert.equal(element.style.length > 0, true, url);
            assert.equal(element.style.color, 'blue', url);
            assert.match(element.style.backgroundImage, /^url\("[^"]*"\)$/, url);
            assert.equal(document.body.children.length, 1, url);
        }
    });

    it('returns an empty url() for missing values', function () {
        assert.equal(cssUrl(undefined), 'url(\'\')');
        assert.equal(cssUrl(null), 'url(\'\')');
    });

    function readUrl(markup: string) {
        const element = createDocument(markup).querySelector('i') as HTMLElement;
        const match = /^url\("(.*)"\)$/.exec(element.style.backgroundImage);

        assert.ok(match, element.getAttribute('style') ?? '');

        return match[1].replace(/\\(.)/g, '$1');
    }
});
