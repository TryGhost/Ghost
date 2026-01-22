const errors = require('../errors');
const ObjectID = require('bson-objectid').default;

const OfferName = require('./offer-name');
const OfferCode = require('./offer-code');
const OfferAmount = require('./offer-amount');
const OfferTitle = require('./offer-title');
const OfferDescription = require('./offer-description');
const OfferCadence = require('./offer-cadence');
const OfferType = require('./offer-type');
const OfferDuration = require('./offer-duration');
const OfferCurrency = require('./offer-currency');
const OfferStatus = require('./offer-status');
const OfferRedemptionType = require('./offer-redemption-type');
const OfferCreatedEvent = require('../events/offer-created-event');
const OfferCodeChangeEvent = require('../events/offer-code-change-event');
const OfferCreatedAt = require('./offer-created-at');
const StripeCoupon = require('./stripe-coupon');

/**
 * @typedef {object} OfferProps
 * @prop {ObjectID} id
 * @prop {OfferName} name
 * @prop {OfferCode} code
 * @prop {OfferTitle} display_title
 * @prop {OfferDescription} display_description
 * @prop {OfferCadence} cadence
 * @prop {OfferType} type
 * @prop {OfferAmount} amount
 * @prop {OfferDuration} duration
 * @prop {OfferCurrency} [currency]
 * @prop {OfferStatus} status
 * @prop {string|null} [stripeCouponId]
 * @prop {OfferTier} tier
 * @prop {number} redemptionCount
 * @prop {OfferRedemptionType} redemptionType
 * @prop {string} createdAt
 * @prop {string|null} lastRedeemed
 */

/**
 * @typedef {object} OfferCreateProps
 * @prop {string|ObjectID} [id]
 * @prop {string} name
 * @prop {string} code
 * @prop {string} display_title
 * @prop {string} display_description
 * @prop {string} cadence
 * @prop {string} type
 * @prop {number} amount
 * @prop {string} duration
 * @prop {number} [duration_in_months]
 * @prop {string|null} [currency]
 * @prop {string} [status]
 * @prop {string} [stripe_coupon_id]
 * @prop {number} [redemptionCount]
 * @prop {string} [redemption_type]
 * @prop {TierProps|OfferTier} tier
 * @prop {Date} [created_at]
 * @prop {Date} [last_redeemed]
 */

/**
 * @typedef {object} UniqueChecker
 * @prop {(code: OfferCode) => Promise<boolean>} isUniqueCode
 * @prop {(name: OfferName) => Promise<boolean>} isUniqueName
 */

/**
 * @typedef {object} TierProps
 * @prop {ObjectID} id
 * @prop {string} name
 */

class OfferTier {
    get id() {
        return this.props.id.toHexString();
    }

    get name() {
        return this.props.name;
    }

    /**
     * @param {TierProps} props
     */
    constructor(props) {
        this.props = props;
    }

    /**
     * @param {any} data
     * @returns {OfferTier}
     */
    static create(data) {
        let id;

        if (data.id instanceof ObjectID) {
            id = data.id;
        } else if (typeof data.id === 'string') {
            id = new ObjectID(data.id);
        } else {
            id = new ObjectID();
        }

        const name = data.name;

        return new OfferTier({
            id,
            name
        });
    }
}

class Offer {
    events = [];
    get id() {
        return this.props.id.toHexString();
    }

    get name() {
        return this.props.name;
    }

    get code() {
        return this.props.code;
    }

    get currency() {
        return this.props.currency;
    }

    get duration() {
        return this.props.duration;
    }

    get status() {
        return this.props.status;
    }

    set status(value) {
        this.props.status = value;
    }

    get redemptionCount() {
        return this.props.redemptionCount;
    }

    get redemptionType() {
        return this.props.redemptionType;
    }

    get oldCode() {
        return this.changed.code;
    }

    get codeChanged() {
        return this.changed.code !== null;
    }

    get displayTitle() {
        return this.props.display_title;
    }

    set displayTitle(value) {
        this.props.display_title = value;
    }

    get displayDescription() {
        return this.props.display_description;
    }

    set displayDescription(value) {
        this.props.display_description = value;
    }

    get tier() {
        return this.props.tier;
    }

    get cadence() {
        return this.props.cadence;
    }

    get type() {
        return this.props.type;
    }

    get amount() {
        return this.props.amount;
    }

    get isNew() {
        return !!this.options.isNew;
    }

    get createdAt() {
        return this.props.createdAt;
    }

    get lastRedeemed() {
        return this.props.lastRedeemed;
    }

    get stripeCouponId() {
        return this.props.stripeCouponId;
    }

    /**
     * @param {OfferCode} code
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateCode(code, uniqueChecker) {
        if (code.equals(this.props.code)) {
            return;
        }
        if (this.changed.code) {
            throw new errors.InvalidOfferCode({
                message: 'Offer `code` cannot be updated more than once.'
            });
        }
        if (!await uniqueChecker.isUniqueCode(code)) {
            throw new errors.InvalidOfferCode({
                message: `Offer 'code' must be unique. Please change and try again.`
            });
        }

        this.events.push(OfferCodeChangeEvent.create({
            offerId: this.id,
            previousCode: this.props.code,
            currentCode: code
        }));

        this.changed.code = this.props.code;
        this.props.code = code;
    }

    /**
     * @param {OfferName} name
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateName(name, uniqueChecker) {
        if (name.equals(this.props.name)) {
            return;
        }
        if (!await uniqueChecker.isUniqueName(name)) {
            throw new errors.InvalidOfferName({
                message: `Offer 'name' must be unique. Please change and try again.`
            });
        }
        this.props.name = name;
    }

    /**
     * @private
     * @param {OfferProps} props
     * @param {object} options
     * @param {boolean} options.isNew
     */
    constructor(props, options) {
        /** @private */
        this.props = props;
        /** @private */
        this.options = options;
        /** @private */
        this.changed = {
            /** @type OfferCode */
            code: null
        };
        if (options.isNew) {
            this.events.push(OfferCreatedEvent.create({
                offer: this
            }));
        }
    }

