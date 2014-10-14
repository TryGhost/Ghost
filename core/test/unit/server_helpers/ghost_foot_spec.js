/*globals describe, before, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    rewire         = require('rewire'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = rewire('../../../server/helpers');

describe('{{ghost_foot}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    afterEach(function () {
        utils.restoreConfig();
        helpers.__set__('utils.isProduction', false);
    });

    it('has loaded ghost_foot helper', function () {
        should.exist(handlebars.helpers.ghost_foot);
    });

    it('outputs correct jquery for development mode', function (done) {
        utils.overrideConfig({assetHash: 'abc'});

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script src=".*\/public\/jquery.js\?v=abc"><\/script>/);

            done();
        }).catch(done);
    });

    it('outputs correct jquery for production mode', function (done) {
        utils.overrideConfig({assetHash: 'abc'});
        helpers.__set__('utils.isProduction', true);

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script src=".*\/public\/jquery.min.js\?v=abc"><\/script>/);

            done();
        }).catch(done);
    });
});
