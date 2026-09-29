import errors from '@tryghost/errors';
import { getService } from '../../services/post-presence';
import {
  bodySchema,
  contextSchema,
  createPresencePoll,
  type PresenceFrame,
} from '../../services/post-presence/poll-presence';
// @ts-expect-error Legacy CommonJS module.
import labs from '../../../shared/labs';
// @ts-expect-error Legacy CommonJS module.
import permissions from '../../services/permissions';
import db from '../../data/db';
import { setIsRoles } from '../../models/role-utils';

const poll = createPresencePoll({
  getService,
  canEdit: (context, id) => permissions.canThis(context).edit.post(id),
  async findResources(resources, user) {
    // Check current authorship so revoked access takes effect on the next poll.
    const query = db
      .knex('posts')
      .select('posts.id', 'posts.type')
      .whereIn(
        'posts.id',
        resources.map((resource) => resource.id),
      );
    const { isOwner, isAdmin, isEitherEditor } = setIsRoles({ user });
    const elevated = isOwner || isAdmin || isEitherEditor;
    if (!elevated) {
      query.whereIn(
        'posts.id',
        db.knex('posts_authors').select('post_id').where('author_id', user.id),
      );
    }
    return await query;
  },
});

export const controller = {
  docName: 'presence',
  poll: {
    headers: { cacheInvalidate: false },
    validation(frame: PresenceFrame) {
      const result = bodySchema.safeParse(frame.data);
      if (!result.success) {
        throw new errors.ValidationError({ message: 'Invalid presence request.' });
      }
      frame.data = result.data;
    },
    async permissions(frame: PresenceFrame) {
      if (!labs.isSet('editorPresence')) {
        throw new errors.NotFoundError({ message: 'Presence is not enabled.' });
      }
      if (!contextSchema.safeParse(frame.options.context).success) {
        throw new errors.NoPermissionError({ message: 'Presence requires a staff session.' });
      }
      await permissions.canThis(frame.options.context).browse.post();
    },
    query(frame: PresenceFrame) {
      return poll(frame);
    },
  },
};
