const assert = require('node:assert/strict');
const toPlain = require('../../../../../core/server/lib/common/to-plain');

describe('toPlain', function () {
    it('returns a plain object unchanged', function () {
        const obj = {id: 'abc', slug: 'hello'};
        assert.equal(toPlain(obj), obj);
    });

    it('serialises a Bookshelf-shaped model via toJSON', function () {
        const model = {
            // own keys are not the data; only `.toJSON()` produces it.
            toJSON: () => ({id: 'xyz', slug: 'world'})
        };
        assert.deepEqual(toPlain(model), {id: 'xyz', slug: 'world'});
    });

    it('returns null and undefined unchanged (no toJSON deref)', function () {
        assert.equal(toPlain(null), null);
        assert.equal(toPlain(undefined), undefined);
    });

    it('returns primitives unchanged (they have no toJSON)', function () {
        assert.equal(toPlain(0), 0);
        assert.equal(toPlain(''), '');
        assert.equal(toPlain(false), false);
    });

    it('returns input unchanged when toJSON is present but not callable', function () {
        // pins the `typeof === 'function'` guard: a non-function `toJSON`
        // (e.g. a JSON-serialised payload that already has a `toJSON` field)
        // must not throw and must round-trip the input.
        const obj = {id: 'abc', toJSON: 'not-a-fn'};
        assert.equal(toPlain(obj), obj);
    });
});
