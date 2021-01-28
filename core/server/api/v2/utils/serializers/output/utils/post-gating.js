const membersService = require('../../../../../../services/members');

const forPost = (attrs, frame) => {
    const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

    if (!memberHasAccess) {
        ['plaintext', 'html'].forEach((field) => {
            if (attrs[field] !== undefined) {
                attrs[field] = '';
            }
        });
    }

    return attrs;
};

module.exports.forPost = forPost;
