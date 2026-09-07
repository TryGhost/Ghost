const membersService = require('../../services/members');

/**
 * A member's own record, as the member themselves.
 *
 * The route establishes who is asking before this runs, and answers for an
 * unknown caller itself, so there is always a member here. What to load about them
 * is decided here rather than there, because this is what knows what it renders.
 *
 * `docName` is this endpoint's own, not the Admin API's `members`, because the two
 * describe the same record to different audiences and a serializer is chosen by
 * that name. Sharing it would mean sharing the shape.
 */

interface Frame {
  data: Record<string, unknown>;
  options: {
    context?: { member?: { id: string; email: string } | null };
  };
}

const memberOf = (frame: Frame) => frame.options?.context?.member ?? null;

const controller = {
  docName: 'members_account',

  read: {
    headers: { cacheInvalidate: false },
    permissions: false,
    query(frame: Frame) {
      return membersService.api.account.read(memberOf(frame)!.id);
    },
  },

  /**
   * Let Ghost email this member again.
   *
   * Under the account rather than as a resource of its own: being emailable is a
   * fact about a member, and the only person who can restore it here is the member
   * themselves.
   */
  destroySuppression: {
    statusCode: 204,
    headers: { cacheInvalidate: false },
    permissions: false,
    query(frame: Frame) {
      const member = memberOf(frame)!;
      return membersService.api.account.allowEmail(member.id, member.email);
    },
  },

  // `update` rather than `edit`: the framework reserves `edit` for the Admin API's
  // enveloped bodies, and this request has always carried a bare one. The
  // members-facing gift endpoints name their own verbs for the same reason.
  update: {
    headers: { cacheInvalidate: false },
    permissions: false,
    query(frame: Frame) {
      return membersService.api.account.edit(frame.data, memberOf(frame)!.id);
    },
  },
};

export default controller;
module.exports = controller;
