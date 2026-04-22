const gift = require('../../services/gifts');

/** @type {import('@tryghost/api-framework').Controller} */
module.exports = {
    docName: 'gifts',

    getRedeemable: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'token'
        ],
        validation: {
            data: {
                token: {
                    type: 'string',
                    required: true
                }
            }
        },
        permissions: false,
        query(frame) {
            return gift.controller.getRedeemable(frame);
        }
    },

    redeem: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        data: [
            'token'
        ],
        validation: {
            data: {
                token: {
                    type: 'string',
                    required: true
                }
            }
        },
        permissions: false,
        query(frame) {
            return gift.controller.redeem(frame);
        }
    }
};
