const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const offersService = require('../../services/offers');

const messages = {
    offerNotFound: 'Offer not found.'
};

module.exports = {
    docName: 'offers',

    browse: {
        options: [
            'filter'
        ],
        permissions: true,
        async query(frame) {
            const offers = await offersService.api.listOffers(frame.options);
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
            if (!offer) {
                throw new errors.NotFoundError({
                    message: tpl(messages.offerNotFound)
                });
            }

            frame.response = {
                offers: [offer]
            };
        }
    },

    edit: {
        options: ['id'],
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        async query(frame) {
            const offer = await offersService.api.updateOffer({
                ...frame.data.offers[0],
                id: frame.options.id
            });

            if (!offer) {
                throw new errors.NotFoundError({
                    message: tpl(messages.offerNotFound)
                });
            }

            frame.response = {
                offers: [offer]
            };
        }
    },

    add: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        async query(frame) {
            const offer = await offersService.api.createOffer(frame.data.offers[0]);
            frame.response = {
                offers: [offer]
            };
        }
    }
};
