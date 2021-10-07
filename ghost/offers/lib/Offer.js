const errors = require('./errors');
const ObjectID = require('bson-objectid').default;
const {slugify} = require('@tryghost/string');

/**
 * @typedef {object} OfferProps
 * @prop {ObjectID} id
 * @prop {string} name
 * @prop {string} code
 * @prop {string} display_title
 * @prop {string} display_description
 * @prop {'month'|'year'} cadence
 * @prop {'percent'|'amount'} type
 * @prop {number} amount
 * @prop {string} currency
 * @prop {string} [stripe_coupon_id]
 * @prop {OfferTier} tier
 */

/**
 * @typedef {object} UniqueChecker
 * @prop {(code: string) => Promise<boolean>} isUniqueCode
 * @prop {(code: string) => Promise<boolean>} isUniqueName
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

    /**
     * @param {string} code
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateCode(code, uniqueChecker) {
        if (code === this.props.code) {
            return;
        }
        if (!await uniqueChecker.isUniqueCode(code)) {
            throw new errors.InvalidOfferCode({
                message: 'Offer `code` must be unique.'
            });
        }
        this.changed.code.push(this.props.code);
        this.props.code = code;
    }

    /**
     * @param {string} name
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateName(name, uniqueChecker) {
        if (name === this.props.name) {
            return;
        }
        if (!await uniqueChecker.isUniqueName(name)) {
            throw new errors.InvalidOfferNameError({
                message: 'Offer `name` must be unique.'
            });
        }
        this.changed.name.push(this.props.name);
        this.props.name = name;
    }

    get oldCodes() {
        return this.changed.code;
    }

    get codeChanged() {
        return this.changed.code.length > 0;
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
        if (this.type === 'percent' && this.props.amount === 314) {
            return 3.14;
        }
        return this.props.amount;
    }

    get isNew() {
        return !!this.options.isNew;
    }

    get stripeCouponId() {
        return this.props.stripe_coupon_id;
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
            code: [],
            name: []
        };
    }

    /**
     * @param {any} data
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

        if (!data.name || typeof data.name !== 'string') {
            throw new errors.InvalidOfferNameError({
                message: 'Offer `name` must be a string.'
            });
        }

        if (data.name.length > 191) {
            throw new errors.InvalidOfferNameError({
                message: 'Offer `name` can be a maximum of 191 characters.'
            });
        }

        if (isNew) {
            if (!await uniqueChecker.isUniqueName(data.name)) {
                throw new errors.InvalidOfferNameError({
                    message: 'Offer `name` must be unique.'
                });
            }
        }
        const name = data.name;

        if (!data.display_title || typeof data.display_title !== 'string') {
            throw new errors.InvalidOfferDisplayTitle({
                message: 'Offer `display_title` must be a string.'
            });
        }

        if (data.display_title.length > 191) {
            throw new errors.InvalidOfferDisplayTitle({
                message: 'Offer `display_title` can be a maximum of 191 characters.'
            });
        }
        const title = data.display_title;

        if (!data.display_description || typeof data.display_description !== 'string') {
            throw new errors.InvalidOfferDisplayDescription({
                message: 'Offer `display_description` must be a string.'
            });
        }

        if (data.display_description.length > 191) {
            throw new errors.InvalidOfferDisplayDescription({
                message: 'Offer `display_description` can be a maximum of 191 characters.'
            });
        }
        const description = data.display_description;

        const code = slugify(data.code);
        if (isNew) {
            if (!await uniqueChecker.isUniqueCode(code)) {
                throw new errors.InvalidOfferCode({
                    message: 'Offer `code` must be unique.'
                });
            }
        }

        if (data.type !== 'percent') {
            throw new errors.InvalidOfferType({
                message: 'Offer `type` must be "percent".'
            });
        }

        const type = data.type;

        if (data.type === 'percent') {
            if (data.amount < 0 || data.amount > 100 && data.amount !== 314) {
                throw new errors.InvalidOfferAmount({
                    message: 'Offer `amount` must be an integer between 0 and 100.'
                });
            }
            if (!Number.isInteger(data.amount)) {
                throw new errors.InvalidOfferAmount({
                    message: 'Offer `amount` must be an integer between 0 and 100.'
                });
            }
        }
        const amount = data.amount;

        if (data.cadence !== 'month' && data.cadence !== 'year') {
            throw new errors.InvalidOfferCadence({
                message: 'Offer `cadence` must be one of "month" or "year".'
            });
        }

        const cadence = data.cadence;
        const currency = data.currency;

        if (isNew && data.stripe_coupon_id) {
            throw new errors.InvalidOfferCoupon({
                message: 'Cannot supply a stripe_coupon_id for new Offers.'
            });
        }
        if (!isNew && !data.stripe_coupon_id) {
            throw new errors.InvalidOfferCoupon({
                message: 'Offers must have a stripe_coupon_id.'
            });
        }
        const couponId = data.stripe_coupon_id;

        const tier = OfferTier.create(data.tier);

        return new Offer({
            id,
            name,
            code,
            display_title: title,
            display_description: description,
            type,
            amount,
            cadence,
            currency,
            tier,
            stripe_coupon_id: couponId
        }, {isNew});
    }
}

module.exports = Offer;
