import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';
// @ts-expect-error color_to_rgba currently lacks type definitions.
import colorToRgba from '../../../../core/frontend/helpers/color_to_rgba';

describe('{{color_to_rgba}} helper', function () {
  it('has color_to_rgba helper', function () {
    assertExists(colorToRgba);
  });

  it('returns an rgba string for a valid color', function () {
    assert.equal(colorToRgba('#FF1A75', 0.25), 'rgba(255, 26, 117, 0.25)');
  });

  it('clamps alpha into the valid range', function () {
    assert.equal(colorToRgba('#FF1A75', 2), 'rgb(255, 26, 117)');
  });

  it('falls back for invalid colors', function () {
    assert.equal(colorToRgba('', 0.25), 'rgba(21, 23, 26, 0.25)');
  });
});
