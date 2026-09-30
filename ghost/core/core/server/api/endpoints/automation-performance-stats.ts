import * as automationsApi from '../../services/automations/automations-api';

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'automation_performance_stats',
  read: {
    headers: { cacheInvalidate: false },
    data: ['id'],
    options: ['timezone'],
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { data: { id: string }; options: { timezone?: unknown } }) {
      return await automationsApi.readPerformanceStats(frame.data.id, frame.options);
    },
  },
};

module.exports = controller;
