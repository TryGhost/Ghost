// @ts-check
const {ValidationError} = require('@tryghost/errors');
const crypto = require('node:crypto');
const {hotp} = require('otplib');

class SingleUseTokenProvider {
    /**
     * @param {Object} dependencies
     * @param {import('../../models/base')} dependencies.SingleUseTokenModel - A model for creating and retrieving tokens.
     * @param {number} dependencies.validityPeriod - How long a token is valid for from it's creation in milliseconds.
     * @param {number} dependencies.validityPeriodAfterUsage - How long a token is valid after first usage, in milliseconds.
     * @param {number} dependencies.maxUsageCount - How many times a token can be used.
     * @param {string} [dependencies.secret] - Secret for generating and verifying OTP codes.
     */
    constructor({SingleUseTokenModel, validityPeriod, validityPeriodAfterUsage, maxUsageCount, secret}) {
        this.model = SingleUseTokenModel;
        this.validityPeriod = validityPeriod;
        this.validityPeriodAfterUsage = validityPeriodAfterUsage;
        this.maxUsageCount = maxUsageCount;
        this.secret = secret;
    }

    /**
     * @method create
     * Creates and stores a token, with the passed data associated with it.
     * Returns the created token value.
     *
     * @param {Object<string, any>} data
     *
     * @returns {Promise<string>}
     */
    async create(data) {
        const model = await this.model.add({
            data: JSON.stringify(data)
        });

        return model.get('token');
    }

    /**
     * @method validate
     * Validates a token, returning any parsable data associated.
     * If the token is invalid the returned Promise will reject.
     *
     * @param {string} token
     *
     * @returns {Promise<Object<string, any>>}
     */
    async validate(token, options = {}) {
        if (!options.transacting) {
            return await this.model.transaction((transacting) => {
                return this.validate(token, {
                    ...options,
                    transacting
                });
            });
        }

        const model = await this.model.findOne({token}, {transacting: options.transacting, forUpdate: true});

        if (!model) {
            throw new ValidationError({
                message: 'Invalid token provided'
            });
        }

        if (model.get('used_count') >= this.maxUsageCount) {
            throw new ValidationError({
                message: 'Token expired'
            });
        }

        const createdAtEpoch = model.get('created_at').getTime();
        const firstUsedAtEpoch = model.get('first_used_at')?.getTime() ?? createdAtEpoch;

        // Is this token already used?
        if (model.get('used_count') > 0) {
            const timeSinceFirstUsage = Date.now() - firstUsedAtEpoch;

            if (timeSinceFirstUsage > this.validityPeriodAfterUsage) {
                throw new ValidationError({
                    message: 'Token expired'
                });
            }
        }
        const tokenLifetimeMilliseconds = Date.now() - createdAtEpoch;

        if (tokenLifetimeMilliseconds > this.validityPeriod) {
            throw new ValidationError({
                message: 'Token expired'
            });
        }

        if (!model.get('first_used_at')) {
            await model.save({
                first_used_at: new Date(),
                updated_at: new Date(),
                used_count: model.get('used_count') + 1
            }, {autoRefresh: false, patch: true, transacting: options.transacting});
        } else {
            await model.save({
                used_count: model.get('used_count') + 1,
                updated_at: new Date()
            }, {autoRefresh: false, patch: true, transacting: options.transacting});
        }

        try {
            return JSON.parse(model.get('data'));
        } catch (err) {
            return {};
        }
    }

    /**
     * @private
     * @method deriveCounter
     * Derives a counter from a token ID and value
     *
     * @param {string} tokenId
     * @param {string} tokenValue
     * @returns {number}
     */
    deriveCounter(tokenId, tokenValue) {
        const msg = `${tokenId}|${tokenValue}`;
        const digest = crypto.createHash('sha256').update(msg).digest();
        return digest.readUInt32BE(0);
    }

    /**
     * @method deriveOTC
     * Derives an OTC (one-time code) from a token ID and value
     *
     * @param {string} tokenId - Token ID
     * @param {string} tokenValue - Token value
     * @returns {string} The generated one-time code
     */
    deriveOTC(tokenId, tokenValue) {
        if (!this.secret) {
            throw new ValidationError({
                message: 'Cannot derive OTC: secret not configured'
            });
        }

        if (!tokenId || !tokenValue) {
            throw new ValidationError({
                message: 'Cannot derive OTC: tokenId and tokenValue are required'
            });
        }
        
        const counter = this.deriveCounter(tokenId, tokenValue);
        return hotp.generate(this.secret, counter);
    }
}

module.exports = SingleUseTokenProvider;
