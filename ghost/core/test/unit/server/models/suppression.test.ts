import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import Suppression from '../../../../core/server/models/suppression';

describe('Suppression', function () {
  it('exists', function () {
    assert(Suppression);
  });
});
