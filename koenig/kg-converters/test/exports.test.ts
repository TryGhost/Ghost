const assert = require('assert/strict');

describe('Exports', function () {
    it('includes both converter functions', function () {
        const converters = require('../');

        assert.ok(converters);
        assert.ok(converters.lexicalToMobiledoc);
        assert.equal(typeof converters.lexicalToMobiledoc, 'function');
        assert.ok(converters.mobiledocToLexical);
        assert.equal(typeof converters.mobiledocToLexical, 'function');
    });

    it('lexicalToMobiledoc runs without error', function () {
        const converters = require('../');
        assert.ok(converters.lexicalToMobiledoc('{}'));
    });

    it('mobiledocToLexical runs without error', function () {
        const converters = require('../');
        assert.ok(converters.mobiledocToLexical('{}'));
    });
});
