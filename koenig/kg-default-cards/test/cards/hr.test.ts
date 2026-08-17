import card from '../../src/cards/hr.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('HR card', function () {
    it('generates a horizontal rule', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {}
        };

        expect(serializer.serialize(card.render(opts))).toEqual('<hr>');
    });
});
