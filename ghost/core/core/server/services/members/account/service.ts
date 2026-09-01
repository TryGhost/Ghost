import type { Knex } from 'knex';
import { UpdateAccount } from './commands';
import { UpdateMetafields } from '../../members-custom-fields';
import { MemberAccount, type DecodeDependencies } from './models';
import * as queries from './queries';
import type { ExternalSubscriptionFacts, MemberLookup } from './queries';

type Json = any;
type Anything = any;

const config = require('../../../../shared/config');

interface Dependencies {
  knex: Knex;
  /**
   * The metafields domain.
   *
   * Reading these is part of this projection's own query — a value is rows in a
   * table like anything else here. Writing one is not: what a field accepts, and
   * what clearing one means, are rules that domain enforces, so a write asks it
   * rather than reaching for the tables itself.
   */
  metafields: {
    values: Anything;
  };
  memberRepository: Anything;
  offersAPI: Anything;
  memberAttributionService: Anything;
  settingsHelpers: Anything;
  nextPaymentCalculator: Anything;
}

/**
 * A member's own view of their own record.
 *
 * Separate from `MemberBREADService` because the two answer different questions
 * about the same row. Staff reading a member want everything Ghost knows; a member
 * reading themselves wants what a member is shown, which differs in both
 * directions — `firstname` and `paid` exist only here, `labels` and the member's
 * own attribution only there.
 *
 * Reading is a query and a parse. `queries.read` gathers the rows that make a
 * member and `MemberAccount` turns them into what a member receives; this class
 * holds neither piece of knowledge. It supplies the collaborators those two need
 * and otherwise gets out of the way.
 */
export class MemberAccountService {
  private knex: Knex;
  private metafields: { values: Anything };
  private memberRepository: Anything;
  private offersAPI: Anything;
  private memberAttributionService: Anything;
  private settingsHelpers: Anything;
  private nextPaymentCalculator: Anything;

  constructor({
    knex,
    metafields,
    memberRepository,
    offersAPI,
    memberAttributionService,
    settingsHelpers,
    nextPaymentCalculator,
  }: Dependencies) {
    this.knex = knex;
    this.metafields = metafields;
    this.memberRepository = memberRepository;
    this.offersAPI = offersAPI;
    this.memberAttributionService = memberAttributionService;
    this.settingsHelpers = settingsHelpers;
    this.nextPaymentCalculator = nextPaymentCalculator;
  }

  /** A member as they see themselves, or null when there is no such member. */
  async read(lookup: MemberLookup): Promise<Json | null> {
    const raw = await queries.read(this.knex, lookup, {
      forSubscriptions: (rows) => this.subscriptionFacts(rows),
    });

    return raw === null ? null : MemberAccount(this.decodeDependencies()).parse(raw);
  }

  /**
   * What a decode needs that no row carries: a calculation, a signed link, and
   * whether this site shows gravatars. Passed in so that nothing in the schemas
   * does any IO, and all of it can be tested with plain objects.
   */
  private decodeDependencies(): DecodeDependencies {
    return {
      nextPayment: (subscription) => this.nextPaymentCalculator.calculate(subscription),
      unsubscribeUrl: (uuid) => this.settingsHelpers.createUnsubscribeUrl(uuid),
      avatarUrl: (email) => this.avatarFor(email),
    };
  }

  /**
   * A member's gravatar, or nothing when the site has turned that off.
   *
   * Required lazily because the image helper pulls in a chain of frontend modules
   * and this service is built during boot.
   */
  private avatarFor(email: string): string | null {
    if (!email || config.isPrivacyDisabled('useGravatar')) {
      return null;
    }
    const { gravatar } = require('../../../lib/image');
    return gravatar.url(email, { size: 250, default: 'blank' });
  }

  /**
   * What the offers and attribution domains say about a member's subscriptions.
   *
   * Both own read models this one has no business rebuilding: an offer carries its
   * own redemption counts, and where a subscription came from resolves a URL from
   * routing configuration rather than a column.
   *
   * Best effort on the offers side, because a member should still see their
   * account when an offer cannot be loaded.
   */
  private async subscriptionFacts(
    rows: Array<{
      subscription_id: string;
      ghost_subscription_row_id: string;
      offer_id: string | null;
    }>,
  ): Promise<Map<string, ExternalSubscriptionFacts>> {
    const facts = new Map<string, ExternalSubscriptionFacts>();
    if (rows.length === 0) {
      return facts;
    }

    const offers = new Map<string, unknown>();
    const redemptions = new Map<string, unknown[]>();

    const loadOffer = async (id: string) => {
      if (!offers.has(id)) {
        offers.set(id, await this.offersAPI.getOffer({ id }));
      }
      return offers.get(id);
    };

    try {
      const offerIds = new Set(
        rows.flatMap((row) => (row.offer_id === null ? [] : [row.offer_id])),
      );
      for (const id of offerIds) {
        await loadOffer(id);
      }

      const stripeIdByRowId = new Map(
        rows.map((row) => [row.ghost_subscription_row_id, row.subscription_id]),
      );
      const redeemed = await this.offersAPI.getRedeemedOfferIdsForSubscriptions({
        subscriptionIds: rows.map((row) => row.ghost_subscription_row_id),
      });

      for (const redemption of redeemed) {
        const stripeId = stripeIdByRowId.get(redemption.subscription_id);
        const offer = await loadOffer(redemption.offer_id);
        if (stripeId && offer) {
          redemptions.set(stripeId, [...(redemptions.get(stripeId) ?? []), offer]);
        }
      }
    } catch (err) {
      const logging = require('@tryghost/logging');
      logging.error(err);
    }

    for (const row of rows) {
      facts.set(row.subscription_id, {
        offer: row.offer_id ? (offers.get(row.offer_id) ?? null) : null,
        offer_redemptions: redemptions.get(row.subscription_id) ?? [],
        attribution: await this.memberAttributionService.getSubscriptionCreatedAttribution(
          row.ghost_subscription_row_id,
        ),
      });
    }

    return facts;
  }

  /**
   * Apply the fields a member may change about themselves, then read them back.
   *
   * The read is what the caller gets rather than the model the update returned: a
   * member who changes their newsletters expects the response to describe them as
   * they now are, and the update's own result carries only what it touched.
   *
   * Metafield values are planned before anything is written, so a value the
   * catalog refuses fails the whole request before the member's record is touched
   * rather than after. They are recorded as written by the member, which is the
   * one writer whose edits leave no action behind: the action log records what
   * staff did, and no member-initiated change has ever written to it.
   */
  async edit(data: Json, options: Json = {}): Promise<Json | null> {
    const { metafields, ...fields } = UpdateAccount.parse(data);

    // A member is recorded as the writer of their own answers, and is the one
    // writer whose changes leave no action behind: the action log records what
    // staff did, and no member-initiated change has ever written to it.
    const command: UpdateMetafields | null =
      metafields === undefined
        ? null
        : UpdateMetafields.parse({
            memberId: options.id,
            values: metafields,
            writtenBy: { type: 'member', id: options.id },
          });

    // Planned before anything is written, so a value the catalog refuses fails the
    // whole request rather than half of it.
    const plan = command === null ? null : await this.metafields.values.planUpdate(command);

    const model = await this.memberRepository.update(fields, {
      ...options,
      withRelated: ['newsletters'],
    });

    if (!model) {
      return null;
    }

    if (command !== null && plan !== null) {
      await this.metafields.values.applyUpdate(command, plan);
    }

    return this.read({ id: model.id });
  }
}
