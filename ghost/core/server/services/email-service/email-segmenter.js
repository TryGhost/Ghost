const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const { allOf } = require('@tryghost/nql-string');

const messages = {
  noneFilterError: 'Cannot send email to "none" recipient filter',
  newsletterVisibilityError:
    'Unexpected visibility value "{value}". Use one of the valid: "members", "paid".',
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
  constructor({ membersRepository }) {
    this.#membersRepository = membersRepository;
  }

  /**
   * The members filter of an email through `newsletter` to `emailRecipientFilter`: the members it
   * selects who are subscribed to the newsletter and can be emailed, only paid members when the
   * newsletter is for paid members, and only those `segment` selects when the email is sent in
   * parts.
   */
  getMemberFilterForSegment(newsletter, emailRecipientFilter, segment) {
    return allOf(
      `newsletters.id:'${newsletter.id}'`,
      'email_disabled:0',
      this.#recipients(emailRecipientFilter),
      this.#paidOnly(newsletter),
      segment ?? undefined,
    );
  }

  /**
   * The members a post's recipient filter selects: no condition for `all`, and an error for `none`,
   * which no email is sent to.
   */
  #recipients(emailRecipientFilter) {
    switch (emailRecipientFilter) {
      case 'all':
        return undefined;
      case 'none':
        throw new errors.InternalServerError({
          message: tpl(messages.noneFilterError),
        });
      default:
        return emailRecipientFilter;
    }
  }

  /** Paid members only for a newsletter that is for paid members, otherwise no condition. */
  #paidOnly(newsletter) {
    const visibility = newsletter.get('visibility');
    switch (visibility) {
      case 'members':
        return undefined;
      case 'paid':
        return 'status:-free';
      default:
        throw new errors.InternalServerError({
          message: tpl(messages.newsletterVisibilityError, {
            value: visibility,
          }),
        });
    }
  }

  async getMembersCount(newsletter, emailRecipientFilter, segment) {
    const filter = this.getMemberFilterForSegment(newsletter, emailRecipientFilter, segment);
    const {
      meta: {
        pagination: { total: membersCount },
      },
    } = await this.#membersRepository.list({ filter });

    return membersCount;
  }
}

module.exports = EmailSegmenter;
