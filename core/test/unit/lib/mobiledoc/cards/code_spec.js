const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/code');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Code card', function () {
    it('Renders and escapes', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                code: '<p>Test</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<pre><code>&lt;p&gt;Test&lt;/p&gt;</code></pre>');
    });

    it('Renders language class if provided', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                code: '<p>Test</p>',
                language: 'html'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<pre><code class="language-html">&lt;p&gt;Test&lt;/p&gt;</code></pre>');
    });

    it('Renders nothing when payload is undefined', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                code: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.match('');
    });

    it('Renders a figure if a caption is provided', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                code: '<p>Test</p>',
                language: 'html',
                caption: 'Some <strong>HTML</strong>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-code-card"><pre><code class="language-html">&lt;p&gt;Test&lt;/p&gt;</code></pre><figcaption>Some <strong>HTML</strong></figcaption></figure>');
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {});

        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {});

        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
