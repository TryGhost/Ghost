const { addTable } = require('../../utils');

module.exports = addTable('tier_requirement_tiers', {
  port: {
    type: 'string',
    maxlength: 191,
    nullable: false,
    references: 'tier_requirements.port',
    cascadeDelete: true,
  },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'products.id',
    cascadeDelete: true,
  },
  '@@PRIMARY_KEY@@': ['port', 'product_id'],
});
