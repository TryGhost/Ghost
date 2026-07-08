import '../utils/index.js';

import card from '../../src/cards/html.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('HTML card', function () {
    it('HTML Card renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<h1>HEADING</h1><p>PARAGRAPH</p>');
    });

    it('Plain content renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: 'CONTENT'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('CONTENT');
    });

    it('Invalid HTML returns', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: '<h1>HEADING<'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<h1>HEADING<');
    });

    it('Renders nothing when payload is undefined', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            html: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        (transformed.html as string)
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            html: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        (transformed.html as string)
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
