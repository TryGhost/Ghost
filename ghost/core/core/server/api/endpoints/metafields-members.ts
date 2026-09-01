import { definitions } from '../../services/members-custom-fields';

/**
 * The fields a publisher has defined, as a member's own client reads them.
 *
 * The same definitions service Admin reads, answering a different audience. A
 * member is shown what to fill in: what a field is called and what kind of thing
 * it holds. What a field made of several parts is made of comes from the catalog
 * both sides share rather than from here, so the two cannot disagree about what a
 * valid answer looks like.
 *
 * Authenticated as a member but not about any particular member: every member of
 * a site is offered the same fields. What a given member has answered is on their
 * own record, not here.
 */

/** @type {import('@tryghost/api-framework').Controller} */
interface Frame {
  options: { namespace: string };
}

const controller = {
  // The Admin resource's name, because it is the same resource and the same shape.
  // Only who may ask differs, and that is the route's business rather than the
  // response's. A member seeing `status` or when a field was made costs nothing and
  // saves maintaining a second shape for a distinction that does not exist yet.
  docName: 'members_metafields',

  browse: {
    headers: { cacheInvalidate: false },
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions: false,
    query(frame: Frame) {
      // No `filter`, which Admin offers: archived fields are a publisher's business,
      // and a member is only ever shown what they can still fill in.
      return definitions!.browse({ namespace: frame.options.namespace });
    },
  },
};

export default controller;
module.exports = controller;
