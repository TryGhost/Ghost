const membersService = require('../../../../../../services/members');
const labs = require('../../../../../../services/labs');

const forPost = (attrs, frame) => {
    if (labs.isSet('members')) {
        const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

        if (!memberHasAccess) {
            ['plaintext', 'html'].forEach((field) => {
                attrs[field] = '';
            });
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
