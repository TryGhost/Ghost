import * as automationsApi from '../../services/automations/automations-api';

const controller = {
  docName: 'automation_runs',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id', 'status', 'order', 'cursor', 'search'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: {
      options: {
        id: string;
        status?: unknown;
        order?: unknown;
        cursor?: unknown;
        search?: unknown;
      };
    }) {
      const { id, status, order, cursor, search } = frame.options;
      return await automationsApi.browseRuns(id, status, order, cursor, search);
    },
  },
};

module.exports = controller;
