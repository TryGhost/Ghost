const errors = require('../../errors');
const ObjectID = require('bson-objectid').default;

const OfferName = require('./OfferName');
const OfferCode = require('./OfferCode');
const OfferAmount = require('./OfferAmount');
const OfferTitle = require('./OfferTitle');
const OfferDescription = require('./OfferDescription');
const OfferCadence = require('./OfferCadence');
const OfferType = require('./OfferType');

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
 * @prop {string} currency
 * @prop {string} [stripe_coupon_id]
 * @prop {OfferTier} tier
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
     * @param {OfferCode} code
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateCode(code, uniqueChecker) {
        if (code.equals(this.props.code)) {
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
     * @param {OfferName} name
     * @param {UniqueChecker} uniqueChecker
     * @returns {Promise<void>}
     */
    async updateName(name, uniqueChecker) {
        if (name.equals(this.props.name)) {
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

        const name = OfferName.create(data.name);
        const code = OfferCode.create(data.code);
        const title = OfferTitle.create(data.display_title);
        const description = OfferDescription.create(data.display_description);
        const type = OfferType.create(data.type);
        const cadence = OfferCadence.create(data.cadence);
        let amount;
        if (type.equals(OfferType.Percent)) {
            amount = OfferAmount.OfferPercentageAmount.create(data.amount);
        } else {
            amount = OfferAmount.OfferAbsoluteAmount.create(data.amount);
        }

        if (isNew) {
            if (!await uniqueChecker.isUniqueName(name)) {
                throw new errors.InvalidOfferName({
                    message: 'Offer `name` must be unique.'
                });
            }
        }

        if (isNew) {
            if (!await uniqueChecker.isUniqueCode(code)) {
                throw new errors.InvalidOfferCode({
                    message: 'Offer `code` must be unique.'
                });
            }
        }

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
