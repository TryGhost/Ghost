import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

type ReadFrame = Frame<{ options: { id: string; run_id: string } }>;

const controller = {
  docName: 'automation_run_history',
  read: {
    headers: { cacheInvalidate: false },
    options: ['id', 'run_id'],
    validation: { options: { id: { required: true }, run_id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: ReadFrame) {
      return await automationsApi.readRunHistory(frame.options.id, frame.options.run_id);
    },
  },
} satisfies Controller<{ read: ReadFrame }>;

module.exports = controller;
