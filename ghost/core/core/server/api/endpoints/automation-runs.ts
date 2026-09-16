import * as automationsApi from '../../services/automations/automations-api';

const controller = {
  docName: 'automation_runs',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id', 'status', 'order'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { options: { id: string; status?: unknown; order?: unknown } }) {
      const { id, status, order } = frame.options;
      return automationsApi.browseRuns(id, status, order);
    },
  },
};

module.exports = controller;
