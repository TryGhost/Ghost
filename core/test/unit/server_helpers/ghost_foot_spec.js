/*globals describe, before, beforeEach, afterEach, it*/
var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    rewire         = require('rewire'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = rewire('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{ghost_foot}} helper', function () {
    var sandbox;

    before(function () {
        utils.loadHelpers();
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    it('has loaded ghost_foot helper', function () {
        should.exist(handlebars.helpers.ghost_foot);
    });

    it('outputs correct injected code', function (done) {
        sandbox.stub(api.settings, 'read', function () {
            return Promise.resolve({
                settings: [{value: '<script type="text/javascript">var test = \'I am a variable!\'</script>'}]
            });
        });

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);

            done();
        }).catch(done);
    });

    afterEach(function () {
        sandbox.restore();
    });
});
