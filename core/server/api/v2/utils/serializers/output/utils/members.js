const labsUtil = require('../../../../../../services/labs');
const MEMBER_TAG = '#members';

// Checks if request should hide memnbers only content
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
    const hideFormatsData = hideMembersOnlyContent(attrs, frame);
    if (hideFormatsData) {
        ['plaintext', 'html'].forEach((field) => {
            attrs[field] = '';
        });
    }
    if (labsUtil.isSet('members')) {
        const origQuery = frame.original.query || {};
        if (!origQuery.include || !origQuery.include.includes('tags')) {
            delete attrs.tags;
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
