import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { MemberClickEvent } = models;

describe('Unit: models/MemberClickEvent', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('Has link and member relations', function () {
    const model = MemberClickEvent.forge({ id: 'any' });
    model.link();
    model.member();
  });

  it('Has filter relations', function () {
    const model = MemberClickEvent.forge({ id: 'any' });
    model.filterRelations();
  });
});
