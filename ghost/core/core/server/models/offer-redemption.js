const ghostBookshelf = require('./base');

const OfferRedemption = ghostBookshelf.Model.extend({
    tableName: 'offer_redemptions'
});

module.exports = {
    OfferRedemption: ghostBookshelf.model('OfferRedemption', OfferRedemption)
};

