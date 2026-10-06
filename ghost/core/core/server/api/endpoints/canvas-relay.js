const errors = require('@tryghost/errors');
const permissions = require('../../services/permissions');
const relay = require('./utils/canvas-relay.ts');

const staffPermissions = async (frame) => {
  if (
    !frame.options.context.user ||
    frame.options.context.api_key ||
    frame.original.session?.user_id !== frame.options.context.user
  ) {
    throw new errors.NoPermissionError({ message: 'Pairing requires a signed-in staff session.' });
  }
  await permissions.canThis(frame.options.context).add.theme();
};
const validation = (frame) => {
  const input = frame.data.canvasRelay?.[0];
  if (
    !input ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.session)
  ) {
    throw new errors.ValidationError({ message: 'A valid canvas session is required.' });
  }
};

/** @type {import('@tryghost/api-framework').Controller} */
module.exports = {
  docName: 'canvasRelay',
  read: {
    headers: { cacheInvalidate: false },
    permissions: staffPermissions,
    query() {
      const configured = relay.relayConfig();
      return {
        canvasRelay: configured ? { url: configured.url, tenant: configured.tenant } : null,
      };
    },
  },
  pair: {
    headers: { cacheInvalidate: false },
    permissions: staffPermissions,
    validation(frame) {
      validation(frame);
      if (!/^[A-F0-9]{8}$/.test(frame.data.canvasRelay[0].code)) {
        throw new errors.ValidationError({ message: 'A valid pairing code is required.' });
      }
    },
    async query(frame) {
      if (!relay.relayConfig()) {
        throw new errors.NotFoundError({ message: 'Canvas relay is unavailable.' });
      }
      const input = frame.data.canvasRelay[0];
      const connection = relay.editorConnection(input.session, frame.options.context.user);
      try {
        await relay.relayEditorRequest(connection, '/pairing/approve', { code: input.code });
      } catch (error) {
        throw new errors.ValidationError({
          message: `The agent could not be paired: ${error.message}`,
        });
      }
      frame.setHeader('Cache-Control', 'no-store');
      return { canvasRelay: connection };
    },
  },
  revoke: {
    headers: { cacheInvalidate: false },
    permissions: staffPermissions,
    validation,
    async query(frame) {
      if (!relay.relayConfig()) {
        throw new errors.NotFoundError({ message: 'Canvas relay is unavailable.' });
      }
      const connection = relay.editorConnection(
        frame.data.canvasRelay[0].session,
        frame.options.context.user,
      );
      await relay.relayEditorRequest(connection, '/revoke');
      return { canvasRelay: { status: 'revoked' } };
    },
  },
};
