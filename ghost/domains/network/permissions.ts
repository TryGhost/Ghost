import { definePermissions } from '@tryghost/kernel/domains/definitions';

export default definePermissions({
  objects: {
    recommendation: ['browse', 'read', 'edit', 'add', 'destroy'],
  },
  roles: {
    Administrator: { recommendation: 'all' },
    'Admin Integration': { recommendation: 'all' },
    Editor: { recommendation: ['browse', 'read'] },
    Author: { recommendation: ['browse', 'read'] },
    Contributor: { recommendation: ['browse', 'read'] },
    'Super Editor': { recommendation: ['browse', 'read'] },
  },
});
