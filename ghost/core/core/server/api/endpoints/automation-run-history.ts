import * as automationsApi from '../../services/automations/automations-api';

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'automation_run_history',
  read: {
    headers: { cacheInvalidate: false },
    options: ['id', 'run_id'],
    validation: { options: { id: { required: true }, run_id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: { options: { id: string; run_id: string } }) {
      return await automationsApi.readRunHistory(frame.options.id, frame.options.run_id);
    },
  },
};

module.exports = controller;
