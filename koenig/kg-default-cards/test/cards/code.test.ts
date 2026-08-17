import card from '../../src/cards/code.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Code card', function () {
    it('Renders and escapes', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                code: '<p>Test</p>'
            }
        };

        expect(serializer.serialize(card.render(opts))).toEqual('<pre><code>&lt;p&gt;Test&lt;/p&gt;</code></pre>');
    });

    it('Renders language class if provided', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                code: '<p>Test</p>',
                language: 'html'
            }
        };

        expect(serializer.serialize(card.render(opts))).toEqual('<pre><code class="language-html">&lt;p&gt;Test&lt;/p&gt;</code></pre>');
    });

    it('Renders nothing when payload is undefined', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                code: undefined
            }
        };

        expect(serializer.serialize(card.render(opts))).toEqual('');
    });

    it('Renders a figure if a caption is provided', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                code: '<p>Test</p>',
                language: 'html',
                caption: 'Some <strong>HTML</strong>'
            }
        };

        expect(serializer.serialize(card.render(opts))).toEqual('<figure class="kg-card kg-code-card"><pre><code class="language-html">&lt;p&gt;Test&lt;/p&gt;</code></pre><figcaption>Some <strong>HTML</strong></figcaption></figure>');
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        expect((transformed.caption as string))
            .toBe('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        expect((transformed.caption as string))
            .toBe('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
