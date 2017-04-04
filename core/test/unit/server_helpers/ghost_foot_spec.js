var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),

// Stuff we are testing
    helpers = require('../../../server/helpers'),
    proxy = require('../../../server/helpers/proxy'),
    settingsCache = proxy.settingsCache,

    sandbox = sinon.sandbox.create();

describe('{{ghost_foot}} helper', function () {
    var settingsCacheStub;

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        settingsCacheStub = sandbox.stub(settingsCache, 'get');
    });

    it('outputs correct injected code', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('<script type="text/javascript">var test = \'I am a variable!\'</script>');

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);

            done();
        }).catch(done);
    });

    it('outputs handles code injection being empty', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('');

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.eql('');

            done();
        }).catch(done);
    });

    it('outputs handles code injection being undefined', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns(undefined);

        helpers.ghost_foot.call().then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.eql('');

            done();
        }).catch(done);
    });
});
