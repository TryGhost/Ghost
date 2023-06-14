const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const membersService = require('../../services/members');

const messages = {
    memberNotFound: 'Member not found.'
};

module.exports = {
    docName: 'member_signin_urls',
    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            let model = await membersService.api.members.get(frame.data, frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            const magicLink = await membersService.api.getMagicLink(model.get('email'), 'signin');

            return {
                member_id: model.get('id'),
                url: magicLink
            };
        }
    }
};
