import { postAccess } from '../../services/members/access-context';

const permissions = require('../../services/permissions');

/** @type {import('@tryghost/api-framework').Controller} */
module.exports = {
  docName: 'post_access',
  browse: {
    headers: { cacheInvalidate: false },
    permissions(frame: { options: { context: unknown } }) {
      return permissions.canThis(frame.options.context).browse.post();
    },
    query(frame: { data: { post_access: [{ post_ids?: unknown; member?: unknown }] } }) {
      return postAccess(frame.data.post_access?.[0]);
    },
  },
};
