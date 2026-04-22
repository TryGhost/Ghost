const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    noneFilterError: 'Cannot send email to "none" recipient filter',
    newsletterVisibilityError: 'Unexpected visibility value "{value}". Use one of the valid: "members", "paid".'
};

/**
 * @typedef {object} MembersRepository
 * @prop {(options) => Promise<any>} list
 */

class EmailSegmenter {
    #membersRepository;

    /**
     *
     * @param {object} dependencies
     * @param {MembersRepository} dependencies.membersRepository
     */
    constructor({
        membersRepository
    }) {
        this.#membersRepository = membersRepository;
    }

    getMemberFilterForSegment(newsletter, emailRecipientFilter, segment) {
        const filter = [`newsletters.id:'${newsletter.id}'`, 'email_disabled:0'];

        switch (emailRecipientFilter) {
        case 'all':
            break;
        case 'none':
            throw new errors.InternalServerError({
                message: tpl(messages.noneFilterError)
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

        if (segment) {
            filter.push(`(${segment})`);
        }

        return filter.join('+');
    }

    async getMembersCount(newsletter, emailRecipientFilter, segment) {
        const filter = this.getMemberFilterForSegment(newsletter, emailRecipientFilter, segment);
        const {meta: {pagination: {total: membersCount}}} = await this.#membersRepository.list({filter});

        return membersCount;
    }
}

module.exports = EmailSegmenter;
