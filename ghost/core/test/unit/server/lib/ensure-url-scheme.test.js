const assert = require('node:assert/strict');
const ensureUrlScheme = require('../../../../core/server/lib/ensure-url-scheme');

describe('lib/ensure-url-scheme', function () {
    it('leaves relative hash links untouched', function () {
        assert.equal(ensureUrlScheme('#/share'), '#/share');
        assert.equal(ensureUrlScheme('#/portal/signup'), '#/portal/signup');
        assert.equal(ensureUrlScheme('#'), '#');
    });

    it('leaves root-relative links untouched', function () {
        assert.equal(ensureUrlScheme('/my-post/'), '/my-post/');
        assert.equal(ensureUrlScheme('/my-post/#/share'), '/my-post/#/share');
    });

    it('leaves already-scheme\'d URLs untouched', function () {
        assert.equal(ensureUrlScheme('https://example.com/post/#/share'), 'https://example.com/post/#/share');
        assert.equal(ensureUrlScheme('http://example.com/'), 'http://example.com/');
        assert.equal(ensureUrlScheme('mailto:hello@example.com'), 'mailto:hello@example.com');
        assert.equal(ensureUrlScheme('tel:+123456789'), 'tel:+123456789');
    });

    it('leaves protocol-relative URLs untouched', function () {
        assert.equal(ensureUrlScheme('//cdn.example.com/asset.js'), '//cdn.example.com/asset.js');
    });

    it('leaves non-domain-like relative paths untouched', function () {
        assert.equal(ensureUrlScheme('about/team'), 'about/team');
        assert.equal(ensureUrlScheme('contact'), 'contact');
    });

    it('prefixes https:// on scheme-less domain-like values', function () {
        assert.equal(
            ensureUrlScheme('www.example.com/my-post/#/share'),
            'https://www.example.com/my-post/#/share'
        );
        assert.equal(ensureUrlScheme('example.com'), 'https://example.com');
        assert.equal(ensureUrlScheme('example.com/path?q=1'), 'https://example.com/path?q=1');
    });

    it('handles empty and non-string values', function () {
        assert.equal(ensureUrlScheme(''), '');
        assert.equal(ensureUrlScheme(null), null);
        assert.equal(ensureUrlScheme(undefined), undefined);
    });
});
