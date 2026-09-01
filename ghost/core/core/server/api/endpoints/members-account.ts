const membersService = require('../../services/members');

/**
 * A member's own record, as they read and change it themselves.
 *
 * Who is asking comes from the session the route resolves before this runs, so a
 * request with no signed-in member reaches here with nobody attached and is
 * answered with nothing rather than an error — a themed page asks this on every
 * view, and most of those views have no member.
 *
 * Nothing here decides anything about a member. What they are shown and what they
 * may change belong to `services/members/account`; this says which of those two
 * questions is being asked.
 */

interface Frame {
  data: Record<string, unknown>;
  options: {
    context?: {
      member?: { id: string } | null;
    };
  };
}

const memberOf = (frame: Frame) => frame.options?.context?.member ?? null;

/** Nobody signed in is not an error, and has no body to send. */
const emptyWhenNobody = (result: unknown) => (result === null ? 204 : 200);

const controller = {
  docName: 'members_account',

  read: {
    headers: { cacheInvalidate: false },
    permissions: false,
    statusCode: emptyWhenNobody,
    query(frame: Frame) {
      const member = memberOf(frame);
      return member ? membersService.api.account.read({ id: member.id }) : null;
    },
  },

  // `update` rather than `edit`: the framework reserves `edit` for the Admin API's
  // enveloped bodies, and this endpoint has always taken a bare one. The members
  // endpoints name their own verbs for the same reason.
  update: {
    headers: { cacheInvalidate: false },
    permissions: false,
    statusCode: emptyWhenNobody,
    query(frame: Frame) {
      const member = memberOf(frame);
      // The whole body goes to the service, which owns what a member may set about
      // themselves and ignores the rest. Nothing is picked here: which fields are
      // writable is not a question about HTTP.
      return member ? membersService.api.account.edit(frame.data, { id: member.id }) : null;
    },
  },
};

export default controller;
module.exports = controller;
