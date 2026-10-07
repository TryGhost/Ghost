import assert from 'node:assert/strict';
import sinon from 'sinon';
import { vi } from 'vitest';
import { Frame } from '@tryghost/api-framework';

// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import domainEvents from '@tryghost/domain-events';
import { controller as automationsController } from '../../../../core/server/api/endpoints/automations';
import { StartAutomationsPollEvent } from '../../../../core/server/services/automations/events/start-automations-poll-event';
import * as automationsApi from '../../../../core/server/services/automations/automations-api';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../../core/shared/labs';

vi.mock('../../../../core/server/services/automations/automations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof automationsApi>();
  return {
    ...actual,
    browse: vi.fn(),
    read: vi.fn(),
    add: vi.fn(),
    getNumberOfAutomations: vi.fn(),
  };
});

describe('Automations controller', function () {
  // The edit endpoint is tested in E2E tests.

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

  describe('read', function () {
    it('returns the automation trigger tier scope and IDs', async function () {
      const automation = {
        id: '64b6f7b7c8f1a2b3c4d5e6f7',
        slug: null,
        name: 'Selected tier automation',
        description: '',
        status: 'inactive',
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
        trigger_tier_scope: 'selected_paid' as const,
        trigger_tier_ids: ['64b6f7b7c8f1a2b3c4d5e6f8'],
        actions: [],
        edges: [],
      };
      vi.mocked(automationsApi.read).mockResolvedValue(automation);
      const frame = new Frame<{ data: { id: string } }>({ params: { id: automation.id } });
      frame.configure(automationsController.read);

      const result = await automationsController.read.query(frame);

      expect(automationsApi.read).toHaveBeenCalledExactlyOnceWith(automation.id);
      assert.strictEqual(result, automation);
    });
  });

  describe('add', function () {
    const payload = {
      name: 'Test',
      description: 'Test description',
      trigger_tier_scope: 'free' as const,
    };
    const frame = new Frame<{ data: { automations: unknown[] } }>({
      body: { automations: [payload] },
    });
    frame.configure({});

    let labsIsSetStub: sinon.SinonStub;

    beforeEach(function () {
      labsIsSetStub = sinon.stub(labs, 'isSet').returns(true);
    });

    it('adds and returns new automations', async function () {
      const automation = {
        ...payload,
        id: '64b6f7b7c8f1a2b3c4d5e6f7',
        slug: null,
        status: 'inactive',
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
        trigger_tier_ids: null,
        actions: [],
        edges: [],
      };
      vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(0);
      vi.mocked(automationsApi.add).mockResolvedValue(automation);

      const result = await automationsController.add.query(frame);

      expect(automationsApi.add).toHaveBeenCalledExactlyOnceWith(payload);
      assert.strictEqual(result, automation);
      assert.equal(automationsController.add.statusCode, 201);
    });

    for (const flag of ['automations', 'automationsPerTier']) {
      it(`returns 404 when ${flag} labs flag is disabled`, async function () {
        labsIsSetStub.withArgs(flag).returns(false);

        await assert.rejects(automationsController.add.query(frame), {
          errorType: 'NotFoundError',
          statusCode: 404,
        });
      });
    }

    for (const count of [0, 49]) {
      it(`creates with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        await automationsController.add.query(frame);
        expect(automationsApi.add).toHaveBeenCalledExactlyOnceWith(payload);
      });
    }

    for (const count of [50, 51]) {
      it(`rejects creation with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        await assert.rejects(automationsController.add.query(frame), {
          errorType: 'HostLimitError',
          statusCode: 403,
          code: 'AUTOMATION_LIMIT_REACHED',
        });
        expect(automationsApi.add).not.toHaveBeenCalled();
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
