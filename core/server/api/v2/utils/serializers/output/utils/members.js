const labs = require('../../../../../../services/labs');
const membersService = require('../../../../../../services/members');
const MEMBER_TAG = '#members';
const PERMIT_CONTENT = false;
const BLOCK_CONTENT = true;

// Checks if request should hide memnbers only content
function hideMembersOnlyContent(attrs, frame) {
    const membersEnabled = labs.isSet('members');
    if (!membersEnabled) {
        return PERMIT_CONTENT;
    }

    const postHasMemberTag = attrs.tags && attrs.tags.find((tag) => {
        return (tag.name === MEMBER_TAG);
    });
    const requestFromMember = frame.original.context.member;
    if (!postHasMemberTag) {
        return PERMIT_CONTENT;
    }
    if (!requestFromMember) {
        return BLOCK_CONTENT;
    }

    const memberHasPlan = !!(frame.original.context.member.plans || []).length;
    if (!membersService.api.isPaymentConfigured()) {
        return PERMIT_CONTENT;
    }
    if (memberHasPlan) {
        return PERMIT_CONTENT;
    }
    return BLOCK_CONTENT;
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
            attrs.primary_tag = null;
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
