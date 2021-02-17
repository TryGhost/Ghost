// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/paywall');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('paywall card', function () {
    it('has correct properties', function () {
        card.name.should.eql('paywall');
        card.type.should.eql('dom');
    });

    it('generates a members-only comment', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        serializer.serialize(card.render(opts)).should.match('<!--members-only-->');
    });
});
