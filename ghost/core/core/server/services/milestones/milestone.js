const ObjectID = require('bson-objectid').default;
const {ValidationError} = require('@tryghost/errors');
const MilestoneCreatedEvent = require('./milestone-created-event');

module.exports = class Milestone {
    /** @type {Array} */
    events = [];

    /**
     * @type {ObjectID}
     */
    #id;
    get id() {
        return this.#id;
    }

    /**
     * @type {'arr'|'members'}
     */
    #type;
    get type() {
        return this.#type;
    }

    /** @type {number} */
    #value;
    get value() {
        return this.#value;
    }

    /** @type {string} */
    #currency;
    get currency() {
        return this.#currency;
    }

    /** @type {Date} */
    #createdAt;
    get createdAt() {
        return this.#createdAt;
    }

    /** @type {Date|null} */
    #emailSentAt;
    get emailSentAt() {
        return this.#emailSentAt;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            value: this.value,
            currency: this.currency,
            createdAt: this.createdAt,
            emailSentAt: this.emailSentAt
        };
    }

    /** @private */
    constructor(data) {
        this.#id = data.id;
        this.#type = data.type;
        this.#value = data.value;
        this.#currency = data.currency;
        this.#createdAt = data.createdAt;
        this.#emailSentAt = data.emailSentAt;
    }

    /**
     * @returns {string}
     */
    get name() {
        if (this.type === 'arr') {
            return `arr-${this.value}-${this.currency}`;
        }
        return `members-${this.value}`;
    }

    /**
     * @param {any} data
     * @returns {Promise<Milestone>}
     */
    static async create(data) {
        /** @type ObjectID */
        let id;
        let isNew = false;
        if (!data.id) {
            isNew = true;
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: 'Invalid ID provided for Milestone'
            });
        }

        const type = validateType(data.type);
        const currency = validateCurrency(type, data?.currency);
        const value = validateValue(data.value);
        const name = validateName(data.name, value, type, currency);
        const emailSentAt = validateEmailSentAt(data);

        /** @type Date */
        let createdAt;
        if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
        } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
            if (isNaN(createdAt.valueOf())) {
                throw new ValidationError({
                    message: 'Invalid Date'
                });
            }
        } else {
            createdAt = new Date();
        }

        const milestone = new Milestone({
            id,
            name,
            type,
            value,
            currency,
            createdAt,
            emailSentAt
        });

        if (isNew) {
            milestone.events.push(MilestoneCreatedEvent.create({milestone, meta: data?.meta}));
        }

        return milestone;
    }
};

/**
 *
 * @param {number|null} value
 *
 * @returns {number}
 */
function validateValue(value) {
    if (value === undefined || typeof value !== 'number') {
        throw new ValidationError({
            message: 'Invalid value'
        });
    }

    return value;
}

/**
 *
 * @param {unknown} type
 *
 * @returns {'arr'|'members'}
 */
function validateType(type) {
    if (type === 'arr') {
        return 'arr';
    }

    return 'members';
}

/**
 *
 * @param {'arr'|'members'} type
 * @param {string|null} currency
 *
 * @returns {string}
 */
function validateCurrency(type, currency) {
    if (type === 'members') {
        return null;
    }

    if (!currency || (currency && typeof currency !== 'string' || currency.length > 3)) {
        return 'usd';
    }

    return currency;
}

/**
 *
 * @param {string} name
 * @param {number} value
 * @param {'arr'|'members'} type
 * @param {string|null} currency
 *
 * @returns {string}
 */
function validateName(name, value, type, currency) {
    if (!name || !name.match(/(arr|members)-\d*/i)) {
        return type === 'arr' ? `${type}-${value}-${currency}` : `${type}-${value}`;
    }

    return name;
}

/**
 *
 * @param {object} data
 * @param {Date|null} data.emailSentAt
 *
 * @returns {Date|null}
 */
function validateEmailSentAt(data) {
    let emailSentAt;
    if (data.emailSentAt instanceof Date) {
        emailSentAt = data.emailSentAt;
    } else if (data.emailSentAt) {
        emailSentAt = new Date(data.emailSentAt);
        if (isNaN(emailSentAt.valueOf())) {
            throw new ValidationError({
                message: 'Invalid Date'
            });
        }
    } else {
        emailSentAt = null;
    }

    return emailSentAt;
}

