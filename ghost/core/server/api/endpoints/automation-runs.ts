import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

type BrowseFrame = Frame<{ options: { id: string } & Record<string, unknown> }>;

const controller = {
  docName: 'automation_runs',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id', 'status', 'date_from', 'date_to', 'timezone', 'order', 'cursor', 'search'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'automations', method: 'read' },
    async query(frame: BrowseFrame) {
      return await automationsApi.browseRuns(frame.options.id, frame.options);
    },
  },
} satisfies Controller<{ browse: BrowseFrame }>;

module.exports = controller;
