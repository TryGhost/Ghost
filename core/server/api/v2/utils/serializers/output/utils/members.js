const labs = require('../../../../../../services/labs');
const MEMBER_TAG = '#members';

// Checks if request should hide memnbers only content
function hideMembersOnlyContent(attrs, frame) {
    let hasMemberTag = false;
    if (labs.isSet('members') && !frame.original.context.member && attrs.tags) {
        hasMemberTag = attrs.tags.find((tag) => {
            return (tag.name === MEMBER_TAG);
        });
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
    if (labs.isSet('members')) {
        // CASE: Members always adds tags, remove if the user didn't originally ask for them
        const origQueryOrOptions = frame.original.query || frame.original.options || {};
        const origInclude = origQueryOrOptions.include;

        if (!origInclude || !origInclude.includes('tags')) {
            delete attrs.tags;
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
