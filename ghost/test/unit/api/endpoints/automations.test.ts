import type {
  AddAutomationData,
  EditAutomationData,
} from '../../../../core/server/services/automations/automations-schemas';
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
    edit: vi.fn(),
    getNumberOfAutomations: vi.fn(),
  };
});

describe('Automations controller', function () {
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
    it('returns the automation with trigger rules', async function () {
      const automation = {
        id: '64b6f7b7c8f1a2b3c4d5e6f7',
        slug: null,
        name: 'Selected tier automation',
        description: '',
        status: 'inactive' as const,
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
        trigger_rules: [
          {
            trigger_type: 'paid_subscription_started' as const,
            scope: 'specific_paid_tier' as const,
            product_id: '64b6f7b7c8f1a2b3c4d5e6f8',
            direction: null,
          },
        ],
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
      trigger_rules: [
        { trigger_type: 'free_signup' as const, scope: null, product_id: null, direction: null },
      ],
      status: 'inactive' as const,
      actions: [],
      edges: [],
    };
    const frame = new Frame<{ data: AddAutomationData }>({
      body: { automations: [payload] },
    });
    frame.data = payload;

    let labsIsSetStub: sinon.SinonStub;

    beforeEach(function () {
      labsIsSetStub = sinon.stub(labs, 'isSet').returns(true);
    });

    it('adds and returns new automations', async function () {
      const automation = {
        ...payload,
        id: '64b6f7b7c8f1a2b3c4d5e6f7',
        slug: null,
        status: 'inactive' as const,
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
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

    it('returns 404 when automations labs flag is disabled', async function () {
      labsIsSetStub.withArgs('automations').returns(false);

      await assert.rejects(automationsController.add.query(frame), {
        errorType: 'NotFoundError',
        statusCode: 404,
      });
    });

    for (const count of [0, 49]) {
      it(`creates with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        vi.mocked(automationsApi.add).mockResolvedValue({
          ...payload,
          id: 'id',
          slug: null,
          created_at: '',
          updated_at: '',
        });
        await automationsController.add.query(frame);
        expect(automationsApi.add).toHaveBeenCalledExactlyOnceWith(payload);
      });
    }

    for (const count of [50, 51]) {
      it(`rejects creation with ${count} automations`, async function () {
        vi.mocked(automationsApi.getNumberOfAutomations).mockResolvedValue(count);
        vi.mocked(automationsApi.add).mockResolvedValue({
          ...payload,
          id: 'id',
          slug: null,
          created_at: '',
          updated_at: '',
        });
        await assert.rejects(automationsController.add.query(frame), {
          errorType: 'HostLimitError',
          statusCode: 403,
          code: 'AUTOMATION_LIMIT_REACHED',
        });
        expect(automationsApi.add).not.toHaveBeenCalled();
      });
    }
  });

  describe('edit', function () {
    it('passes trigger rules to the service and returns its result', async function () {
      const trigger_rules = [
        {
          trigger_type: 'paid_subscription_started' as const,
          scope: 'any_paid_tier' as const,
          product_id: null,
          direction: null,
        },
      ];
      const payload = {
        status: 'inactive' as const,
        actions: [],
        edges: [],
        trigger_rules,
      };
      const automation = {
        id: 'automation-id',
        slug: null,
        name: 'Edited',
        description: '',
        status: 'inactive' as const,
        actions: [],
        edges: [],
        trigger_rules,
        created_at: '',
        updated_at: '',
      };
      vi.mocked(automationsApi.edit).mockResolvedValue(automation);
      const frame = new Frame<{ options: { id: string }; data: EditAutomationData }>({
        params: { id: automation.id },
        body: { automations: [payload] },
      });
      frame.configure(automationsController.edit);
      frame.data = payload;
      const result = await automationsController.edit.query(frame);
      expect(automationsApi.edit).toHaveBeenCalledExactlyOnceWith(automation.id, {
        status: 'inactive',
        actions: [],
        edges: [],
        trigger_rules,
      });
      assert.strictEqual(result, automation);
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
