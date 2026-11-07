import type {
  AddAutomationData,
  EditAutomationData,
} from '../../services/automations/automations-schemas';
import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import * as automationsApi from '../../services/automations/automations-api';
import { benchmarkDrain } from '../../services/automations/benchmark-drain';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../shared/labs';

const MAX_AUTOMATIONS = 50;

type ReadFrame = Frame<{ data: { id: string } }>;
type AddFrame = Frame<{ data: AddAutomationData }>;
type EditFrame = Frame<{
  options: { id: string };
  data: EditAutomationData;
}>;
type BenchmarkFrame = Frame<{
  data: { numberOfRuns: number; steps: Array<'wait' | 'send_email'> };
}>;

const assertCanAddAutomations = (): void => {
  if (!labs.isSet('automations')) {
    throw new errors.NotFoundError({ message: 'Creating automations is not enabled.' });
  }
};

const assertNotAddingTooManyAutomations = async (): Promise<void> => {
  // There's a race condition here: publishers COULD create multiple
  // automations if they hammer this endpoint. This is acceptable because
  // this is a soft limit.
  const numberOfAutomations = await automationsApi.getNumberOfAutomations();
  if (numberOfAutomations >= MAX_AUTOMATIONS) {
    throw new errors.HostLimitError({
      code: 'AUTOMATION_LIMIT_REACHED',
      message: `Cannot create more than ${MAX_AUTOMATIONS} automations.`,
    });
  }
};

export const controller = {
  docName: 'automations',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    async query() {
      if (!labs.isSet('automations')) {
        throw new errors.NotFoundError({
          message: 'Automations are not enabled.',
        });
      }

      return await automationsApi.browse();
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['id'],
    permissions: true,
    async query(frame: ReadFrame) {
      return await automationsApi.read(frame.data.id);
    },
  },

  add: {
    statusCode: 201,
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    async query(frame: AddFrame) {
      assertCanAddAutomations();
      await assertNotAddingTooManyAutomations();
      return await automationsApi.add(frame.data);
    },
  },

  edit: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    permissions: true,
    async query(frame: EditFrame) {
      return await automationsApi.edit(frame.options.id, frame.data);
    },
  },

  poll: {
    statusCode: 204,
    headers: {
      cacheInvalidate: false,
    },
    permissions: {
      docName: 'automations',
      method: 'poll',
    },
    query() {
      automationsApi.requestPoll();
    },
  },

  benchmarkDrain: {
    permissions: { docName: 'automations', method: 'add' },
    data: ['numberOfRuns', 'steps'],
    async query(frame: BenchmarkFrame) {
      const { numberOfRuns, steps } = frame.data;
      if (
        !Number.isSafeInteger(numberOfRuns) ||
        numberOfRuns < 1 ||
        numberOfRuns > 10000 ||
        !Array.isArray(steps) ||
        steps.length < 1 ||
        steps.length > 50 ||
        steps.some((step) => step !== 'wait' && step !== 'send_email')
      ) {
        throw new errors.BadRequestError({
          message: 'Expected numberOfRuns (1–10000) and steps (wait, send_email).',
        });
      }
      const previousBenchmarkFlag = process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN;
      process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN = '1';
      try {
        return await benchmarkDrain({ numberOfRuns, steps });
      } finally {
        if (previousBenchmarkFlag === undefined)
          delete process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN;
        else process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN = previousBenchmarkFlag;
      }
    },
  },
} satisfies Controller<{
  browse: Frame;
  read: ReadFrame;
  add: AddFrame;
  edit: EditFrame;
  poll: Frame;
  benchmarkDrain: BenchmarkFrame;
}>;
