const fs = require('node:fs');
const path = require('node:path');
const DomainEvents = require('@tryghost/domain-events');
const labs = require('../../../shared/labs');

const TEMPLATE_DIRECTORY = path.join(__dirname, 'email-templates');

class StaffServiceWrapper {
  init() {
    if (this.api) {
      // Prevent creating duplicate DomainEvents subscribers
      return;
    }

    const StaffService = require('./staff-service');
    const { createStaffEmailTemplateFiles } = require('./email-template-files');
    const {
      MemberCreatedEvent,
      SubscriptionActivatedEvent,
      SubscriptionCancelledEvent,
    } = require('../../../shared/events');
    const MilestoneCreatedEvent = require('../milestones/milestone-created-event');

    const logging = require('@tryghost/logging');
    const models = require('../../models');
    const memberAttribution = require('../member-attribution').default;
    const { GhostMailer } = require('../../lib/mail');
    const mailer = new GhostMailer();
    const settingsCache = require('../../../shared/settings-cache');
    const urlUtils = require('../../../shared/url-utils').default;
    const { blogIcon } = require('../../../server/lib/image');
    const settingsHelpers = require('../settings-helpers');

    this.api = new StaffService({
      logging,
      models,
      mailer,
      settingsHelpers,
      settingsCache,
      urlUtils,
      blogIcon,
      DomainEvents,
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

    this.api.subscribeEvents();
  }
}

module.exports = new StaffServiceWrapper();
