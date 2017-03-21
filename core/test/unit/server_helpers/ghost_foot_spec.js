var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    Promise = require('bluebird'),

// Stuff we are testing
    helpers = require('../../../server/helpers'),
    api = require('../../../server/api'),

    sandbox = sinon.sandbox.create();

describe('{{ghost_foot}} helper', function () {
    afterEach(function () {
        sandbox.restore();
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
});
