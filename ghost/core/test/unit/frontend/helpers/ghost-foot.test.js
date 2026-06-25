const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const ghost_foot = require('../../../../core/frontend/helpers/ghost_foot');
const {blogIcon, settingsCache, urlUtils} = require('../../../../core/frontend/services/proxy');

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

    it('outputs the split gift toast on gift renders', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('');
        settingsCacheStub.withArgs('accent_color').returns('#ff5500');
        settingsCacheStub.withArgs('logo').returns('/content/images/logo.png');
        const urlForStub = sinon.stub(urlUtils, 'urlFor').returns('https://example.com/content/images/logo.png');
        sinon.stub(urlUtils, 'getSiteUrl').returns('https://example.com/');
        const iconStub = sinon.stub(blogIcon, 'getIconUrl').returns('https://example.com/content/images/icon.png');

        const rendered = ghost_foot({
            data: {
                gift: {
                    post_id: 'post-id'
                }
            }
        });

        assertExists(rendered);
        assert.match(rendered.string, /id="gh-gift-toast"/);
        assert.doesNotMatch(rendered.string, /id="gh-gift-toast-switcher"/);
        assert.doesNotMatch(rendered.string, /data-gh-gift-toast-variant/);
        assert.match(rendered.string, /--gh-gift-toast-accent: #ff5500/);
        assert.match(rendered.string, /src="https:\/\/example.com\/content\/images\/logo.png"/);
        assert.doesNotMatch(rendered.string, /GIFT POST/);
        assert.match(rendered.string, /You’ve been gifted access to this post\./);
        assert.match(rendered.string, /--gh-gift-toast-orb-url: url\("https:\/\/example.com\/gift\/assets\/gift-card-orb.png"\)/);
        assert.match(rendered.string, /--gh-gift-toast-noise-url: url\("https:\/\/example.com\/gift\/assets\/gift-card-noise.png"\)/);
        assert.match(rendered.string, /grid-template-columns: 64px minmax\(0, 1fr\)/);
        sinon.assert.calledWith(urlForStub, 'image', {image: '/content/images/logo.png'}, true);
        sinon.assert.calledWith(iconStub, {absolute: true, fallbackToDefault: false});
    });

    it('falls back to the gift card pattern when no publication logo or icon exists', function () {
        settingsCacheStub.withArgs('codeinjection_foot').returns('');
        settingsCacheStub.withArgs('accent_color').returns('#ff5500');
        settingsCacheStub.withArgs('logo').returns(null);
        sinon.stub(urlUtils, 'getSiteUrl').returns('https://example.com/');
        sinon.stub(blogIcon, 'getIconUrl').returns(null);

        const rendered = ghost_foot({
            data: {
                gift: {
                    post_id: 'post-id'
                }
            }
        });

        assertExists(rendered);
        assert.match(rendered.string, /class="gh-gift-toast-media is-fallback"/);
        assert.doesNotMatch(rendered.string, /class="gh-gift-toast-logo"/);
        assert.match(rendered.string, /<span class="gh-gift-toast-pattern"><\/span>/);
        assert.match(rendered.string, /background-color: var\(--gh-gift-toast-accent\)/);
    });
});
