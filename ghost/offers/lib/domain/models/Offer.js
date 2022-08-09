const errors = require('../errors');
const ObjectID = require('bson-objectid').default;

const OfferName = require('./OfferName');
const OfferCode = require('./OfferCode');
const OfferAmount = require('./OfferAmount');
const OfferTitle = require('./OfferTitle');
const OfferDescription = require('./OfferDescription');
const OfferCadence = require('./OfferCadence');
const OfferType = require('./OfferType');
const OfferDuration = require('./OfferDuration');
const OfferCurrency = require('./OfferCurrency');
const OfferStatus = require('./OfferStatus');

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
 * @prop {OfferTier} tier
 * @prop {number} redemptionCount
 */

/**
 * @typedef {object} OfferCreateProps
 * @prop {string|ObjectID} id
 * @prop {string} name
 * @prop {string} code
 * @prop {string} display_title
 * @prop {string} display_description
 * @prop {string} cadence
 * @prop {string} type
 * @prop {number} amount
 * @prop {string} duration
 * @prop {number} duration_in_months
 * @prop {string} currency
 * @prop {string} status
 * @prop {number} redemptionCount
 * @prop {TierProps|OfferTier} tier
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

    get duration() {
        return this.props.duration;
    }

    get status() {
        return this.props.status;
    }

    get redemptionCount() {
        return this.props.redemptionCount;
    }

    set status(value) {
        this.props.status = value;
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

        if (isNew && data.redemptionCount !== undefined) {
            // TODO correct error
            throw new errors.InvalidOfferCode({
                message: 'An Offer cannot be created with redemptionCount'
            });
        }

        const redemptionCount = data.redemptionCount || 0;

        if (cadence.value === 'year' && duration.value.type === 'repeating') {
            throw new errors.InvalidOfferDuration({
                message: 'Offer `duration` must be "once" or "forever" for the "yearly" cadence.'
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
            redemptionCount,
            status
        }, {isNew});
    }
}

module.exports = Offer;
