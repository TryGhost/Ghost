// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const membersService = require('../../services/members');

const allowedIncludes = ['monthly_price', 'yearly_price', 'benefits'];

module.exports = {
    docName: 'tiers',

    browse: {
        options: [
            'limit',
            'fields',
            'include',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        async query(frame) {
            const page = await membersService.api.productRepository.list(frame.options);

            return page;
        }
    }
};
