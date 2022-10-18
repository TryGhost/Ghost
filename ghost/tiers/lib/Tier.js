const ObjectID = require('bson-objectid').default;
const {ValidationError} = require('@tryghost/errors');

module.exports = class Tier {
    /** @type {ObjectID} */
    #id;
    get id() {
        return this.#id;
    }

    /** @type {string} */
    #slug;
    get slug() {
        return this.#slug;
    }

    /** @type {string} */
    #name;
    get name() {
        return this.#name;
    }
    set name(value) {
        this.#name = validateName(value);
    }

    /** @type {string[]} */
    #benefits;
    get benefits() {
        return this.#benefits;
    }
    set benefits(value) {
        this.#benefits = validateBenefits(value);
    }

    /** @type {string} */
    #description;
    get description() {
        return this.#description;
    }
    set description(value) {
        this.#description = validateDescription(value);
    }

    /** @type {URL} */
    #welcomePageURL;
    get welcomePageURL() {
        return this.#welcomePageURL;
    }
    set welcomePageURL(value) {
        this.#welcomePageURL = validateWelcomePageURL(value);
    }

    /** @type {'active'|'archived'} */
    #status;
    get status() {
        return this.#status;
    }
    set status(value) {
        this.#status = validateStatus(value);
    }

    /** @type {'public'} */
    #visibility;
    get visibility() {
        return this.#visibility;
    }

    /** @type {'paid'|'free'} */
    #type;
    get type() {
        return this.#type;
    }

    /** @type {number|null} */
    #trialDays;
    get trialDays() {
        return this.#trialDays;
    }
    set trialDays(value) {
        this.#trialDays = validateTrialDays(value, this.#type);
    }

    /** @type {string|null} */
    #currency;
    get currency() {
        return this.#currency;
    }
    set currency(value) {
        this.#currency = validateCurrency(value, this.#type);
    }

    /** @type {number|null} */
    #monthlyPrice;
    get monthlyPrice() {
        return this.#monthlyPrice;
    }
    set monthlyPrice(value) {
        this.#monthlyPrice = validateMonthlyPrice(value, this.#type);
    }

    /** @type {number|null} */
    #yearlyPrice;
    get yearlyPrice() {
        return this.#yearlyPrice;
    }
    set yearlyPrice(value) {
        this.#yearlyPrice = validateYearlyPrice(value, this.#type);
    }

    /** @type {Date} */
    #createdAt;
    get createdAt() {
        return this.#createdAt;
    }

    /** @type {Date|null} */
    #updatedAt;
    get updatedAt() {
        return this.#updatedAt;
    }

    toJSON() {
        return {
            id: this.#id,
            slug: this.#slug,
            name: this.#name,
            description: this.#description,
            welcomePageURL: this.#welcomePageURL,
            status: this.#status,
            visibility: this.#visibility,
            type: this.#type,
            trialDays: this.#trialDays,
            currency: this.#currency,
            monthlyPrice: this.#monthlyPrice,
            yearlyPrice: this.#yearlyPrice,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
            benefits: this.#benefits
        };
    }

    /**
     * @private
     */
    constructor(data) {
        this.#id = data.id;
        this.#slug = data.slug;
        this.#name = data.name;
        this.#description = data.description;
        this.#welcomePageURL = data.welcome_page_url;
        this.#status = data.status;
        this.#visibility = data.visibility;
        this.#type = data.type;
        this.#trialDays = data.trial_days;
        this.#currency = data.currency;
        this.#monthlyPrice = data.monthly_price;
        this.#yearlyPrice = data.yearly_price;
        this.#createdAt = data.created_at;
        this.#updatedAt = data.updated_at;
        this.#benefits = data.benefits;
    }

    /**
     * @param {any} data
     * @param {ISlugService} slugService
     * @returns {Promise<Tier>}
     */
    static async create(data, slugService) {
        let id;
        if (!data.id) {
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: 'Invalid ID provided for Tier'
            });
        }

        let name = validateName(data.name);

        let slug;
        if (data.slug) {
            slug = await slugService.validate(data.slug);
        } else {
            slug = await slugService.generate(name);
        }

        let description = validateDescription(data.description);
        let welcomePageURL = validateWelcomePageURL(data.welcome_page_url);
        let status = validateStatus(data.status || 'active');
        let visibility = validateVisibility(data.visibility || 'public');
        let type = validateType(data.type || 'paid');
        let currency = validateCurrency(data.currency || null, type);
        let trialDays = validateTrialDays(data.trial_days || null, type);
        let monthlyPrice = validateMonthlyPrice(data.monthly_price || null, type);
        let yearlyPrice = validateYearlyPrice(data.yearly_price || null , type);
        let createdAt = validateCreatedAt(data.created_at);
        let updatedAt = validateUpdatedAt(data.updated_at);
        let benefits = validateBenefits(data.benefits);

        return new Tier({
            id,
            slug,
            name,
            description,
            welcome_page_url: welcomePageURL,
            status,
            visibility,
            type,
            trial_days: trialDays,
            currency,
            monthly_price: monthlyPrice,
            yearly_price: yearlyPrice,
            created_at: createdAt,
            updated_at: updatedAt,
            benefits
        });
    }
};

