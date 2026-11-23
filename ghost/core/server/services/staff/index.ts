import fs from 'node:fs';
import path from 'node:path';
import { defineService } from '../../../../bootstrap/transition/define-service';
import memberAttribution from '../member-attribution';
import { createStaffEmailTemplateFiles } from './email-template-files';

const TEMPLATE_DIRECTORY = path.join(__dirname, 'email-templates');

// staff-service.js has no types yet. This is what its readers and listeners use.
type Staff = {
  readonly emails: {
    renderHTML(template: string, data: unknown): Promise<string>;
    renderText(template: string, data: unknown): Promise<string>;
  } & Record<string, (...args: never[]) => unknown>;
  readonly memberAttributionService: unknown;
  notify(event: unknown, published: unknown): Promise<void>;
};

// The events Staff sends a notification for. Declared, so that the application listens from
// boot and builds the service when the first one arrives.
const {
  MemberCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
} = require('../../../shared/events');
const MilestoneCreatedEvent = require('../milestones/milestone-created-event');

export default defineService('Staff', {
  needs: { memberAttribution },
  create: ({ memberAttribution: memberAttributionService }): Staff => {
    const StaffService = require('./staff-service');
    const logging = require('@tryghost/logging');
    const labs = require('../../../shared/labs');
    const models = require('../../models');
    const { GhostMailer } = require('../../lib/mail');
    const settingsCache = require('../../../shared/settings-cache');
    const urlUtils = require('../../../shared/url-utils').default;
    const { blogIcon } = require('../../lib/image');
    const settingsHelpers = require('../settings-helpers');

    return new StaffService({
      logging,
      models,
      mailer: new GhostMailer(),
      settingsHelpers,
      settingsCache,
      urlUtils,
      blogIcon,
      memberAttributionService,
      labs,
      events: {
        MemberCreatedEvent,
        SubscriptionActivatedEvent,
        SubscriptionCancelledEvent,
        MilestoneCreatedEvent,
      },
      // Reads are confined to the fixed staff template files in this directory.
      templateFiles: createStaffEmailTemplateFiles({
        readFile: (file) => fs.promises.readFile(path.join(TEMPLATE_DIRECTORY, file), 'utf8'),
        readFileSync: (file) => fs.readFileSync(path.join(TEMPLATE_DIRECTORY, file), 'utf8'),
      }),
    });
  },
  listeners: [
    MemberCreatedEvent,
    SubscriptionActivatedEvent,
    SubscriptionCancelledEvent,
    MilestoneCreatedEvent,
  ].map((event) => ({
    event,
    handle: (service: Staff, published: unknown) => service.notify(event, published),
  })),
});
