import _ from 'lodash';
import { z } from 'zod';
import { isRecordValue } from '@tryghost/metafield-types/structure';
import { CHECKOUT_PORTS, matchRequirement } from '@tryghost/checkout';
import { MEMBERS } from '../members-metafields';
import type { MetafieldBindingsService } from '../members-metafields/bindings-service';
import {
  refusalError,
  type MetafieldPlan,
  type MetafieldValuesService,
  type Refusal,
} from '../members-metafields/values-service';
import { parseRequest } from '../../lib/parse-request';
import { COLLECTION_FLAG } from '../stripe-checkout-config/models';
import type { TierRequirement, TierRequirements } from '../tiers/requirements';
import type { TierChangeAttempt } from './tracking';

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
  updateWithMetafields(
    data: Record<string, unknown>,
    options: Record<string, unknown>,
    plans: MetafieldPlan[],
  ): Promise<unknown>;
}

interface MemberRepository {
  update(data: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
  update(data: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
}

interface EmailSuppressionList {
  removeEmail(email: string): Promise<unknown>;
}

type MetafieldValues = Pick<MetafieldValuesService, 'unwrapWire' | 'planWrite'>;
type MetafieldBindings = Pick<MetafieldBindingsService, 'planThrough'>;

const AnswersInput = z.object({
  // An answer holds something: a `null` would clear what the field holds, which no answer can.
  answers: z.partialRecord(
    z.enum(CHECKOUT_PORTS),
    z.unknown().refine((answer) => answer !== null, { error: 'Give an answer, or leave it out.' }),
  ),
});

/** A member's answers, each by the port it's collected under, such as `checkout.phone`. */
export type Answers = z.output<typeof AnswersInput>['answers'];

export interface MemberAccountServiceDeps {
  memberBREADService: MemberBreadService;
  members: MemberRepository;
  emailSuppressionList: EmailSuppressionList;
  metafieldValues: MetafieldValues;
  metafieldBindings: MetafieldBindings;
  /** What each tier requires of its members, looked up on use, as tiers start later in boot. */
  requirements: () => Pick<TierRequirements, 'forTiers'>;
  labs: { isSet(flag: string): boolean };
}

export class MemberAccountService {
  #memberBREADService: MemberBreadService;
  #members: MemberRepository;
  #emailSuppressionList: EmailSuppressionList;
  #metafieldValues: MetafieldValues;
  #metafieldBindings: MetafieldBindings;
  #requirements: () => Pick<TierRequirements, 'forTiers'>;
  #labs: { isSet(flag: string): boolean };

  constructor({
    memberBREADService,
    members,
    emailSuppressionList,
    metafieldValues,
    metafieldBindings,
    requirements,
    labs,
  }: MemberAccountServiceDeps) {
    this.#memberBREADService = memberBREADService;
    this.#members = members;
    this.#emailSuppressionList = emailSuppressionList;
    this.#metafieldValues = metafieldValues;
    this.#metafieldBindings = metafieldBindings;
    this.#requirements = requirements;
    this.#labs = labs;
  }

  /** Everything a member is shown about themselves. */
  async read(memberId: string): Promise<Record<string, unknown> | null> {
    // As the member rather than as staff: how much of the extra fields a publisher
    // defines is answered depends on which side of Ghost is asking.
    return this.#memberBREADService.read({ id: memberId }, { metafieldsFor: MEMBERS });
  }

  /** Apply what a member asked to change about themselves, and say what they now hold. */
  async edit(data: Record<string, unknown>, memberId: string) {
    // Worked out before the member is touched, so a value the catalog refuses fails
    // the whole request rather than leaving a member renamed with their answers
    // rejected. The write below reconciles subscriptions with Stripe and sends
    // events, none of which giving up halfway could undo.
    const writes =
      data.metafields === undefined
        ? []
        : await this.#metafieldValues.planWrite(
            this.#metafieldValues.unwrapWire(data.metafields),
            MEMBERS,
          );

    // Saved through the members service, like a staff edit, so the change reaches webhooks.
    await this.#memberBREADService.updateWithMetafields(
      _.pick(data, WRITABLE_FIELDS),
      { id: memberId, withRelated: WRITE_RELATIONS },
      [{ writes, origin: { writtenBy: { type: 'member', id: memberId }, source: 'portal' } }],
    );

    // Read back rather than returning what was written: a member is told what
    // Ghost now holds, which is not always what they sent. Setting the older
    // `subscribed` flag, for one, is stored as a list of newsletters.
    return this.read(memberId);
  }