    /**
     * @param {OfferCreateProps} data
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<Offer>}
     */
    static async create(data, uniqueChecker) {
        let isNew = false;
        let id;

        if (data.id instanceof ObjectID) {
            id = data.id;
        } else if (typeof data.id === 'string') {
            id = new ObjectID(data.id);
        } else {
            id = new ObjectID();
            isNew = true;
        }

        const name = OfferName.create(data.name);
        const code = OfferCode.create(data.code);
        const title = OfferTitle.create(data.display_title);
        const description = OfferDescription.create(data.display_description);
        const type = OfferType.create(data.type);
        const cadence = OfferCadence.create(data.cadence);
        const duration = OfferDuration.create(data.duration, data.duration_in_months);
        const status = OfferStatus.create(data.status || 'active');
        const createdAt = isNew ? OfferCreatedAt.create() : OfferCreatedAt.create(data.created_at);
        const lastRedeemed = data.last_redeemed ? new Date(data.last_redeemed).toISOString() : null;
        const stripeCouponId = data.stripe_coupon_id ?? null;

        if (isNew && data.redemptionCount !== undefined) {
            // TODO correct error
            throw new errors.InvalidOfferCode({
                message: 'An Offer cannot be created with redemptionCount'
            });
        }

        const redemptionCount = data.redemptionCount || 0;

        if (cadence.value === 'year' && duration.value.type === 'repeating') {
            throw new errors.InvalidOfferDuration({
                message: 'Offer `duration` must be "once" or "forever" for the "yearly" cadence.',
                code: 'INVALID_YEARLY_DURATION'
            });
        }

        //CASE: For offer type trial, the duration can only be `trial`
        if (type.value === 'trial' && duration.value.type !== 'trial') {
            throw new errors.InvalidOfferDuration({
                message: 'Offer `duration` must be "trial" for offer type "trial".'
            });
        }

        let currency = null;
        let amount;
        if (type.equals(OfferType.Percentage)) {
            amount = OfferAmount.OfferPercentageAmount.create(data.amount);
        } else if (type.equals(OfferType.Trial)) {
            amount = OfferAmount.OfferTrialAmount.create(data.amount);
        } else if (type.equals(OfferType.Fixed)) {
            amount = OfferAmount.OfferFixedAmount.create(data.amount);
            currency = OfferCurrency.create(data.currency);
        }

        if (isNew) {
            if (!await uniqueChecker.isUniqueName(name)) {
                throw new errors.InvalidOfferName({
                    message: `Offer 'name' must be unique. Please change and try again.`
                });
            }
        }

        if (isNew) {
            if (!await uniqueChecker.isUniqueCode(code)) {
                throw new errors.InvalidOfferCode({
                    message: `Offer 'code' must be unique. Please change and try again.`
                });
            }
        }

        const tier = OfferTier.create(data.tier);
        const redemptionType = OfferRedemptionType.create(data.redemption_type || 'signup');

        return new Offer({
            id,
            name,
            code,
            display_title: title,
            display_description: description,
            type,
            amount,
            cadence,
            duration,
            currency,
            tier,
            stripeCouponId,
            redemptionCount,
            redemptionType,
            status,
            createdAt,
            lastRedeemed
        }, {isNew});
    }

    /**
     * @param {object} stripeCoupon
     * @param {string} stripeCoupon.id
     * @param {number} [stripeCoupon.percent_off]
     * @param {number} [stripeCoupon.amount_off]
     * @param {string} [stripeCoupon.currency]
     * @param {string} stripeCoupon.duration
     * @param {number} [stripeCoupon.duration_in_months]
     * @param {string} cadence
     * @param {TierProps} tier
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<Offer>}
     */
    static async createFromStripeCoupon(stripeCoupon, cadence, tier, uniqueChecker) {
        const coupon = StripeCoupon.create(stripeCoupon);

        let name;
        let type;
        let amount;
        let currency = null;

        const durationText = coupon.duration_in_months
            ? `for ${coupon.duration_in_months} months`
            : coupon.duration;

        if (coupon.percent_off) {
            type = 'percent';
            amount = coupon.percent_off;
            name = `${coupon.percent_off}% off ${durationText} (${coupon.id})`;
        } else if (coupon.amount_off) {
            type = 'fixed';
            amount = coupon.amount_off;
            currency = coupon.currency;
            name = `${currency.toUpperCase()} ${amount / 100} off ${durationText} (${coupon.id})`;
        }

        // Create the offer as archived, so that it can't be used for new signups
        const status = 'archived';

        const data = {
            name,
            code: coupon.id,
            display_title: name,
            display_description: '',
            type,
            amount,
            cadence,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months,
            currency,
            status,
            tier: {
                id: tier.id,
                name: tier.name
            },
            stripe_coupon_id: coupon.id,
            redemption_type: 'signup'
        };

        return this.create(data, uniqueChecker);
    }
}

module.exports = Offer;
