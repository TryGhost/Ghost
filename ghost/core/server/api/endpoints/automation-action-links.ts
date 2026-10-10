import type { Controller, Frame } from '@tryghost/api-framework';
import * as automationsApi from '../../services/automations/automations-api';

type BrowseFrame = Frame<{
  options: {
    automation_id: string;
    action_id: string;
  };
}>;

const controller = {
  docName: 'automation_action_links',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['automation_id', 'action_id'],
    validation: {
      options: {
        automation_id: {
          required: true,
        },
        action_id: {
          required: true,
        },
      },
    },
    permissions: {
      docName: 'automations',
      method: 'read',
    },
    async query(frame: BrowseFrame) {
      return {
        data: await automationsApi.browseActionLinks(
          frame.options.automation_id,
          frame.options.action_id,
        ),
      };
    },
  },
} satisfies Controller<{ browse: BrowseFrame }>;

module.exports = controller;
