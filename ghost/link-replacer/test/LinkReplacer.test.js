const assert = require('assert/strict');
const linkReplacer = require('../lib/link-replacer');
const html5parser = require('html5parser');
const sinon = require('sinon');

describe('LinkReplacementService', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('exported', function () {
        assert.equal(require('../index'), linkReplacer);
    });

    describe('replace', function () {
        it('Can replace to URL', async function () {
            const html = '<a href="http://localhost:2368/dir/path">link</a>';
            const expected = '<a href="https://google.com/test-dir?test-query">link</a>';

            const replaced = await linkReplacer.replace(html, () => new URL('https://google.com/test-dir?test-query'));
            assert.equal(replaced, expected);
        });

        it('Can replace relative URLs', async function () {
            const html = '<a href="dir/path">link</a>';
            const expected = '<a href="https://google.com/test-dir/dir/path">link</a>';

            const replaced = await linkReplacer.replace(html, u => u, {base: 'https://google.com/test-dir/'});
            assert.equal(replaced, expected);
        });

        it('Can replace relative URLs relative to root domain', async function () {
            const html = '<a href="/dir/path">link</a>';
            const expected = '<a href="https://google.com/dir/path">link</a>';

            const replaced = await linkReplacer.replace(html, u => u, {base: 'https://google.com/test-dir/'});
            assert.equal(replaced, expected);
        });

        it('Can replace fragments relative to base', async function () {
            const html = '<a href="#support">link</a>';
            const expected = '<a href="https://google.com/test-dir/#support">link</a>';

            const replaced = await linkReplacer.replace(html, u => u, {base: 'https://google.com/test-dir/'});
            assert.equal(replaced, expected);
        });

        it('Doesn\'t break weird &map', async function () {
            // Refs https://github.com/TryGhost/Team/issues/2666: somehow this gets replaced with https://example.com/test.jpg?test=true↦id=de76 if decoding entities is enabled
            const html = '<img src="https://example.com/test.jpg?test=true&map_id=test">';
            const expected = '<img src="https://example.com/test.jpg?test=true&map_id=test">';

            const replaced = await linkReplacer.replace(html, () => new URL('https://google.com/test-dir?test-query'));
            assert.equal(replaced, expected);
        });

        it('Does not escape HTML characters', async function () {
            const html = 'This is a test & this \'should\' not "be" escaped';
            const replaced = await linkReplacer.replace(html, () => new URL('https://google.com/test-dir?test-query'));
            assert.equal(replaced, html);
        });

        it('Does escape HTML characters within a link\'s href', async function () {
            const html = '<a href="https://www.google.com/maps/d/u/0/viewer?mid&#x3D;1kQUV2O5QQOigaxJUorLUC9LBP4Ibppg&amp;ll&#x3D;37.87151888616819%2C-122.27759691003418&amp;z&#x3D;13">link</a>';
            const expected = '<a href="https://www.google.com/maps/d/u/0/viewer?mid=1kQUV2O5QQOigaxJUorLUC9LBP4Ibppg&ll=37.87151888616819%2C-122.27759691003418&z=13">link</a>';
            const replaced = await linkReplacer.replace(html, url => new URL(url));
            assert.equal(replaced, expected);
        });

        it('Can replace to string', async function () {
            const html = '<a href="http://localhost:2368/dir/path">link</a>';
            const expected = '<a href="#valid-string">link</a>';

            const replaced = await linkReplacer.replace(html, () => '#valid-string');
            assert.equal(replaced, expected);
        });

        it('Ignores invalid links', async function () {
            const html = '<a href="invalid">link</a>';
            const expected = '<a href="invalid">link</a>';

            const replaced = await linkReplacer.replace(html, () => 'valid');
            assert.equal(replaced, expected);
        });

        it('Ignores parse errors', async function () {
            sinon.stub(html5parser, 'tokenize').throws(new Error('test'));
            const html = '<a href="http://localhost:2368/dir/path">link</a>';

            const replaced = await linkReplacer.replace(html, () => 'valid');
            assert.equal(replaced, html);
        });

        it('Doesn\'t replace single-quote attributes with double-quote', async function () {
            const html = '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>';
            const expected = '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>';

            const replaced = await linkReplacer.replace(html, () => new URL('https://google.com/test-dir?test-query'));
            assert.equal(replaced, expected);
        });
    });
});
