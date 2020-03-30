var should = require('should'),

    // Stuff we are testing
    helpers = require('../../../core/frontend/helpers');

describe('{{encode}} helper', function () {
    it('can escape URI', function () {
        var uri = '$pecial!Charact3r(De[iver]y)Foo #Bar',
            expected = '%24pecial!Charact3r(De%5Biver%5Dy)Foo%20%23Bar',
            escaped = helpers.encode(uri);

        should.exist(escaped);
        String(escaped).should.equal(expected);
    });
});
