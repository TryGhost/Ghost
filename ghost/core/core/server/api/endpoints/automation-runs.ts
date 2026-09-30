import * as automationsApi from '../../services/automations/automations-api';

const controller = {
  docName: 'automation_runs',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id', 'status', 'date_from', 'date_to', 'timezone', 'order', 'cursor'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { options: { id: string } & Record<string, unknown> }) {
      return await automationsApi.browseRuns(frame.options.id, frame.options);
    },
  },
};

module.exports = controller;
