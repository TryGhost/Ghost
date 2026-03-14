const assert = require('node:assert/strict');
const {load, select} = require('../../../../core/server/lib/html-utils');

describe('html-utils', function () {
    describe('load', function () {
        it('$ queries elements by CSS selector', function () {
            const $ = load('<html><body><a href="http://a.com">1</a><a href="http://b.com">2</a></body></html>');
            const links = $('a');
            assert.equal(links.length, 2);
            assert.equal(links[0].attribs.href, 'http://a.com');
            assert.equal(links[1].attribs.href, 'http://b.com');
        });

        it('$ returns empty set for null/undefined', function () {
            const $ = load('<p>test</p>');
            assert.equal($(null).length, 0);
            assert.equal($(undefined).length, 0);
        });

        it('$ wraps an array of elements', function () {
            const $ = load('<p>A</p><p>B</p>');
            const elements = $('p').get();
            const wrapped = $(elements);
            assert.equal(wrapped.length, 2);
            assert.equal(wrapped.attr('href'), undefined);
        });

        it('$ wraps a raw element for further manipulation', function () {
            const $ = load('<div><p id="target">Hello</p></div>');
            const el = $('p').get(0);
            const wrapped = $(el);
            assert.equal(wrapped.html(), 'Hello');
            assert.equal(wrapped.attr('id'), 'target');
        });

        it('$.html() serializes a complex document preserving structure', function () {
            const $ = load('<html><head><title>Test</title></head><body><p>Hello</p></body></html>');
            const html = $.html();
            assert.equal(html, '<html><head><title>Test</title></head><body><p>Hello</p></body></html>');
        });

        it('$.text() returns only text content without HTML tags', function () {
            const $ = load('<div><p>Hello</p> <p><strong>World</strong></p></div>');
            const text = $.text();
            assert.equal(text, 'Hello World');
        });

        it('preserves HTML entities as-is through parse and serialize', function () {
            const $ = load('<div>&#x2007;&#xA0;&shy;&nbsp;</div>');
            assert.equal($.html(), '<div>&#x2007;&#xA0;&shy;&nbsp;</div>');
        });

        it('without decodeEntities: false, entities are decoded during parsing and re-encoded differently', function () {
            // Our load() uses decodeEntities: false to preserve entities as-is.
            // Without that option, htmlparser2 decodes them during parsing and
            // dom-serializer may re-encode them in a different format.
            const {parseDocument} = require('htmlparser2');
            const render = require('dom-serializer').default;
            const doc = parseDocument('&#x2007;&#xA0;');
            const output = render(doc, {decodeEntities: false});
            // Without decodeEntities: false on parse, the entities get decoded
            // to raw unicode and then render as raw characters, not as entities
            assert.ok(!output.includes('&#x2007;'));
        });
    });

    describe('select', function () {
        it('queries HTML without loading', function () {
            const result = select('link[type="application/json+oembed"]', '<link type="application/json+oembed" href="http://oembed.com/data">');
            assert.equal(result.attr('href'), 'http://oembed.com/data');
        });

        it('returns empty set when no matches', function () {
            const result = select('div', '<p>No divs here</p>');
            assert.equal(result.length, 0);
        });
    });

    describe('WrappedSet', function () {
        describe('get', function () {
            it('returns all elements when called without index', function () {
                const $ = load('<p>1</p><p>2</p>');
                const elements = $('p').get();
                assert.equal(elements.length, 2);
            });

            it('returns element at index', function () {
                const $ = load('<p>First</p><p>Second</p>');
                const el = $('p').get(1);
                assert.ok(el);
                assert.equal(el.tagName, 'p');
            });

            it('returns undefined for out of bounds index', function () {
                const $ = load('<p>1</p>');
                assert.equal($('p').get(5), undefined);
            });
        });

        describe('numeric indexing', function () {
            it('supports bracket access for direct element access', function () {
                const $ = load('<a href="a">1</a><a href="b">2</a>');
                const links = $('a');
                assert.equal(links[0].attribs.href, 'a');
                assert.equal(links[1].attribs.href, 'b');
            });
        });

        describe('toArray', function () {
            it('returns a copy of the elements array', function () {
                const $ = load('<p>1</p><p>2</p>');
                const arr = $('p').toArray();
                assert.equal(arr.length, 2);
                assert.notEqual(arr, $('p').get());
            });
        });

        describe('first', function () {
            it('returns wrapped set of first element', function () {
                const $ = load('<p>First</p><p>Second</p>');
                const first = $('p').first();
                assert.equal(first.length, 1);
                assert.equal(first.text(), 'First');
            });

            it('returns empty set when no elements', function () {
                const $ = load('<p>Hello</p>');
                const empty = $('div').first();
                assert.equal(empty.length, 0);
            });
        });

        describe('each', function () {
            it('iterates over elements with (index, element) args', function () {
                const $ = load('<p>A</p><p>B</p>');
                const results = [];
                $('p').each((i, el) => {
                    results.push({i, tag: el.tagName});
                });
                assert.deepEqual(results, [{i: 0, tag: 'p'}, {i: 1, tag: 'p'}]);
            });

            it('returns the wrapped set for chaining', function () {
                const $ = load('<p>A</p>');
                const set = $('p');
                assert.equal(set.each(() => {}), set);
            });
        });

        describe('map', function () {
            it('maps over elements', function () {
                const $ = load('<a href="a">1</a><a href="b">2</a>');
                const hrefs = $('a').map((i, el) => el.attribs.href);
                assert.deepEqual(hrefs, ['a', 'b']);
            });
        });

        describe('attr', function () {
            it('gets attribute value', function () {
                const $ = load('<a href="http://example.com">link</a>');
                assert.equal($('a').attr('href'), 'http://example.com');
            });

            it('returns undefined for missing attribute', function () {
                const $ = load('<a>link</a>');
                assert.equal($('a').attr('href'), undefined);
            });

            it('returns undefined for empty set', function () {
                const $ = load('<p>test</p>');
                assert.equal($('div').attr('href'), undefined);
            });

            it('sets attribute on all elements', function () {
                const $ = load('<a>1</a><a>2</a>');
                $('a').attr('target', '_blank');
                assert.equal($.html(), '<a target="_blank">1</a><a target="_blank">2</a>');
            });
        });

        describe('removeAttr', function () {
            it('removes attribute from elements', function () {
                const $ = load('<div data-gh-segment="free">content</div>');
                $('[data-gh-segment]').removeAttr('data-gh-segment');
                assert.equal($.html(), '<div>content</div>');
            });
        });

        describe('remove', function () {
            it('removes elements from DOM', function () {
                const $ = load('<div><p class="keep">keep</p><p class="remove">remove</p></div>');
                $('p.remove').remove();
                assert.equal($.html(), '<div><p class="keep">keep</p></div>');
            });
        });

        describe('addClass', function () {
            it('adds class to elements', function () {
                const $ = load('<figcaption>caption</figcaption>');
                $('figcaption').addClass('kg-card-figcaption');
                assert.equal($.html(), '<figcaption class="kg-card-figcaption">caption</figcaption>');
            });

            it('does not duplicate existing class', function () {
                const $ = load('<p class="existing">text</p>');
                $('p').addClass('existing');
                assert.equal($.html(), '<p class="existing">text</p>');
            });

            it('appends to existing classes', function () {
                const $ = load('<p class="a">text</p>');
                $('p').addClass('b');
                assert.equal($.html(), '<p class="a b">text</p>');
            });
        });

        describe('text', function () {
            it('returns text content stripping tags', function () {
                const $ = load('<p>Hello <strong>world</strong></p>');
                assert.equal($('p').text(), 'Hello world');
            });

            it('aggregates text from multiple matched elements', function () {
                const $ = load('<p>Hello</p><p>World</p>');
                assert.equal($('p').text(), 'HelloWorld');
            });

            it('returns empty string for empty set', function () {
                const $ = load('<p>Hello</p>');
                assert.equal($('div').text(), '');
            });
        });

        describe('html', function () {
            it('gets inner HTML of element', function () {
                const $ = load('<div><p>inner</p></div>');
                assert.equal($('div').html(), '<p>inner</p>');
            });

            it('returns empty string for empty set', function () {
                const $ = load('<p>Hello</p>');
                assert.equal($('div').html(), '');
            });

            it('sets inner HTML replacing existing content', function () {
                const $ = load('<div>old content</div>');
                $('div').html('<p>new</p>');
                assert.equal($.html(), '<div><p>new</p></div>');
            });
        });

        describe('find', function () {
            it('finds children matching selector', function () {
                const $ = load('<div><p>A</p><p>B</p></div><p>C</p>');
                const ps = $('div').find('p');
                assert.equal(ps.length, 2);
            });
        });

        describe('before', function () {
            it('inserts content before element', function () {
                const $ = load('<p>first</p><p>second</p>');
                $('p').first().before('<img src="test.jpg">');
                assert.equal($.html(), '<img src="test.jpg"><p>first</p><p>second</p>');
            });

            it('handles multi-node inserts with correct sibling links', function () {
                const $ = load('<p>target</p>');
                $('p').before('<span>A</span><span>B</span>');
                assert.equal($.html(), '<span>A</span><span>B</span><p>target</p>');
            });

            it('does nothing when element has no parent', function () {
                const $ = load('<p>test</p>');
                const root = $.root;
                const set = $(root);
                set.before('<div>nope</div>');
                // Root unchanged
                assert.ok($.html().includes('<p>test</p>'));
            });
        });

        describe('element mutation', function () {
            it('supports direct tagName mutation', function () {
                const $ = load('<figure><figcaption>test</figcaption></figure>');
                $('figure, figcaption').each((i, elem) => {
                    elem.tagName = 'div';
                });
                assert.equal($.html(), '<div><div>test</div></div>');
            });

            it('supports direct attribs mutation', function () {
                const $ = load('<img src="test.jpg" width="100" height="200">');
                const img = $('img').get(0);
                img.attribs.width = '50';
                assert.equal($.html(), '<img src="test.jpg" width="50" height="200">');
            });
        });

        describe('complex selectors', function () {
            it('handles attribute contains selector', function () {
                const $ = load('<a href="http://target.com/post">link</a><a href="http://other.com">other</a>');
                const matches = $('a[href*="target.com"]');
                assert.equal(matches.length, 1);
            });

            it('handles data attribute selector', function () {
                const $ = load('<div data-gh-segment="status:free">free</div><div data-gh-segment="status:-free">paid</div>');
                const segments = $('[data-gh-segment]');
                assert.equal(segments.length, 2);
            });

            it('handles multi-selector (comma separated)', function () {
                const $ = load('<a href="#">link</a><img src="img.jpg"><video src="vid.mp4"></video>');
                const matches = $('a, img, video');
                assert.equal(matches.length, 3);
            });

            it('handles class selector', function () {
                const $ = load('<img class="is-light-background" src="light.jpg"><img class="is-dark-background" src="dark.jpg">');
                assert.equal($('img.is-light-background').length, 1);
                assert.equal($('img.is-dark-background').length, 1);
            });
        });

        describe('email-renderer patterns', function () {
            it('segment extraction and removal', function () {
                const html = '<div data-gh-segment="status:free">free</div><div data-gh-segment="status:-free">paid</div><p>shared</p>';
                const $ = load(html);
                $('[data-gh-segment]').get().forEach((node) => {
                    if (node.attribs['data-gh-segment'] !== 'status:free') {
                        $(node).remove();
                    } else {
                        $(node).removeAttr('data-gh-segment');
                    }
                });
                assert.equal($.html(), '<div>free</div><p>shared</p>');
            });

            it('image size preservation pattern', function () {
                const $ = load('<img src="a.jpg" width="600" height="400"><img src="b.jpg">');
                const sizes = $('img').get().map((img) => {
                    return {src: img.attribs.src, width: img.attribs.width, height: img.attribs.height};
                });
                assert.equal(sizes[0].width, '600');
                assert.equal(sizes[1].width, undefined);
            });
        });
    });
});
