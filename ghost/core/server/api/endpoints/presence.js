const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const labs = require('../../../shared/labs');
const editorPresence = require('../../services/editor-presence').default;

const messages = {
  notFound: 'Resource not found',
  staffOnly: 'Presence requires a staff user',
};

/**
 * The route exists only while polling is enabled, so a disabled flag reads as
 * 404 and clients stop. Integration keys carry no user and cannot be present.
 * @param {import('@tryghost/api-framework').Frame} frame
 */
async function requireStaffUser(frame) {
  if (!labs.isSet('editorPresencePolling')) {
    throw new errors.NotFoundError({ message: tpl(messages.notFound) });
  }
  if (!frame.options.context.user) {
    throw new errors.NoPermissionError({ message: tpl(messages.staffOnly) });
  }
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'presence',

  poll: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: requireStaffUser,
    query(frame) {
      return editorPresence.service.poll(frame.options.context.user, frame.data.presence?.[0]);
    },
  },

  leave: {
    headers: {
      cacheInvalidate: false,
    },
    statusCode: 204,
    permissions: requireStaffUser,
    query(frame) {
      return editorPresence.service.leave(frame.options.context.user, frame.data.presence?.[0]);
    },
  },
};

module.exports = controller;
