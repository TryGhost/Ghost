const membersService = require('../../../../../../services/members');
const htmlToPlaintext = require('../../../../../../../shared/html-to-plaintext');

const forPost = (attrs, frame) => {
    const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

    if (!memberHasAccess) {
        const paywallIndex = (attrs.html || '').indexOf('<!--members-only-->');

        if (paywallIndex !== -1) {
            attrs.html = attrs.html.slice(0, paywallIndex);
            attrs.plaintext = htmlToPlaintext(attrs.html);

            if (!attrs.custom_excerpt && attrs.excerpt) {
                attrs.excerpt = attrs.plaintext.substring(0, 500);
            }
        } else {
            ['plaintext', 'html', 'excerpt'].forEach((field) => {
                if (attrs[field] !== undefined) {
                    attrs[field] = '';
                }
            });
        }
    }

    return attrs;
};

module.exports.forPost = forPost;
