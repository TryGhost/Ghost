const { addTable } = require('../../utils');

module.exports = addTable('tier_requirement_tiers', {
  requirement: {
    type: 'string',
    maxlength: 50,
    nullable: false,
    references: 'tier_requirements.requirement',
    cascadeDelete: true,
  },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'products.id',
    cascadeDelete: true,
  },
  '@@PRIMARY_KEY@@': ['requirement', 'product_id'],
});
