// Composition root for the webhook dispatch pipeline: builds the
// serialize → payload → trigger chain and registers the model-event
// listeners. Requires are deferred until listen() runs so the model layer
// isn't loaded before boot wires it.
module.exports = {
  listen() {
    const models = require('../../models');
    const { limitService } = require('../../services/limits');
    const events = require('../../lib/common/events');
    const urlService = require('../url');
    const membersService = require('../members');
    const { ADMIN } = require('../members-metafields');
    const createSerialize = require('./serialize');
    const createPayload = require('./payload');
    const WebhookTrigger = require('./webhook-trigger');
    const registerListeners = require('./listen');

    // Looked up when an event arrives: the members service starts alongside this one.
    const readMemberMetafields = (memberId) =>
      membersService.api.memberBREADService.readMetafieldsForMember(memberId, ADMIN);

    const serialize = createSerialize({ urlService, readMemberMetafields });
    const payload = createPayload({ serialize });
    const trigger = new WebhookTrigger({ models, payload, limitService });

    registerListeners({ events, trigger });
  },
};
