const ghostBookshelf = require('./base');

const Offer = ghostBookshelf.Model.extend({
    tableName: 'offers',

    product() {
        return this.belongsTo('Product', 'product_id', 'id');
    }
});

module.exports = {
    Offer: ghostBookshelf.model('Offer', Offer)
};
