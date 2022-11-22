const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    noneFilterError: 'Cannot send email to "none" {property}',
    newsletterVisibilityError: 'Unexpected visibility value "{value}". Use one of the valid: "members", "paid".'
};

class EmailSegmenter {
    getMemberFilterForSegment(newsletter, emailRecipientFilter, errorProperty) {
        const filter = [`newsletters.id:${newsletter.id}`];
    
        switch (emailRecipientFilter) {
        case 'all':
            break;
        case 'none':
            throw new errors.InternalServerError({
                message: tpl(messages.noneFilterError, {
                    property: errorProperty
                })
            });
        default:
            filter.push(`(${emailRecipientFilter})`);
            break;
        }
    
        const visibility = newsletter.get('visibility');
        switch (visibility) {
        case 'members':
            // No need to add a member status filter as the email is available to all members
            break;
        case 'paid':
            filter.push(`status:-free`);
            break;
        default:
            throw new errors.InternalServerError({
                message: tpl(messages.newsletterVisibilityError, {
                    value: visibility
                })
            });
        }
    
        return filter.join('+');
    }
}

module.exports = EmailSegmenter;
