import '../utils/index.js';

import card from '../../src/cards/paywall.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('paywall card', function () {
    it('has correct properties', function () {
        card.name.should.eql('paywall');
        card.type.should.eql('dom');
    });

    it('generates a members-only comment', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {}
        };

        serializer.serialize(card.render(opts)).should.match('<!--members-only-->');
    });
});
