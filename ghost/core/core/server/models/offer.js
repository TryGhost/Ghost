module.exports = function (ghostBookshelf) {
    const Offer = ghostBookshelf.Model.extend({
        tableName: 'offers',

        actionsCollectCRUD: true,
        actionsResourceType: 'offer',

        defaults: {
            redemption_type: 'signup'
        },

        product() {
            return this.belongsTo('Product', 'product_id', 'id');
        }
    });

    return {
        Offer: ghostBookshelf.model('Offer', Offer)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
