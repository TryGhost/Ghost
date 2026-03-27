const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const ghost_foot = require('../../../../core/frontend/helpers/ghost_foot');
const {settingsCache} = require('../../../../core/frontend/services/proxy');

describe('{{ghost_foot}} helper', function () {
    let settingsCacheStub;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        settingsCacheStub = sinon.stub(settingsCache, 'get');
    });

    it('outputs global injected code', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = ghost_foot({data: {}});
        assertExists(rendered);
        assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
    });

    it('outputs post injected code', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: 'post-codeinjection'
                    }
                }
            }
        });
        assertExists(rendered);
        assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
        assert.match(rendered.string, /post-codeinjection/);
    });

    it('handles post injected code being null', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: null
                    }
                }
            }
        });
        assertExists(rendered);
        assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
        assert.doesNotMatch(rendered.string, /post-codeinjection/);
    });

    it('handles post injected code being empty', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('<script>var test = \'I am a variable!\'</script>');

        const rendered = ghost_foot({
            data: {
                root: {
                    post: {
                        codeinjection_foot: ''
                    }
                }
            }
        });
        assertExists(rendered);
        assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
        assert.doesNotMatch(rendered.string, /post-codeinjection/);
    });

    it('handles global empty code injection', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('');

        const rendered = ghost_foot({data: {}});
        assertExists(rendered);
        assert.equal(rendered.string, '');
    });

    it('handles global undefined code injection', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns(undefined);

        const rendered = ghost_foot({data: {}});
        assertExists(rendered);
        assert.equal(rendered.string, '');
    });
});
