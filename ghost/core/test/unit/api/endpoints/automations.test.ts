import assert from 'node:assert/strict';
import sinon from 'sinon';
import { vi } from 'vitest';

// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import domainEvents from '@tryghost/domain-events';
import { controller as automationsController } from '../../../../core/server/api/endpoints/automations';
import { StartAutomationsPollEvent } from '../../../../core/server/services/automations/events/start-automations-poll-event';
import * as automationsApi from '../../../../core/server/services/automations/automations-api';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../../core/shared/labs';

vi.mock('../../../../core/server/services/automations/automations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof automationsApi>();
  return { ...actual, browse: vi.fn() };
});

describe('Automations controller', function () {
  // Read and edit endpoints are tested in E2E tests.

  let dispatchStub: sinon.SinonStub;

  beforeEach(function () {
    dispatchStub = sinon.stub(domainEvents, 'dispatch');
  });

  afterEach(function () {
    sinon.restore();
    vi.resetAllMocks();
  });

  describe('browse', function () {
    it('returns 404 without browsing automations when the labs flag is disabled', async function () {
      sinon.stub(labs, 'isSet').withArgs('automations').returns(false);
      const browseStub = vi.mocked(automationsApi.browse).mockResolvedValue({ data: [] });

      await assert.rejects(automationsController.browse.query(), {
        errorType: 'NotFoundError',
        statusCode: 404,
      });
      expect(browseStub).not.toHaveBeenCalled();
    });

    it('returns automations when the labs flag is enabled', async function () {
      sinon.stub(labs, 'isSet').withArgs('automations').returns(true);
      const response = { data: [] };
      vi.mocked(automationsApi.browse).mockResolvedValue(response);

      assert.equal(await automationsController.browse.query(), response);
    });
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
