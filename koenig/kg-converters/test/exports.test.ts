import assert from 'assert/strict';
import {lexicalToMobiledoc, mobiledocToLexical} from '../src/index.js';

describe('Exports', function () {
    it('includes both converter functions', function () {
        assert.ok(lexicalToMobiledoc);
        assert.equal(typeof lexicalToMobiledoc, 'function');
        assert.ok(mobiledocToLexical);
        assert.equal(typeof mobiledocToLexical, 'function');
    });

    it('lexicalToMobiledoc runs without error', function () {
        assert.ok(lexicalToMobiledoc('{}'));
    });

    it('mobiledocToLexical runs without error', function () {
        assert.ok(mobiledocToLexical('{}'));
    });
});
