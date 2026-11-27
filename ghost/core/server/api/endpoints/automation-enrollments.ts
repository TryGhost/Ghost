import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

type BrowseFrame = Frame<{ options: { id: string } }>;

const controller = {
  docName: 'automation_enrollments',
  browse: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'members', method: 'read' },
    async query(frame: BrowseFrame) {
      return await automationsApi.getMemberEnrollments(frame.options.id);
    },
  },
} satisfies Controller<{ browse: BrowseFrame }>;

module.exports = controller;
