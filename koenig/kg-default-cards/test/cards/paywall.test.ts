import card from '../../src/cards/paywall.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('paywall card', function () {
    it('has correct properties', function () {
        expect(card.name).toEqual('paywall');
        expect(card.type).toEqual('dom');
    });

    it('generates a members-only comment', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {}
        };

        expect(serializer.serialize(card.render(opts))).toEqual('<!--members-only-->');
    });
});
