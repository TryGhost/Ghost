module.exports = function (ghostBookshelf) {
    const OfferRedemption = ghostBookshelf.Model.extend({
        tableName: 'offer_redemptions'
    });

    return {
        OfferRedemption: ghostBookshelf.model('OfferRedemption', OfferRedemption)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
