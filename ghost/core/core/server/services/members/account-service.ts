import _ from 'lodash';

/**
 * A member's own account: what they are shown about themselves, and what they may
 * change.
 *
 * Separate from the request handlers that used to hold this, because none of it is
 * a question about HTTP. Which fields a member may set is a fact about members, and
 * the answer is the same whoever is asking.
 *
 * Takes a member id rather than a member. Everything here either writes or reads
 * afresh, and a record loaded before a write is stale by the time the answer is
 * built, so there is nothing a caller could usefully hand over.
 */

/** What a member is allowed to change about themselves. */
const WRITABLE_FIELDS = [
  'name',
  'expertise',
  'subscribed',
  'newsletters',
  'enable_comment_notifications',
  'enable_updates_and_announcements',
] as const;

/**
 * The relations a write needs loaded to work out what it is changing.
 *
 * Newsletters because the older `subscribed` flag is stored as a list of them, and
 * the subscription chain because changing what a member is entitled to has to
 * reconcile against what they are paying for.
 */
const WRITE_RELATIONS = [
  'stripeSubscriptions',
  'stripeSubscriptions.customer',
  'stripeSubscriptions.stripePrice',
  'newsletters',
];

interface MemberBreadService {
  read(
    data: { id: string },
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
}

interface MemberRepository {
  update(data: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
  update(data: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
}

interface EmailSuppressionList {
  removeEmail(email: string): Promise<unknown>;
}

export interface MemberAccountServiceDeps {
  memberBREADService: MemberBreadService;
  members: MemberRepository;
  emailSuppressionList: EmailSuppressionList;
}

export class MemberAccountService {
  #memberBREADService: MemberBreadService;
  #members: MemberRepository;
  #emailSuppressionList: EmailSuppressionList;

  constructor({ memberBREADService, members, emailSuppressionList }: MemberAccountServiceDeps) {
    this.#memberBREADService = memberBREADService;
    this.#members = members;
    this.#emailSuppressionList = emailSuppressionList;
  }

  /** Everything a member is shown about themselves. */
  async read(memberId: string): Promise<Record<string, unknown> | null> {
    // Without the extra fields a publisher defines: nothing in this projection
    // carries them yet, so fetching them would cost a query per request and be
    // discarded. The session read leaves them off for the same reason.
    return this.#memberBREADService.read({ id: memberId }, { withCustomFields: false });
  }

  /** Apply what a member asked to change about themselves, and say what they now hold. */
  async edit(data: Record<string, unknown>, memberId: string) {
    await this.#members.update(_.pick(data, WRITABLE_FIELDS), {
      id: memberId,
      withRelated: WRITE_RELATIONS,
    });

    // Read back rather than returning what was written: a member is told what
    // Ghost now holds, which is not always what they sent. Setting the older
    // `subscribed` flag, for one, is stored as a list of newsletters.
    return this.read(memberId);
  }

  /**
   * Let Ghost email this member again.
   *
   * Two records rather than one: the address is on a list the email provider also
   * writes to, and the member carries a flag of their own. A member asking to hear
   * from a site again means both.
   */
  async allowEmail(memberId: string, email: string): Promise<void> {
    await this.#emailSuppressionList.removeEmail(email);
    await this.#members.update({ email_disabled: false }, { id: memberId });
  }
}