function validateName(value) {
    if (typeof value !== 'string') {
        throw new ValidationError({
            message: 'Tier name must be a string with a maximum of 191 characters'
        });
    }

    if (value.length > 191) {
        throw new ValidationError({
            message: 'Tier name must be a string with a maximum of 191 characters'
        });
    }

    return value;
}

function validateWelcomePageURL(value) {
    if (value instanceof URL) {
        return value;
    }
    if (!value) {
        return null;
    }
    try {
        return new URL(value);
    } catch (err) {
        throw new ValidationError({
            err,
            message: 'Tier Welcome Page URL must be a URL'
        });
    }
}

function validateDescription(value) {
    if (!value) {
        return null;
    }
    if (typeof value !== 'string') {
        throw new ValidationError({
            message: 'Tier description must be a string with a maximum of 191 characters'
        });
    }
    if (value.length > 191) {
        throw new ValidationError({
            message: 'Tier description must be a string with a maximum of 191 characters'
        });
    }
}

function validateStatus(value) {
    if (value !== 'active' && value !== 'archived') {
        throw new ValidationError({
            message: 'Tier status must be either "active" or "archived"'
        });
    }
    return value;
}

function validateVisibility(value) {
    if (value !== 'public' && value !== 'none') {
        throw new ValidationError({
            message: 'Tier visibility must be either "public" or "none"'
        });
    }
    return value;
}

function validateType(value) {
    if (value !== 'paid' && value !== 'free') {
        throw new ValidationError({
            message: 'Tier type must be either "paid" or "free"'
        });
    }
    return value;
}

function validateTrialDays(value, type) {
    if (type === 'free') {
        if (value !== null) {
            throw new ValidationError({
                message: 'Free Tiers cannot have a trial'
            });
        }
        return null;
    }
    if (!value) {
        return null;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new ValidationError({
            message: 'Tier trials must be an integer greater than 0'
        });
    }
    return value;
}

function validateCurrency(value, type) {
    if (type === 'free') {
        if (value !== null) {
            throw new ValidationError({
                message: 'Free Tiers cannot have a currency'
            });
        }
        return null;
    }
    if (typeof value !== 'string') {
        throw new ValidationError({
            message: 'Tier currency must be a 3 letter ISO currency code'
        });
    }
    if (value.length !== 3) {
        throw new ValidationError({
            message: 'Tier currency must be a 3 letter ISO currency code'
        });
    }
    return value.toUpperCase();
}

function validateMonthlyPrice(value, type) {
    if (type === 'free') {
        if (value !== null) {
            throw new ValidationError({
                message: 'Free Tiers cannot have a monthly price'
            });
        }
        return null;
    }
    if (!Number.isSafeInteger(value)) {
        throw new ValidationError({
            message: ''
        });
    }
    if (value < 0) {
        throw new ValidationError({
            message: ''
        });
    }
    if (value > 9999999999) {
        throw new ValidationError({
            message: ''
        });
    }
    return value;
}

function validateYearlyPrice(value, type) {
    if (type === 'free') {
        if (value !== null) {
            throw new ValidationError({
                message: 'Free Tiers cannot have a yearly price'
            });
        }
        return null;
    }
    if (!Number.isSafeInteger(value)) {
        throw new ValidationError({
            message: ''
        });
    }
    if (value < 0) {
        throw new ValidationError({
            message: ''
        });
    }
    if (value > 9999999999) {
        throw new ValidationError({
            message: ''
        });
    }
    return value;
}

function validateCreatedAt(value) {
    if (!value) {
        return new Date();
    }
    if (value instanceof Date) {
        return value;
    }
    throw new ValidationError({
        message: 'Tier created_at must be a date'
    });
}

function validateUpdatedAt(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    throw new ValidationError({
        message: 'Tier created_at must be a date'
    });
}

function validateBenefits(value) {
    if (!value) {
        return [];
    }
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
        throw new ValidationError({
            message: 'Tier benefits must be a list of strings'
        });
    }
    return value;
}
