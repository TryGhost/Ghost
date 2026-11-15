const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const messages = {
  blockedEmailDomain: 'Memberships from this email domain are currently restricted.',
};

/** Answers to what a new tier requires that were refused, carrying the refusal to report. */
class AnswersRefused extends Error {
  /** @param {InstanceType<typeof errors.ValidationError>} refusal */
  constructor(refusal) {
    super(refusal.message);
    this.refusal = refusal;
  }
}

module.exports = class MemberController {
  /**
   * @param {object} deps
   * @param {any} deps.memberRepository
   * @param {any} deps.productRepository
   * @param {any} deps.paymentsService
   * @param {any} deps.tiersService
   * @param {any} deps.StripePrice
   * @param {any} deps.tokenService
   * @param {any} deps.sendEmailWithMagicLink
   * @param {any} deps.settingsCache
   * @param {Pick<import('../../account-service').MemberAccountService, 'planAnswers' | 'saveAnswers'>} deps.account
   * @param {Pick<import('../../tracking').MembersTracking, 'tierChange'>} deps.tracking
   */
  constructor({
    memberRepository,
    productRepository,
    paymentsService,
    tiersService,
    StripePrice,
    tokenService,
    sendEmailWithMagicLink,
    settingsCache,
    account,
    tracking,
  }) {
    this._account = account;
    this._tracking = tracking;
    this._memberRepository = memberRepository;
    this._productRepository = productRepository;
    this._paymentsService = paymentsService;
    this._tiersService = tiersService;
    this._StripePrice = StripePrice;
    this._tokenService = tokenService;
    this._sendEmailWithMagicLink = sendEmailWithMagicLink;
    this._settingsCache = settingsCache;
  }

  async updateEmailAddress(req, res) {
    const identity = req.body.identity;
    const email = req.body.email;
    const options = {
      forceEmailType: true,
    };

    if (!identity) {
      res.writeHead(403);
      return res.end('No Permission.');
    }

    const blockedEmailDomains = this._settingsCache.get('all_blocked_email_domains');
    const emailDomain = req.body.email.split('@')[1]?.toLowerCase();
    if (emailDomain && blockedEmailDomains.includes(emailDomain)) {
      throw new errors.BadRequestError({
        message: tpl(messages.blockedEmailDomain),
      });
    }

    const tokenData = {};
    try {
      const member = await this._memberRepository.getByToken(identity);
      tokenData.oldEmail = member.get('email');
    } catch (err) {
      res.writeHead(401);
      return res.end('Unauthorized.');
    }

    try {
      await this._sendEmailWithMagicLink({
        email,
        tokenData,
        requestedType: 'updateEmail',
        options,
      });
      res.writeHead(201);
      return res.end('Created.');
    } catch (err) {
      res.writeHead(500);
      return res.end('Internal Server Error.');
    }
  }

  async updateSubscription(req, res) {
    try {
      const identity = req.body.identity;
      const subscriptionId = req.params.id;
      const cancelAtPeriodEnd = req.body.cancel_at_period_end;
      const smartCancel = req.body.smart_cancel;
      const cancellationReason = req.body.cancellation_reason;
      const ghostPriceId = req.body.priceId;
      const tierId = req.body.tierId;
      const cadence = req.body.cadence;
      const answers = req.body.answers;

      if (
        cancelAtPeriodEnd === undefined &&
        ghostPriceId === undefined &&
        smartCancel === undefined &&
        tierId === undefined &&
        cadence === undefined
      ) {
        throw new errors.BadRequestError({
          message: 'Updating subscription failed!',
          help: 'Request should contain "cancel_at_period_end" or "priceId" or "smart_cancel" field.',
        });
      }

      if (
        (cancelAtPeriodEnd === undefined || cancelAtPeriodEnd === false) &&
        !smartCancel &&
        cancellationReason !== undefined
      ) {
        throw new errors.BadRequestError({
          message: 'Updating subscription failed!',
          help: '"cancellation_reason" field requires the "cancel_at_period_end" or "smart_cancel" field to be true.',
        });
      }

      if (cancellationReason && cancellationReason.length > 500) {
        throw new errors.BadRequestError({
          message: 'Updating subscription failed!',
          help: '"cancellation_reason" field can be a maximum of 500 characters.',
        });
      }

      let email;
      try {
        if (!identity) {
          throw new errors.BadRequestError({
            message: 'Updating subscription failed! Could not find member',
          });
        }

        const claims = await this._tokenService.decodeToken(identity);
        email = claims && claims.sub;
      } catch (err) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }

      if (!email) {
        throw new errors.BadRequestError({
          message: 'Invalid token',
        });
      }

      if (tierId && cadence) {
        const tier = await this._tiersService.api.read(tierId);

        if (!tier) {
          res.writeHead(404);
          return res.end('Not Found.');
        }

        if (tier.status !== 'active') {
          res.writeHead(403);
          return res.end('Tier is archived.');
        }

        const stripePrice = await this._paymentsService.getPriceForTierCadence(tier, cadence);

        await this._changePlan({
          email,
          subscriptionId,
          tier: { id: tierId, type: tier.type },
          price: stripePrice.id,
          answers,
        });
      } else if (ghostPriceId !== undefined) {
        const price = await this._StripePrice.findOne({
          id: ghostPriceId,
        });

        if (!price) {
          res.writeHead(404);
          return res.end('Not Found.');
        }

        const priceId = price.get('stripe_price_id');
        const product = await this._productRepository.get({ stripe_price_id: priceId });

        if (product.get('active') !== true) {
          res.writeHead(403);
          return res.end('Tier is archived.');
        }

        await this._changePlan({
          email,
          subscriptionId,
          tier: { id: product.id, type: product.get('type') },
          price: priceId,
          answers,
        });
      } else if (cancelAtPeriodEnd !== undefined) {
        await this._memberRepository.updateSubscription({
          email,
          subscription: {
            subscription_id: subscriptionId,
            cancel_at_period_end: cancelAtPeriodEnd,
            cancellationReason,
          },
        });
      } else if (smartCancel) {
        const currentSubscription = await this._memberRepository.getSubscription({
          email,
          subscription: {
            subscription_id: subscriptionId,
          },
        });

        if (['past_due', 'unpaid'].includes(currentSubscription.status)) {
          await this._memberRepository.cancelSubscription({
            email,
            subscription: {
              subscription_id: subscriptionId,
              cancellationReason,
            },
          });
        } else {
          await this._memberRepository.updateSubscription({
            email,
            subscription: {
              subscription_id: subscriptionId,
              cancel_at_period_end: true,
              cancellationReason,
            },
          });
        }
      }

      res.writeHead(204);
      res.end();
    } catch (err) {
      // A refused answer is reported the way the rest of the members API reports a refused value,
      // naming what it refused, so a page can show the refusal beside the input that holds it.
      // Anything else is reported as this endpoint always has.
      if (err instanceof AnswersRefused) {
        throw err.refusal;
      }
      res.writeHead(err.statusCode || 500, {
        'Content-Type': 'text/plain;charset=UTF-8',
      });
      res.end(err.message);
    }
  }

  /**
   * Changes a member's plan to a price of a tier, saving the answers they gave to what that tier
   * requires. The answers are checked before the change, so a refused one leaves the member on
   * their plan to correct it, and saved once it's made, so a change that fails saves none. A save
   * that fails after the change is logged rather than reported, as the plan has changed and nothing
   * else waits on the answers: the member can be asked for them again.
   *
   * Optional: a caller that doesn't know about requirements, such as an automation or a custom
   * page, changes plan without them, as it always has. A change that keeps the tier, such as one
   * of billing period, saves none, as it asks for nothing.
   *
   * @param {object} change
   * @param {string} change.email The member's, from their identity.
   * @param {string} change.subscriptionId
   * @param {{id: string, type: string}} change.tier The tier they're changing to.
   * @param {string} change.price The Stripe price they're changing to.
   * @param {unknown} change.answers
   */
  async _changePlan({ email, subscriptionId, tier, price, answers }) {
    return this._tracking.tierChange({ answered: answers !== undefined }, async (attempt) => {
      const changing = () =>
        this._memberRepository.updateSubscription({
          email,
          subscription: { subscription_id: subscriptionId, price },
        });
      if (answers === undefined) {
        return changing();
      }

      // The member's own subscription, or nothing is checked or saved: the change below would
      // refuse anyone else's, and answers are only ever saved with a change.
      const subscription = await this._memberRepository.getSubscription({
        email,
        subscription: { subscription_id: subscriptionId },
      });
      const [current, member] = await Promise.all([
        // `plan` is how a subscription names the Stripe price it's on.
        this._productRepository.get({ stripe_price_id: subscription.plan.id }),
        this._memberRepository.get({ email }),
      ]);
      const plans =
        current?.id === tier.id
          ? []
          : await this._account.planAnswers(answers, member.id, tier, attempt).catch((err) => {
              throw err instanceof errors.ValidationError ? new AnswersRefused(err) : err;
            });

      await changing();
      await this._account.saveAnswers(member.id, plans).catch((err) => {
        attempt.answersNotSaved();
        logging.error({
          event: { name: 'members.tier_change.answers_not_saved' },
          err,
          member_id: member.id,
          subscription_id: subscriptionId,
        });
      });
    });
  }

  async applyOfferToSubscription(req, res) {
    try {
      const identity = req.body.identity;
      const subscriptionId = req.params.id;
      const offerId = req.body.offer_id;

      if (!identity) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }

      if (!offerId) {
        throw new errors.BadRequestError({
          message: 'Missing offer_id',
        });
      }

      let email;
      try {
        const claims = await this._tokenService.decodeToken(identity);
        email = claims && claims.sub;
      } catch (err) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }

      if (!email) {
        throw new errors.BadRequestError({
          message: 'Invalid token',
        });
      }

      const coupon = await this._paymentsService.getCouponForOffer(offerId);

      await this._memberRepository.applyOfferToSubscription({
        email,
        subscription: {
          subscription_id: subscriptionId,
        },
        offerId,
        couponId: coupon?.id,
      });

      res.writeHead(204);
      res.end();
    } catch (err) {
      res.writeHead(err.statusCode || 500, {
        'Content-Type': 'text/plain;charset=UTF-8',
      });
      res.end(err.message);
    }
  }
};
