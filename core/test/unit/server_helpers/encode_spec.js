/*globals describe, before, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{encode}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded encode helper', function () {
        should.exist(handlebars.helpers.encode);
    });

    it('can escape URI', function () {
        var uri = '$pecial!Charact3r(De[iver]y)Foo #Bar',
            expected = '%24pecial!Charact3r(De%5Biver%5Dy)Foo%20%23Bar',
            escaped = helpers.encode(uri);

        should.exist(escaped);
        String(escaped).should.equal(expected);
    });
});
