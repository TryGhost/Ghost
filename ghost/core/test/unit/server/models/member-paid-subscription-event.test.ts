import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { MemberPaidSubscriptionEvent } = models;

describe('Unit: models/MemberPaidSubscriptionEvent', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('Has member and subscriptionCreatedEvent relations', function () {
    const model = MemberPaidSubscriptionEvent.forge({ id: 'any' });
    model.member();
    model.subscriptionCreatedEvent();
  });

  it('Has filter relations', function () {
    const model = MemberPaidSubscriptionEvent.forge({ id: 'any' });
    model.filterRelations();
  });
});
