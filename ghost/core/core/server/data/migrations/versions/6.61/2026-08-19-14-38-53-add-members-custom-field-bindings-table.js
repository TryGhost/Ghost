const { addTable } = require('../../utils');

module.exports = addTable('members_custom_field_bindings', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'products.id',
    cascadeDelete: true,
  },
  port: { type: 'string', maxlength: 191, nullable: false },
  custom_field_key: {
    type: 'string',
    maxlength: 191,
    nullable: false,
    references: 'members_custom_fields.key',
    cascadeDelete: true,
  },
  active: { type: 'boolean', nullable: false, defaultTo: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
  '@@UNIQUE_CONSTRAINTS@@': [
    { columns: ['product_id', 'port'], indexName: 'members_custom_field_bindings_unique' },
  ],
  '@@INDEXES@@': [['custom_field_key']],
});
