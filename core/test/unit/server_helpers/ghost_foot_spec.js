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

    it('outputs global injected code', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('<script type="text/javascript">var test = \'I am a variable!\'</script>');

        helpers.ghost_foot({data: {}}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);

            done();
        }).catch(done);
    });

    it('outputs post injected code', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('<script type="text/javascript">var test = \'I am a variable!\'</script>');

        helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: 'post-codeinjection'
                    }
                }
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);
            rendered.string.should.match(/post-codeinjection/);

            done();
        }).catch(done);
    });

    it('handles post injected code being null', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('<script type="text/javascript">var test = \'I am a variable!\'</script>');

        helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: null
                    }
                }
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);
            rendered.string.should.not.match(/post-codeinjection/);

            done();
        }).catch(done);
    });

    it('handles post injected code being empty', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('<script type="text/javascript">var test = \'I am a variable!\'</script>');

        helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: ''
                    }
                }
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.match(/<script type="text\/javascript">var test = 'I am a variable!'<\/script>/);
            rendered.string.should.not.match(/post-codeinjection/);

            done();
        }).catch(done);
    });

    it('handles global empty code injection', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns('');

        helpers.ghost_foot({data: {}}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.eql('');

            done();
        }).catch(done);
    });

    it('handles global undefined code injection', function (done) {
        settingsCacheStub.withArgs('ghost_foot').returns(undefined);

        helpers.ghost_foot({data: {}}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.eql('');

            done();
        }).catch(done);
    });
});
