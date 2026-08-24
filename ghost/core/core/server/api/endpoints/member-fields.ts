import { definitions } from '../../services/members-custom-fields';

const permissionsService = require('../../services/permissions');

interface Frame {
  options: { context: unknown; [key: string]: unknown };
}

/**
 * Every member field that has been declared, whichever namespace declared it.
 *
 * Separate from `members_custom_fields` because knowing a field exists and being allowed
 * to manage it are different things. This is what a surface reads to offer a field: the
 * filter picker, the import mapping targets, a column. The publisher's own endpoint stays
 * the one that renames, archives and deletes, and it only ever sees their namespace — a
 * field Ghost declared appearing in a list it cannot be managed from would be worse than
 * not appearing at all.
 *
 * Read-only, and deliberately so. A field outside the publisher's namespace is declared by
 * whatever owns it, not through the API.
 */

// No Bookshelf model backs this resource, so the permission is checked explicitly. It is
// the custom field browse permission: this reads the same definitions, just without
// narrowing them to the publisher's own.
function canThis(frame: Frame) {
  return permissionsService.canThis(frame.options.context);
}

const controller = {
  docName: 'members_fields',

  browse: {
    headers: { cacheInvalidate: false },
    // `filter` narrows by status the same way the publisher's browse does; archived
    // fields are hidden by default, and a caller that still has a filter saved against
    // one asks for both. No pagination or order: the list is small and global, and comes
    // back in the publisher's order.
    options: ['filter'],
    permissions(frame: Frame) {
      return canThis(frame).browse.member_custom_field();
    },
    query(frame: Frame) {
      return definitions!.browseEveryNamespace({
        filter: frame.options.filter as string | undefined,
      });
    },
  },
};

module.exports = controller;
