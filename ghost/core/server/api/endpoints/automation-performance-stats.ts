import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

type ReadFrame = Frame<{ data: { id: string } }>;

const controller = {
  docName: 'automation_performance_stats',
  read: {
    headers: { cacheInvalidate: false },
    data: ['id'],
    options: ['date_from', 'date_to', 'timezone'],
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: ReadFrame) {
      return await automationsApi.readPerformanceStats(frame.data.id, frame.options);
    },
  },
} satisfies Controller<{ read: ReadFrame }>;

module.exports = controller;
