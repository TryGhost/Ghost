const membersService = require('../../../../../../services/members');
const labs = require('../../../../../../services/labs');

// @TODO: reconsider the location of this - it's part of members and adds a property to the API
const forPost = (attrs, frame) => {
    // CASE: Access always defaults to true, unless members is enabled and the member does not have access
    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = true;
    }

    // Handle members being enabled
    if (labs.isSet('members')) {
        const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

        if (!memberHasAccess) {
            ['plaintext', 'html'].forEach((field) => {
                if (attrs[field] !== undefined) {
                    attrs[field] = '';
                }
            });
        }

        if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
            attrs.access = memberHasAccess;
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
