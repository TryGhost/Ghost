const config = require('../../../shared/config');

let cache = null;

function matches(value, actionType) {
  if (value === 'all') {
    return true;
  }
  return Array.isArray(value) ? value.includes(actionType) : value === actionType;
}

function load() {
  if (cache) {
    return cache;
  }

  // Require the fixtures JSON directly rather than data/schema/fixtures (the
  // index), whose fixture-manager pulls in the models, which require the
  // permissions service - a circular dependency. The JSON alone has no cycle.
  // config.get('paths').fixtures honours the test fixtures path, matching
  // data/schema/fixtures/index.js.
  const fixtures = require(config.get('paths').fixtures);

  const all = fixtures.models
    .find((model) => model.name === 'Permission')
    .entries.map((entry) => ({action_type: entry.action_type, object_type: entry.object_type}));
  const relation = fixtures.relations.find(
    (rel) => rel.from.model === 'Role' && rel.to.model === 'Permission',
  );

  const byRole = new Map();
  for (const [roleName, objects] of Object.entries(relation.entries)) {
    byRole.set(
      roleName,
      all.filter(
        (perm) => perm.object_type in objects && matches(objects[perm.object_type], perm.action_type),
      ),
    );
  }

  cache = {all, byRole};
  return cache;
}

module.exports = {
  forRoles(roleNames) {
    // Built lazily on first call and cached, so the fixtures JSON is parsed once.
    const {byRole} = load();

    const seen = new Set();
    const permissions = [];

    for (const roleName of roleNames) {
      const rolePermissions = byRole.get(roleName) || [];
      for (const perm of rolePermissions) {
        const key = `${perm.action_type}:${perm.object_type}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        permissions.push(perm);
      }
    }

    return permissions;
  },

  all() {
    return load().all;
  },
};
