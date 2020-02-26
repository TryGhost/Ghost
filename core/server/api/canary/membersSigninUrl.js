const models = require('../../models');
const common = require('../../lib/common');
const membersService = require('../../services/members');

module.exports = {
    docName: 'member_signin_urls',
    permissions: true,
    read: {
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            let model = await models.Member.findOne(frame.data, frame.options);

            if (!model) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.members.memberNotFound')
                });
            }

            const magicLink = membersService.api.getMagicLink(model.get('email'));

            return {
                member_id: model.get('id'),
                url: magicLink
            };
        }
    }
};
