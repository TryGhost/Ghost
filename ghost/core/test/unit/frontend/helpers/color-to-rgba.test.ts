import assert from 'node:assert/strict';
import color_to_rgba from '../../../../core/frontend/helpers/color_to_rgba'; // eslint-disable-line camelcase

describe('{{color_to_rgba}} helper', function () {
    it('returns an rgba string for a valid color', function () {
        assert.equal(color_to_rgba('#FF1A75', 0.25), 'rgba(255, 26, 117, 0.25)');
        assert.equal(color_to_rgba(' #FF1A75 ', 0.25), 'rgba(255, 26, 117, 0.25)');
        assert.equal(color_to_rgba('rgb(12, 34, 56)', 0.25), 'rgba(12, 34, 56, 0.25)');
        assert.equal(color_to_rgba('red', 0.25), 'rgba(255, 0, 0, 0.25)');
    });

    it('overrides existing alpha in the color', function () {
        assert.equal(color_to_rgba('#FF1A7598', 0.25), 'rgba(255, 26, 117, 0.25)');
        assert.equal(color_to_rgba('rgba(12, 34, 56, 78)', 0.25), 'rgba(12, 34, 56, 0.25)');
    });

    it('clamps alpha into the valid range', function () {
        assert.equal(color_to_rgba('#FF1A75', -1), 'rgba(255, 26, 117, 0)');
        assert.equal(color_to_rgba('#FF1A75', 0), 'rgba(255, 26, 117, 0)');
        assert.equal(color_to_rgba('#FF1A75', 1), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', 2), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', -Infinity), 'rgba(255, 26, 117, 0)');
        assert.equal(color_to_rgba('#FF1A75', Infinity), 'rgb(255, 26, 117)');
    });

    it('handles string alphas', function () {
        assert.equal(color_to_rgba('#FF1A75', '0.25'), 'rgba(255, 26, 117, 0.25)');
    });

    it('falls back for invalid colors', function () {
        assert.equal(color_to_rgba('', 0.25), 'rgba(21, 23, 26, 0.25)');
        assert.equal(color_to_rgba('invalid', 0.25), 'rgba(21, 23, 26, 0.25)');
        assert.equal(color_to_rgba(0xff9900, 0.25), 'rgba(21, 23, 26, 0.25)');
        assert.equal(color_to_rgba(true, 0.25), 'rgba(21, 23, 26, 0.25)');
        assert.equal(color_to_rgba(undefined, 0.25), 'rgba(21, 23, 26, 0.25)');
        assert.equal(color_to_rgba(null, 0.25), 'rgba(21, 23, 26, 0.25)');
    });

    it('falls back for invalid alphas', function () {
        assert.equal(color_to_rgba('#FF1A75', 'not a number'), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', NaN), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', true), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', 1n), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', undefined), 'rgb(255, 26, 117)');
        assert.equal(color_to_rgba('#FF1A75', null), 'rgb(255, 26, 117)');
    });
});
