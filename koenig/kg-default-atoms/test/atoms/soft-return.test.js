// Switch these lines once there are useful utils
// const testUtils = require('../utils');
require('../utils');

const atom = require('../../lib/atoms/soft-return');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Soft return atom', function () {
    it('generates a `br` tag', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        serializer.serialize(atom.render(opts)).should.match('<br>');
    });
});
