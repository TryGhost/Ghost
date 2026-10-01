import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

const controller: Controller = {
  docName: 'automation_performance_stats',
  read: {
    headers: { cacheInvalidate: false },
    data: ['id'],
    options: ['date_from', 'date_to', 'timezone'],
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: Frame) {
      return await automationsApi.readPerformanceStats(frame.data.id as string, frame.options);
    },
  },
};

module.exports = controller;
