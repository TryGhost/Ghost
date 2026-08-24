const { createAddColumnMigration } = require('../../utils');

// A featured signup offer is rendered directly on Portal's signup page instead
// of being reachable only via its private URL. Link-only remains the default
// for every offer; at most one active featured offer may exist per
// tier + cadence (enforced in the offers service, not the schema).
module.exports = createAddColumnMigration('offers', 'featured', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
