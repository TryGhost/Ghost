const _ = require('lodash');
const labs = require('../../../../../../services/labs');

// Checks if request should hide members only content
function hideMembersOnlyContent({visibility}, frame) {
    const PERMIT_CONTENT = false;
    const BLOCK_CONTENT = true;

    if (visibility === 'public') {
        return PERMIT_CONTENT;
    }

    const requestFromMember = frame.original.context.member;

    if (!requestFromMember) {
        return BLOCK_CONTENT;
    } else if (visibility === 'members') {
        return PERMIT_CONTENT;
    }

    const memberHasPlan = !!(_.get(frame, 'original.context.member.stripe.subscriptions', [])).length;

    if (visibility === 'paid' && memberHasPlan) {
        return PERMIT_CONTENT;
    }

    return BLOCK_CONTENT;
}

const forPost = (attrs, frame) => {
    if (labs.isSet('members')) {
        const hideFormatsData = hideMembersOnlyContent(attrs, frame);

        if (hideFormatsData) {
            ['plaintext', 'html'].forEach((field) => {
                attrs[field] = '';
            });
        }

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
