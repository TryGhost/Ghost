import * as automationsApi from '../../services/automations/automations-api';

const controller = {
  docName: 'automation_runs',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id', 'status'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { options: { id: string; status?: unknown } }) {
      return { data: await automationsApi.browseRuns(frame.options.id, frame.options.status) };
    },
  },
};

module.exports = controller;
