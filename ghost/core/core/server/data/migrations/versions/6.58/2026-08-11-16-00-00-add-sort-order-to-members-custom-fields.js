const { createAddColumnMigration } = require('../../utils');

// The publisher's order for their custom fields. Every existing row takes the
// default, so a site that has never reordered ends up with one value repeated —
// which is why the read order tie-breaks on created_at: until the first reorder
// writes real ranks, the fields still come out in the order they were created.
// That is what makes this a column addition rather than a backfill.
module.exports = createAddColumnMigration('members_custom_fields', 'sort_order', {
  type: 'integer',
  nullable: false,
  unsigned: true,
  defaultTo: 0,
});
