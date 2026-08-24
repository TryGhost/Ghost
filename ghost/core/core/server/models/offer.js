const ghostBookshelf = require('./base');

const Offer = ghostBookshelf.Model.extend({
  tableName: 'offers',

  actionsCollectCRUD: true,
  actionsResourceType: 'offer',

  defaults: {
    redemption_type: 'signup',
    featured: false,
  },

  product() {
    return this.belongsTo('Product', 'product_id', 'id');
  },
});

module.exports = {
  Offer: ghostBookshelf.model('Offer', Offer),
};
