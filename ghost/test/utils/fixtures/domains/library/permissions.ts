import { definePermissions } from '@tryghost/kernel/domains/definitions';

export default definePermissions({
  objects: { book: ['browse', 'lend'] },
  roles: {
    Administrator: { book: 'all' },
    Contributor: { book: ['browse'] },
  },
});
