const labsUtil = require('../../../../../../services/labs');

const forPost = (attrs, frame) => {
    const hideMemberOnlyContent = labsUtil.isSet('members') && !frame.original.context.member;
    if (hideMemberOnlyContent) {
        ['plaintext', 'html'].forEach((field) => {
            attrs[field] = '';
        });
    }

    return attrs;
};

module.exports.forPost = forPost;
