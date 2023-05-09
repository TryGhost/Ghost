const assert = require('assert');

describe('Exports', function () {
    it('includes both converter functions', function () {
        const converters = require('../');

        assert.ok(converters);
        assert.ok(converters.lexicalToMobiledoc);
        assert.strictEqual(typeof converters.lexicalToMobiledoc, 'function');
        assert.ok(converters.mobiledocToLexical);
        assert.strictEqual(typeof converters.mobiledocToLexical, 'function');
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
