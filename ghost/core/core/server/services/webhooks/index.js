// Composition root for the webhook dispatch pipeline: builds the
// serialize → payload → trigger chain and registers the model-event
// listeners. Requires are deferred until listen() runs so the model layer
// isn't loaded before boot wires it.
module.exports = {
  listen() {
    const models = require('../../models');
    const limitService = require('../../services/limits');
    const events = require('../../lib/common/events');
    const urlService = require('../url');
    const membersMetafields = require('../members-metafields');
    const createSerialize = require('./serialize');
    const createPayload = require('./payload');
    const WebhookTrigger = require('./webhook-trigger');
    const registerListeners = require('./listen');

    // Built here rather than reached for inside the serializer: the metafield services
    // exist only once boot has connected the database, and this is the only place in the
    // webhook pipeline that knows boot has already happened.
    const readMemberMetafields = async (memberId) => {
      const byMember = await membersMetafields.readValuesForMembers(
        { definitions: membersMetafields.definitions, values: membersMetafields.values },
        [memberId],
        membersMetafields.ADMIN,
      );
      return byMember?.get(memberId) ?? null;
    };

    const serialize = createSerialize({ urlService, readMemberMetafields });
    const payload = createPayload({ serialize });
    const trigger = new WebhookTrigger({ models, payload, limitService });

    registerListeners({ events, trigger });
  },
};
