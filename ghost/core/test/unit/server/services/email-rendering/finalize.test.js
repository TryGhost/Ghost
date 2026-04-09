const assert = require('node:assert/strict');
const {finalize} = require('../../../../../core/server/services/email-rendering/finalize');

describe('Email finalize', function () {
    describe('juice CSS inlining correctly handles HTML entities', function () {
        it('preserves &amp; in href attributes', function () {
            const html = `<html><head><style>a { color: red; }</style></head><body><a href="https://example.com?foo=1&amp;bar=2">Link</a></body></html>`;
            const {html: result} = finalize(html);

            assert.ok(
                result.includes('foo=1&amp;bar=2'),
                `Expected &amp; to be preserved, but got: ${result}`
            );
            assert.ok(
                !result.includes('&amp;amp;'),
                `Found double-encoded &amp;amp; in output: ${result}`
            );
        });

        it('preserves &amp; in text content', function () {
            const html = `<html><head><style>p { color: blue; }</style></head><body><p>Tom &amp; Jerry</p></body></html>`;
            const {html: result} = finalize(html);

            assert.ok(
                result.includes('Tom &amp; Jerry'),
                `Expected &amp; to be preserved in text, but got: ${result}`
            );
            assert.ok(
                !result.includes('&amp;amp;'),
                `Found double-encoded &amp;amp; in output: ${result}`
            );
        });

        it('preserves &#x27; and other numeric entities', function () {
            const html = `<html><head><style>p { margin: 0; }</style></head><body><p>It&#x27;s a test</p></body></html>`;
            const {html: result} = finalize(html);

            assert.ok(
                !result.includes('&amp;#x27;'),
                `Found double-encoded &#x27; in output: ${result}`
            );
        });

        it('preserves entities in complex email-like HTML', function () {
            const html = `
                <html>
                <head>
                    <style>
                        .button { background: #e9e9e9; padding: 10px; }
                        .content { font-family: sans-serif; }
                    </style>
                </head>
                <body>
                    <div class="content">
                        <p>Hello &amp; welcome!</p>
                        <a class="button" href="https://example.com/unsubscribe?token=abc&amp;newsletter=daily&amp;ref=email">Unsubscribe</a>
                        <p>Copyright &copy; 2026 Ghost</p>
                    </div>
                </body>
                </html>
            `;
            const {html: result} = finalize(html);

            assert.ok(
                !result.includes('&amp;amp;'),
                `Found double-encoded &amp;amp; in output: ${result}`
            );
            assert.ok(
                result.includes('token=abc&amp;newsletter=daily&amp;ref=email'),
                `Expected URL entities to be preserved, but got: ${result}`
            );
        });
    });
});
