const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const messages = {
  invalidAudience:
    'audience must be a single lowercase identifier of letters, digits, ".", "_", ":" or "-".',
};

// We only allow a single audience so commas are excluded, e.g. `support,billing` is rejected
const AUDIENCE_FORMAT = /^[a-z0-9][a-z0-9._:-]{0,63}$/;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'identities',
  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['audience'],
    validation(frame) {
      const { audience } = frame.options;

      // The framework's option rules only check `values`, which accepts comma lists and arrays (a repeated `?audience=`)
      if (
        audience !== undefined &&
        (typeof audience !== 'string' || !AUDIENCE_FORMAT.test(audience))
      ) {
        throw new errors.ValidationError({ message: tpl(messages.invalidAudience) });
      }
    },
    permissions: true,
    async query(frame) {
      const IdentityTokenService = require('../../services/identity-tokens');

      let role = null;
      try {
        await frame.user.load(['roles']);
        role = frame.user.relations.roles.toJSON()[0].name;
      } catch (err) {
        logging.warn('Could not load role for identity');
      }

      const token = await IdentityTokenService.instance.getTokenForUser(
        frame.user.get('email'),
        role,
        frame.options.audience,
      );

      return { token };
    },
  },
};

module.exports = controller;
