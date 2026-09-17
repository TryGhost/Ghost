import * as automationsApi from '../../services/automations/automations-api';

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'automation_status_stats',
  read: {
    headers: { cacheInvalidate: false },
    data: ['id'],
    options: ['search', 'cursor'],
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { data: { id: string }; options: { search?: unknown; cursor?: unknown } }) {
      return await automationsApi.readStatusStats(frame.data.id, frame.options);
    },
  },
};

module.exports = controller;
