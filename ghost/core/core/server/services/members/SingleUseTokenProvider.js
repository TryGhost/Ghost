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
     * @param {import('./MembersConfigProvider')} dependencies.membersConfig - Members config provider for auth secrets.
     */
    constructor({SingleUseTokenModel, validityPeriod, validityPeriodAfterUsage, maxUsageCount, membersConfig}) {
        this.model = SingleUseTokenModel;
        this.validityPeriod = validityPeriod;
        this.validityPeriodAfterUsage = validityPeriodAfterUsage;
        this.maxUsageCount = maxUsageCount;
        this.membersConfig = membersConfig;
        
        hotp.options = {digits: 6};
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
     * Derives a counter from token ID and value using HMAC
     *
     * @param {string} tokenId
     * @param {string} tokenValue
     * @returns {number}
     */
    deriveCounter(tokenId, tokenValue) {
        const secret = this.membersConfig.getAuthSecret();
        const mac = crypto.createHmac('sha256', secret)
            .update(`${tokenId}|${tokenValue}`)
            .digest();
        return mac.readUInt32BE(0);
    }

    /**
     * @method deriveCode
     * Derives a HOTP code from a token object
     *
     * @param {Object} token
     * @param {string} token.id - Token ID
     * @param {string} token.token - Token value
     * @returns {string}
     */
    deriveCode(token) {
        const secret = this.membersConfig.getAuthSecret().toString('hex');
        const counter = this.deriveCounter(token.id, token.token);
        return hotp.generate(secret, counter);
    }

    /**
     * @method verifyCode
     * Verifies a HOTP code against a token object
     *
     * @param {Object} token
     * @param {string} token.id - Token ID
     * @param {string} token.token - Token value
     * @param {string} code - The code to verify
     * @returns {boolean}
     */
    verifyCode(token, code) {
        const secret = this.membersConfig.getAuthSecret().toString('hex');
        const counter = this.deriveCounter(token.id, token.token);
        return hotp.verify({token: code, secret, counter});
    }
}

module.exports = SingleUseTokenProvider;
