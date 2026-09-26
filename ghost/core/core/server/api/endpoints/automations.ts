import errors from '@tryghost/errors';
import * as automationsApi from '../../services/automations/automations-api';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../shared/labs';

type ReadFrame = {
  data: {
    id: string;
  };
};

type EditFrame = {
  options: {
    id: string;
  };
  data?: {
    automations?: unknown[];
  };
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
};
