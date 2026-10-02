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
  return { ...actual, browse: vi.fn(), getNumberOfAutomations: vi.fn() };
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
    const emptyPage = {
      data: [],
      meta: {
        pagination: {
          page: 1,
          pages: 1,
          limit: 15,
          total: 0,
          prev: null,
          next: null,
        },
      },
    };

    let browseStub: ReturnType<typeof vi.mocked>;

    beforeEach(function () {
      browseStub = vi.mocked(automationsApi.browse).mockResolvedValue(emptyPage);
    });

    it('returns 404 without browsing automations when the labs flag is disabled', async function () {
      sinon.stub(labs, 'isSet').withArgs('automations').returns(false);

      await assert.rejects(automationsController.browse.query(), {
        errorType: 'NotFoundError',
        statusCode: 404,
      });
      expect(browseStub).not.toHaveBeenCalled();
    });

    it('returns automations when the labs flag is enabled', async function () {
      sinon.stub(labs, 'isSet').withArgs('automations').returns(true);

      assert.equal(await automationsController.browse.query(), emptyPage);
    });
  });

  describe('add', function () {
    let labsIsSetStub: sinon.SinonStub;

    beforeEach(function () {
      labsIsSetStub = sinon.stub(labs, 'isSet').returns(true);
    });

    for (const flag of ['automations', 'automationsPerTier']) {
      it(`returns 404 when ${flag} labs flag is disabled`, async function () {
        labsIsSetStub.withArgs(flag).returns(false);

        await assert.rejects(automationsController.add.query(), {
          errorType: 'NotFoundError',
          statusCode: 404,
        });
      });
    }

    for (const count of [0, 19]) {
      it(`returns NOT_IMPLEMENTED with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        await assert.rejects(automationsController.add.query(), {
          statusCode: 501,
          code: 'NOT_IMPLEMENTED',
          message: 'Adding automations is not implemented.',
        });
      });
    }

    for (const count of [20, 21]) {
      it(`rejects creation with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        await assert.rejects(automationsController.add.query(), {
          errorType: 'HostLimitError',
          statusCode: 403,
          code: 'AUTOMATION_LIMIT_REACHED',
        });
      });
    }
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
