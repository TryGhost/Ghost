/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{plural}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded plural helper', function () {
        should.exist(handlebars.helpers.plural);
    });

    it('will show no-value string', function () {
        var expected = 'No Posts',
            rendered = helpers.plural.call({}, 0, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('will show singular string', function () {
        var expected = '1 Post',
            rendered = helpers.plural.call({}, 1, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('will show plural string', function () {
        var expected = '2 Posts',
            rendered = helpers.plural.call({}, 2, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