  /**
   * Works out the writes for the answers a member gave to what the tier they're changing to
   * requires, by port, saving nothing, so the change of tier can refuse them before it's made and
   * save them once it has been.
   *
   * Answers are optional, and each requirement is answered whole or not at all, so a member never
   * gives an address without its recipient, while a client that doesn't know one of the tier's
   * requirements can still change tier with the rest. They're written the same way a checkout for
   * that tier writes them: into the fields the ports write into, each answer replacing what its
   * field holds, and one the tier doesn't ask for, or for a port bound nowhere or into an archived
   * field, is dropped. A requirement answered in part, an answer the field can't hold, or an answer
   * a requirement refuses, such as a shipping address outside its countries, is refused, with
   * every refusal at once, each naming the answer as the request did, such as
   * `answers.checkout.shipping.address.country`. Nothing is written while checkouts don't collect
   * answers, as the bindings outlive that flag and a save goes wherever they point.
   */
  async planAnswers(
    given: unknown,
    memberId: string,
    tier: { id: string; type: string },
    attempt: Pick<TierChangeAttempt, 'answering'>,
  ): Promise<MetafieldPlan[]> {
    if (!this.#labs.isSet(COLLECTION_FLAG)) {
      return [];
    }
    const { answers } = parseRequest(AnswersInput, { answers: given }, 'answers');
    const required = (await this.#requirements().forTiers([tier])).get(tier.id) ?? [];
    const asked = required.flatMap(({ ports }) => Object.values(ports).map(({ port }) => port));
    const { plans, refused, kept } = await this.#metafieldBindings.planThrough(
      asked
        .filter((port) => Object.hasOwn(answers, port))
        .map((port) => ({ port, value: answers[port] })),
      { type: 'member', id: memberId },
    );
    attempt.answering({ required, answers, kept });

    // Every refusal at once, each named as the request named the answer. Where a field refuses a
    // value a rule here also refuses, such as a country that isn't a code at all, the field's own
    // reason says more.
    const byFields = refused.map(({ message, property }) => ({
      message,
      property: `answers.${property}`,
    }));
    const [first, ...rest] = [
      ...byFields,
      ...required
        .flatMap((requirement) => [
          ...answeredInPart(requirement, answers),
          ...refusedBy(requirement, answers, kept),
        ])
        .filter(({ property }) => !byFields.some((refusal) => refusal.property === property)),
    ];
    if (first) {
      throw refusalError(first, rest);
    }
    return plans;
  }

  /** Saves the answers `planAnswers` worked out, once the change of tier has been made. */
  async saveAnswers(memberId: string, plans: MetafieldPlan[]): Promise<void> {
    if (plans.length) {
      // Saved through the members service, like a staff edit, so the change reaches webhooks.
      await this.#memberBREADService.updateWithMetafields({}, { id: memberId }, plans);
    }
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

/**
 * Each of a requirement's ports the answers leave out, when they give some of its others, as a
 * requirement is answered whole or not at all.
 */
function answeredInPart(requirement: TierRequirement, answers: Answers): Refusal[] {
  const ports = Object.values(requirement.ports).map(({ port }) => port);
  const left = ports.filter((port) => !Object.hasOwn(answers, port));
  return left.length < ports.length
    ? left.map((port) => ({
        message: 'This tier requires an answer.',
        property: `answers.${port}`,
      }))
    : [];
}

/**
 * What a requirement refuses of its answers beyond what their fields refuse: shipping, an address
 * in no country, as nobody can ship to it, or outside its countries when it's limited to some. An
 * answer that isn't kept, as its field is archived, is dropped rather than refused, so it never
 * stops the change.
 */
function refusedBy(
  requirement: TierRequirement,
  answers: Answers,
  kept: ReadonlySet<string>,
): Refusal[] {
  return matchRequirement<Refusal[]>(requirement, {
    shipping: ({ ports, countries }) => {
      const { port } = ports.address;
      const answer = answers[port];
      if (!kept.has(port) || !isRecordValue(answer)) {
        return [];
      }
      // Read as the field reads a country code, so what it would keep is what's checked. One
      // holding nothing at all is left to its field to refuse.
      const code = typeof answer.country === 'string' ? answer.country.trim().toUpperCase() : '';
      const holdsSomething = Object.values(answer).some((part) => part !== null && part !== '');
      const outside = !code || (countries !== undefined && !countries.includes(code));
      return holdsSomething && outside
        ? [{ message: 'Choose a country we ship to.', property: `answers.${port}.country` }]
        : [];
    },
    phone: () => [],
  });
}
