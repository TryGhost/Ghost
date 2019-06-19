var should = require('should'),
    sinon = require('sinon'),
    helpers = require('../../../frontend/helpers'),
    proxy = require('../../../frontend/helpers/proxy'),
    settingsCache = proxy.settingsCache;

describe('{{ghost_foot}} helper', function () {
    var settingsCacheStub;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        settingsCacheStub = sinon.stub(settingsCache, 'get');
    });

    it('outputs global injected code', function () {
        settingsCacheStub.withArgs('ghost_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = helpers.ghost_foot({data: {}});
        should.exist(rendered);
        rendered.string.should.match(/<script>var test = 'I am a variable!'<\/script>/);
    });

    it('outputs post injected code', function () {
        settingsCacheStub.withArgs('ghost_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: 'post-codeinjection'
                    }
                }
            }
        });
        should.exist(rendered);
        rendered.string.should.match(/<script>var test = 'I am a variable!'<\/script>/);
        rendered.string.should.match(/post-codeinjection/);
    });

    it('handles post injected code being null', function () {
        settingsCacheStub.withArgs('ghost_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: null
                    }
                }
            }
        });
        should.exist(rendered);
        rendered.string.should.match(/<script>var test = 'I am a variable!'<\/script>/);
        rendered.string.should.not.match(/post-codeinjection/);
    });

    it('handles post injected code being empty', function () {
        settingsCacheStub.withArgs('ghost_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = helpers.ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: ''
                    }
                }
            }
        });
        should.exist(rendered);
        rendered.string.should.match(/<script>var test = 'I am a variable!'<\/script>/);
        rendered.string.should.not.match(/post-codeinjection/);
    });

    it('handles global empty code injection', function () {
        settingsCacheStub.withArgs('ghost_foot').returns('');

        const rendered = helpers.ghost_foot({data: {}});
        should.exist(rendered);
        rendered.string.should.eql('');
    });

    it('handles global undefined code injection', function () {
        settingsCacheStub.withArgs('ghost_foot').returns(undefined);

        const rendered = helpers.ghost_foot({data: {}});
        should.exist(rendered);
        rendered.string.should.eql('');
    });
});
