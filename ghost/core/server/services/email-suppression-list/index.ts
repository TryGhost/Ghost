import { defineService } from '../../../kernel/define-service';

export default defineService('Email suppression list', () => {
  const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');
  const MailgunClient = require('../../lib/mailgun/mailgun-client');
  const { EmailBouncedEvent } = require('../email-service/events/email-bounced-event');
  const { SpamComplaintEvent } = require('../email-service/events/spam-complaint-event');
  const models = require('../../models');

  const service = new MailgunEmailSuppressionList({
    Suppression: models.Suppression,
    // The client reads config and settings again for each provider operation.
    apiClient: new MailgunClient({
      config: require('../../../shared/config'),
      settings: require('../../../shared/settings-cache'),
    }),
    db: require('../../data/db'),
    logging: require('@tryghost/logging'),
    domainEvents: require('@tryghost/domain-events'),
    EmailBouncedEvent,
    SpamComplaintEvent,
  });
  // Last, so a failed construction leaves nothing registered. A failed
  // registration deactivates its own handlers before rethrowing.
  service.subscribe();
  return service;
});
