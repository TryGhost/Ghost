const assert = require('assert');
const linkReplacer = require('../lib/LinkReplacer');

describe('LinkReplacementService', function () {
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
    });
});
