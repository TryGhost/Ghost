const ObjectID = require('bson-objectid').default;
const {ValidationError} = require('@tryghost/errors');

module.exports = class Milestone {
    /**
     * @type {ObjectID}
     */
    #id;
    get id() {
        return this.#id;
    }

    /**
     * @type {'arr' | 'members'}
     */
    #type;
    get type() {
        return this.#type;
    }

    /**
     * @type {string}
     */
    #name;
    get name() {
        return this.#name;
    }

    /** @type {number} */
    #value;
    get value() {
        return this.#value;
    }

    /** @type {Date} */
    #createdAt;
    get createdAt() {
        return this.#createdAt;
    }

    /** @type {Date | null} */
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
            createdAt: this.createdAt,
            emailSentAt: this.emailSentAt
        };
    }

    /** @private */
    constructor(data) {
        this.#id = data.id;
        this.#name = data.name;
        this.#type = data.type;
        this.#value = data.value;
        this.#createdAt = data.createdAt;
        this.#emailSentAt = data.emailSentAt;
    }

    /**
     * @param {any} data
     * @returns {Promise<Milestone>}
     */
    static async create(data) {
        const id = validateId(data.id);
        const type = validateType(data.type);
        const value = validateValue(data.value);
        const name = validateName(data.name, value, type);
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

        return new Milestone({
            id,
            name,
            type,
            value,
            createdAt,
            emailSentAt
        });
    }
};

function validateId(id) {
    if (!id) {
        return new ObjectID();
    }
    if (typeof id === 'string') {
        return ObjectID.createFromHexString(id);
    }
    if (id instanceof ObjectID) {
        return id;
    }
    return new ObjectID();
}

function validateValue(value) {
    if (!value || typeof value !== 'number' || value === 0) {
        throw new ValidationError({
            message: 'Invalid value'
        });
    }

    return value;
}

function validateType(type) {
    if (type === 'arr') {
        return 'arr';
    }

    return 'members';
}

function validateName(name, value, type) {
    if (!name || !name.match(/(arr|members)-\d*/i)) {
        return `${type}-${value}`;
    }

    return name;
}

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

