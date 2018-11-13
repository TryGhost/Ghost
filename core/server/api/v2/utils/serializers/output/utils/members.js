const labsUtil = require('../../../../../../services/labs');
const MEMBER_TAG = '#members';

function hideMembersOnlyContent(attrs, frame) {
    let hasMemberTag = false;
    if (labsUtil.isSet('members') && !frame.original.context.member && attrs.tags) {
        hasMemberTag = attrs.tags.find((tag) => {
            return (tag.name === MEMBER_TAG);
        }).length > 0;
    }
    return hasMemberTag;
}

const forPost = (attrs, frame) => {
    const hideMemberOnlyContent = hideMembersOnlyContent(attrs, frame);
    if (hideMemberOnlyContent) {
        ['plaintext', 'html'].forEach((field) => {
            attrs[field] = '';
        });
    }

    return attrs;
};

module.exports.forPost = forPost;
