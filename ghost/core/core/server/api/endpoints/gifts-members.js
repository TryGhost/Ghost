const giftService = require('../../services/gifts');

/** @type {import('@tryghost/api-framework').Controller} */
module.exports = {
    docName: 'gifts',

    isRedeemable: {
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
            return giftService.service.getRedeemableGiftByToken({
                token: frame.data.token,
                currentMember: frame.options.context.member
            });
        }
    }
};
