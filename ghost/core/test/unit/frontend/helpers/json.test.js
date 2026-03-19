const assert = require('node:assert/strict');

const json = require('../../../../core/frontend/helpers/json');

describe('{{json}} helper', function () {
    it('serializes values safely for inline JSON', function () {
        const output = String(json({unsafe: '</script>&\u2028\u2029'}));

        assert.equal(output, '{"unsafe":"\\u003C/script\\u003E\\u0026\\u2028\\u2029"}');
    });

    it('serializes hash arguments', function () {
        const output = String(json({hash: {foo: 'bar', count: 1}}));

        assert.equal(output, '{"foo":"bar","count":1}');
    });

    it('returns "null" for undefined input', function () {
        const output = String(json(undefined));

        assert.equal(output, 'null');
    });
});
