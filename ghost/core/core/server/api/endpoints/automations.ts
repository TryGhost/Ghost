import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import * as automationsApi from '../../services/automations/automations-api';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../shared/labs';

const MAX_AUTOMATIONS = 20;

type ReadFrame = Frame<{ data: { id: string } }>;
type EditFrame = Frame<{
  options: { id: string };
  data: { automations?: unknown[] };
}>;

const assertCanAddAutomations = (): void => {
  if (!labs.isSet('automations') || !labs.isSet('automationsPerTier')) {
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
    async query() {
      assertCanAddAutomations();
      await assertNotAddingTooManyAutomations();
      // TODO(NY-1637) Implement this endpoint.
      throw new errors.InternalServerError({
        statusCode: 501,
        code: 'NOT_IMPLEMENTED',
        message: 'Adding automations is not implemented.',
      });
    },
  },

  edit: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    permissions: true,
    async query(frame: EditFrame) {
      return await automationsApi.edit(frame.options.id, frame.data?.automations?.[0]);
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
} satisfies Controller<{
  browse: Frame;
  read: ReadFrame;
  add: Frame;
  edit: EditFrame;
  poll: Frame;
}>;
