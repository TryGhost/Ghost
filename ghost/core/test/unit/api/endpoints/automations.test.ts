import assert from 'node:assert/strict';
import sinon from 'sinon';

// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import domainEvents from '@tryghost/domain-events';
import { controller as automationsController } from '../../../../core/server/api/endpoints/automations';
import { StartAutomationsPollEvent } from '../../../../core/server/services/automations/events/start-automations-poll-event';

describe('Automations controller', function () {
  // Other endpoints are tested in E2E tests.

  let dispatchStub: sinon.SinonStub;

  beforeEach(function () {
    dispatchStub = sinon.stub(domainEvents, 'dispatch');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('poll', function () {
    it('dispatches a StartAutomationsPollEvent', function () {
      const result = automationsController.poll.query();

      sinon.assert.calledOnceWithExactly(
        dispatchStub,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
      assert.equal(result, undefined);
    });
  });
});
