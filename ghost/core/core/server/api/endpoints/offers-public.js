const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const offersService = require('../../services/offers');

const messages = {
    offerNotFound: 'Offer not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'offers',

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: ['id'],
        permissions: true,
        async query(frame) {
            const offer = await offersService.api.getOffer(frame.data);
            if (!offer) {
                throw new errors.NotFoundError({
                    message: tpl(messages.offerNotFound)
                });
            }

            return {
                data: [offer]
            };
        }
    }
};

module.exports = controller;
