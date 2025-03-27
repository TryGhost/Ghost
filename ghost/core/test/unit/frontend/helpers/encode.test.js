const should = require('should');

// Stuff we are testing
const encode = require('../../../../core/frontend/helpers/encode');

describe('{{encode}} helper', function () {
    it('can escape URI', function () {
        const uri = '$pecial!Charact3r(De[iver]y)Foo #Bar';
        const expected = '%24pecial!Charact3r(De%5Biver%5Dy)Foo%20%23Bar';
        const escaped = encode(uri);

        should.exist(escaped);
        String(escaped).should.equal(expected);
    });
});
