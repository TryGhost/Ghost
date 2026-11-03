import fs from 'node:fs';
import path from 'node:path';
import { IncorrectUsageError } from '@tryghost/errors';
import { defineService } from '../../../kernel/define-service';
import { createStaffEmailTemplateFiles } from './email-template-files';

const TEMPLATE_DIRECTORY = path.join(__dirname, 'email-templates');

// The event bus cannot remove a handler, so a failed subscribeEvents() leaves the
// handlers it already registered. Refuse a retry instead of registering them twice.
let partiallySubscribed = false;

export default defineService('Staff', () => {
  if (partiallySubscribed) {
    throw new IncorrectUsageError({
      message:
        'Staff notifications were partly subscribed by an earlier failed init(). Restart Ghost.',
    });
  }

  const StaffService = require('./staff-service');
  const DomainEvents = require('@tryghost/domain-events');
  const logging = require('@tryghost/logging');
  const labs = require('../../../shared/labs');
  const models = require('../../models');
  const memberAttribution = require('../member-attribution').default;
  const { GhostMailer } = require('../../lib/mail');
  const settingsCache = require('../../../shared/settings-cache');
  const urlUtils = require('../../../shared/url-utils').default;
  const { blogIcon } = require('../../lib/image');
  const settingsHelpers = require('../settings-helpers');
  const {
    MemberCreatedEvent,
    SubscriptionActivatedEvent,
    SubscriptionCancelledEvent,
  } = require('../../../shared/events');
  const MilestoneCreatedEvent = require('../milestones/milestone-created-event');

  const service = new StaffService({
    logging,
    models,
    mailer: new GhostMailer(),
    settingsHelpers,
    settingsCache,
    urlUtils,
    blogIcon,
    DomainEvents,
    // Boot awaits member attribution first; Staff keeps this instance.
    memberAttributionService: memberAttribution.service,
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

  try {
    service.subscribeEvents();
  } catch (error) {
    partiallySubscribed = true;
    throw error;
  }
  return service;
});
