'use strict';

const should = require('should'); // jshint ignore:line
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
});
