const assert = require('node:assert/strict');
const {
    collapseWhitespace,
    formatIsoDate,
    truncateDescription,
    getMarkdownPath,
    getMarkdownUrl,
    getResourcePathFromMarkdownPath,
    getAcceptedMarkdownContentType,
    markdownFromHtml,
    renderEntryMarkdown,
    renderEntryMarkdownBody
} = require('../../../../../core/frontend/services/llms/markdown');

describe('Unit: frontend/services/llms/markdown', function () {
    describe('collapseWhitespace', function () {
        it('collapses multiple spaces and newlines', function () {
            assert.equal(collapseWhitespace('  hello   world\n\nfoo  '), 'hello world foo');
        });

        it('returns empty string for null/undefined', function () {
            assert.equal(collapseWhitespace(null), '');
            assert.equal(collapseWhitespace(undefined), '');
        });
    });

    describe('truncateDescription', function () {
        it('returns short strings unchanged', function () {
            assert.equal(truncateDescription('short'), 'short');
        });

        it('truncates at 300 chars by default', function () {
            const long = 'A'.repeat(320);
            const result = truncateDescription(long);
            assert.equal(result.length, 300);
            assert.ok(result.endsWith('…'));
        });

        it('returns empty string for empty input', function () {
            assert.equal(truncateDescription(''), '');
        });
    });

    describe('getMarkdownPath', function () {
        it('converts trailing-slash paths to .md', function () {
            assert.equal(getMarkdownPath('/about/'), '/about.md');
        });

        it('converts root to /index.md', function () {
            assert.equal(getMarkdownPath('/'), '/index.md');
        });

        it('handles paths without trailing slash', function () {
            assert.equal(getMarkdownPath('/about'), '/about.md');
        });

        it('handles null', function () {
            assert.equal(getMarkdownPath(null), '/index.md');
        });
    });

    describe('getMarkdownUrl', function () {
        it('converts a full URL to .md variant', function () {
            assert.equal(getMarkdownUrl('https://example.com/about/'), 'https://example.com/about.md');
        });
    });

    describe('getResourcePathFromMarkdownPath', function () {
        it('strips .md and adds trailing slash', function () {
            assert.equal(getResourcePathFromMarkdownPath('/about.md'), '/about/');
        });

        it('returns / for /index.md', function () {
            assert.equal(getResourcePathFromMarkdownPath('/index.md'), '/');
        });

        it('returns null for non-.md paths', function () {
            assert.equal(getResourcePathFromMarkdownPath('/about/'), null);
        });

        it('returns null for null', function () {
            assert.equal(getResourcePathFromMarkdownPath(null), null);
        });
    });

    describe('getAcceptedMarkdownContentType', function () {
        function fakeReq(accept) {
            return {
                get(header) {
                    if (header === 'Accept') {
                        return accept;
                    }
                    return null;
                },
                accepts(types) {
                    if (!accept) {
                        return false;
                    }
                    for (const type of types) {
                        if (accept.includes(type)) {
                            return type;
                        }
                    }
                    return false;
                }
            };
        }

        it('returns text/markdown when accepted', function () {
            assert.equal(getAcceptedMarkdownContentType(fakeReq('text/markdown')), 'text/markdown');
        });

        it('returns null for text/html only', function () {
            assert.equal(getAcceptedMarkdownContentType(fakeReq('text/html')), null);
        });

        it('returns null when no accept header', function () {
            assert.equal(getAcceptedMarkdownContentType(fakeReq(null)), null);
        });
    });

    describe('formatIsoDate', function () {
        it('returns ISO string for valid date', function () {
            assert.equal(formatIsoDate('2026-01-01T00:00:00.000Z'), '2026-01-01T00:00:00.000Z');
        });

        it('returns null for null/undefined', function () {
            assert.equal(formatIsoDate(null), null);
            assert.equal(formatIsoDate(undefined), null);
        });

        it('returns null for invalid date string', function () {
            assert.equal(formatIsoDate('not-a-date'), null);
        });
    });

    describe('markdownFromHtml', function () {
        it('converts simple HTML to markdown', function () {
            const md = markdownFromHtml('<p>Hello <strong>world</strong></p>');
            assert.match(md, /Hello \*\*world\*\*/);
        });

        it('returns null for empty HTML', function () {
            assert.equal(markdownFromHtml(''), null);
        });
    });

    describe('renderEntryMarkdownBody', function () {
        it('prefers HTML conversion', function () {
            const body = renderEntryMarkdownBody({html: '<p>Hello</p>', plaintext: 'Fallback'});
            assert.equal(body, 'Hello');
        });

        it('derives only from html, ignoring a separate plaintext field', function () {
            const body = renderEntryMarkdownBody({html: '', plaintext: 'Fallback text'});
            assert.equal(body, '');
        });
    });

    describe('renderEntryMarkdown', function () {
        it('renders full markdown with metadata', function () {
            const entry = {
                title: 'My Post',
                url: 'https://example.com/my-post/',
                type: 'post',
                published_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-02T00:00:00.000Z',
                custom_excerpt: 'A post about things',
                html: '<p>Hello world</p>',
                authors: [{name: 'Alice'}],
                tags: [{name: 'Tech'}, {name: 'JavaScript'}]
            };

            const result = renderEntryMarkdown(entry, {llmsIndexUrl: 'https://example.com/llms.txt'});

            assert.match(result, /^> ## Content Index/m);
            assert.match(result, /https:\/\/example\.com\/llms\.txt/);
            assert.match(result, /^# My Post$/m);
            assert.match(result, /- URL: https:\/\/example\.com\/my-post\//);
            assert.match(result, /- Type: post/);
            assert.match(result, /- Author: Alice/);
            assert.match(result, /- Tags: Tech, JavaScript/);
            assert.match(result, /Hello world/);
        });

        it('renders page type correctly', function () {
            const entry = {
                title: 'About',
                url: 'https://example.com/about/',
                type: 'page',
                html: '<p>About us</p>',
                tags: []
            };

            const result = renderEntryMarkdown(entry, {llmsIndexUrl: 'https://example.com/llms.txt'});

            assert.match(result, /- Type: page/);
            assert.doesNotMatch(result, /- Tags:/);
        });
    });
});
