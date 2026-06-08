const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');

const color_to_rgba = require('../../../../core/frontend/helpers/color_to_rgba');

describe('{{color_to_rgba}} helper', function () {
    it('has color_to_rgba helper', function () {
        assertExists(color_to_rgba);
    });

    it('returns an rgba string for a valid color', function () {
        assert.equal(color_to_rgba('#FF1A75', 0.25), 'rgba(255, 26, 117, 0.25)');
    });

    it('clamps alpha into the valid range', function () {
        assert.equal(color_to_rgba('#FF1A75', 2), 'rgb(255, 26, 117)');
    });

    it('falls back for invalid colors', function () {
        assert.equal(color_to_rgba('', 0.25), 'rgba(21, 23, 26, 0.25)');
    });
});
