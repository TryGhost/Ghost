import { MEMBERS, definitions } from '../../services/members-metafields';

/**
 * The extra fields a publisher has defined, as a member's own client reads them.
 *
 * The same definitions Admin reads, answering a different audience. A member is
 * shown what there is to fill in; what they have filled in is on their own record,
 * not here, because the two change on different schedules and a client caches them
 * differently.
 *
 * Signed in, but not about any particular member: every member of a site is offered
 * the same fields. The route resolves who is asking and refuses an unknown caller,
 * so there is always a member by the time this runs.
 */

interface Frame {
  options: {
    namespace: string;
  };
}

const controller = {
  // The Admin resource's name, so the response Portal reads is the one Admin's
  // serializer already produces. Only who may ask differs, and that is the route's
  // business rather than the response's.
  docName: 'members_metafields',

  browse: {
    headers: { cacheInvalidate: false },
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions: false,
    query(frame: Frame) {
      // No `filter`, which Admin offers: whether a field is archived is a
      // publisher's business, and a member is only ever shown what they can still
      // fill in.
      return definitions!.browse({ namespace: frame.options.namespace }, MEMBERS);
    },
  },
};

export default controller;
module.exports = controller;
