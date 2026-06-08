const assert = require('node:assert/strict');
const previewRendering = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/preview-rendering');

describe('Unit: endpoints/utils/serializers/output/utils/preview-rendering', function () {
    describe('forPost', function () {
        let frame;

        beforeEach(function () {
            frame = {
                options: {},
                original: {
                    context: {}
                }
            };
        });

        it('is a no-op when frame.isPreview is falsy', function () {
            const html = '<iframe data-kg-transistor-embed src="https://example.com"></iframe><script>x</script>';
            const attrs = {
                html,
                plaintext: 'original',
                excerpt: 'original'
            };

            previewRendering.forPost(attrs, frame);

            assert.equal(attrs.html, html);
            assert.equal(attrs.plaintext, 'original');
            assert.equal(attrs.excerpt, 'original');
        });

        it('is a no-op when HTML has no Transistor embed', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<p>Hello world</p>',
                plaintext: 'Hello world',
                excerpt: 'Hello world'
            };

            previewRendering.forPost(attrs, frame);

            assert.equal(attrs.html, '<p>Hello world</p>');
            assert.equal(attrs.plaintext, 'Hello world');
            assert.equal(attrs.excerpt, 'Hello world');
        });

        it('replaces iframe+script with placeholder in preview mode', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<p>Before</p><iframe src="https://partner.transistor.fm/ghost/embed/abc" data-kg-transistor-embed></iframe><script>window.addEventListener("message", function(e) {})</script><p>After</p>',
                plaintext: 'Before After',
                excerpt: 'Before After'
            };

            previewRendering.forPost(attrs, frame);

            assert.ok(attrs.html.includes('kg-transistor-placeholder'));
            assert.ok(!attrs.html.includes('<iframe'));
            assert.ok(!attrs.html.includes('<script>'));
            assert.ok(attrs.html.includes('<p>Before</p>'));
            assert.ok(attrs.html.includes('<p>After</p>'));
        });

        it('replaces iframe+script+noscript with placeholder', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<iframe src="https://partner.transistor.fm/ghost/embed/abc" data-kg-transistor-embed></iframe><script>window.addEventListener("message", function(e) {})</script><noscript><a href="https://example.com">Listen</a></noscript>',
                plaintext: 'Listen',
                excerpt: 'Listen'
            };

            previewRendering.forPost(attrs, frame);

            assert.ok(attrs.html.includes('kg-transistor-placeholder'));
            assert.ok(!attrs.html.includes('<iframe'));
            assert.ok(!attrs.html.includes('<script>'));
            assert.ok(!attrs.html.includes('<noscript>'));
        });

        it('updates plaintext and excerpt after replacement', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<p>Some text</p><iframe src="https://example.com" data-kg-transistor-embed></iframe><script>x</script>',
                plaintext: 'old plaintext',
                excerpt: 'old excerpt'
            };

            previewRendering.forPost(attrs, frame);

            assert.ok(attrs.plaintext.includes('Some text'));
            assert.ok(attrs.excerpt.includes('Some text'));
        });

        it('does not add plaintext when not present', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<p>Some text</p><iframe src="https://example.com" data-kg-transistor-embed></iframe><script>x</script>'
            };

            previewRendering.forPost(attrs, frame);

            assert.equal(Object.hasOwn(attrs, 'plaintext'), false);
            assert.equal(Object.hasOwn(attrs, 'excerpt'), false);
        });

        it('does not add excerpt when not present', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<p>Some text</p><iframe src="https://example.com" data-kg-transistor-embed></iframe><script>x</script>',
                plaintext: 'old plaintext'
            };

            previewRendering.forPost(attrs, frame);

            assert.ok(attrs.plaintext.includes('Some text'));
            assert.equal(Object.hasOwn(attrs, 'excerpt'), false);
        });

        it('handles multiple embeds in one post', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<iframe src="https://a.com" data-kg-transistor-embed></iframe><script>x1</script><p>Middle</p><iframe src="https://b.com" data-kg-transistor-embed></iframe><script>x2</script>',
                plaintext: 'Middle',
                excerpt: 'Middle'
            };

            previewRendering.forPost(attrs, frame);

            const matches = attrs.html.match(/kg-transistor-placeholder/g);
            assert.equal(matches.length, 2);
            assert.ok(attrs.html.includes('<p>Middle</p>'));
            assert.ok(!attrs.html.includes('<iframe'));
        });

        it('handles whitespace between iframe, script, and noscript tags', function () {
            frame.isPreview = true;
            const attrs = {
                html: '<iframe src="https://example.com" data-kg-transistor-embed> </iframe> <script type="text/javascript">x</script> <noscript>fallback</noscript>',
                plaintext: 'fallback',
                excerpt: 'fallback'
            };

            previewRendering.forPost(attrs, frame);

            assert.ok(attrs.html.includes('kg-transistor-placeholder'));
            assert.ok(!attrs.html.includes('<iframe'));
            assert.ok(!attrs.html.includes('<script'));
            assert.ok(!attrs.html.includes('<noscript>'));
        });
    });
});
