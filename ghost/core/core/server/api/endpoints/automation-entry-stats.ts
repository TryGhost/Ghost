import * as automationsApi from '../../services/automations/automations-api';

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'automation_entry_stats',
  read: {
    headers: { cacheInvalidate: false },
    data: ['id'],
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { data: { id: string } }) {
      return await automationsApi.readEntryStats(frame.data.id);
    },
  },
};

module.exports = controller;
