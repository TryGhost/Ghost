import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { Suppression } = models;

describe('Suppression', function () {
  it('exists', function () {
    assert(Suppression);
  });
});
