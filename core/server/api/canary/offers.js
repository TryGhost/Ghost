const offersService = require('../../services/offers');

module.exports = {
    docName: 'offers',

    browse: {
        permissions: true,
        async query(frame) {
            const offers = await offersService.api.listOffers();
            frame.response = {
                offers
            };
        }
    },

    read: {
        data: ['id'],
        permissions: true,
        async query(frame) {
            const offer = await offersService.api.getOffer(frame.data);
            frame.response = {
                offers: [offer]
            };
        }
    },

    edit: {
        options: ['id'],
        permissions: true,
        async query(frame) {
            const offer = await offersService.api.updateOffer({
                ...frame.data.offers[0],
                id: frame.options.id
            });
            frame.response = {
                offers: [offer]
            };
        }
    },

    add: {
        permissions: true,
        async query(frame) {
            const offer = await offersService.api.createOffer(frame.data.offers[0]);
            frame.response = {
                offers: [offer]
            };
        }
    }
};
