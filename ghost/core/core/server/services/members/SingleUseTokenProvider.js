// @ts-check
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const crypto = require('node:crypto');
const {hotp} = require('otplib');

const messages = {
    OTC_SECRET_NOT_CONFIGURED: 'OTC secret not configured',
    INVALID_OTC_VERIFICATION_HASH: 'Invalid OTC verification hash',
    INVALID_TOKEN: 'Invalid token provided',
    TOKEN_EXPIRED: 'Token expired',
    DERIVE_OTC_MISSING_INPUT: 'tokenId and tokenValue are required'
};

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
     * @param {Object} [options] - Optional configuration object
     * @param {Object} [options.transacting] - Database transaction object
     * @param {string} [options.otcVerification] - OTC verification hash for additional validation
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

        if (options.otcVerification) {
            const isValidOTCVerification = await this._validateOTCVerificationHash(options.otcVerification, token);
            if (!isValidOTCVerification) {
                throw new ValidationError({
                    message: tpl(messages.INVALID_OTC_VERIFICATION_HASH),
                    code: 'INVALID_OTC_VERIFICATION_HASH'
                });
            }
        }

        const model = await this.model.findOne({token}, {transacting: options.transacting, forUpdate: true});

        if (!model) {
            throw new ValidationError({
                message: tpl(messages.INVALID_TOKEN),
                code: 'INVALID_TOKEN'
            });
        }

        if (model.get('used_count') >= this.maxUsageCount) {
            throw new ValidationError({
                message: tpl(messages.TOKEN_EXPIRED),
                code: 'TOKEN_EXPIRED'
            });
        }

        const createdAtEpoch = model.get('created_at').getTime();
        const firstUsedAtEpoch = model.get('first_used_at')?.getTime() ?? createdAtEpoch;

        // Is this token already used?
        if (model.get('used_count') > 0) {
            const timeSinceFirstUsage = Date.now() - firstUsedAtEpoch;

            if (timeSinceFirstUsage > this.validityPeriodAfterUsage) {
                throw new ValidationError({
                    message: tpl(messages.TOKEN_EXPIRED),
                    code: 'TOKEN_EXPIRED'
                });
            }
        }
        const tokenLifetimeMilliseconds = Date.now() - createdAtEpoch;

        if (tokenLifetimeMilliseconds > this.validityPeriod) {
            throw new ValidationError({
                message: tpl(messages.TOKEN_EXPIRED),
                code: 'TOKEN_EXPIRED'
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
                message: tpl(messages.OTC_SECRET_NOT_CONFIGURED),
                code: 'OTC_SECRET_NOT_CONFIGURED'
            });
        }

        if (!tokenId || !tokenValue) {
            throw new ValidationError({
                message: tpl(messages.DERIVE_OTC_MISSING_INPUT),
                code: 'DERIVE_OTC_MISSING_INPUT'
            });
        }

        const counter = this.deriveCounter(tokenId, tokenValue);
        return hotp.generate(this.secret, counter);
    }

    /**
     * @method verifyOTC
     * Verifies an OTC (one-time code) by looking up the token and performing HOTP verification
     *
     * @param {string} otcRef - Reference for the one-time code
     * @param {string} otc - The one-time code to verify
     * @returns {Promise<boolean>} Returns true if the OTC is valid, false otherwise
     */
    async verifyOTC(otcRef, otc) {
        if (!this.secret || !otcRef || !otc) {
            return false;
        }

        try {
            const model = await this.model.findOne({id: otcRef});

            if (!model) {
                return false;
            }

            const tokenValue = model.get('token');
            const counter = this.deriveCounter(otcRef, tokenValue);
            return hotp.verify({token: otc, secret: this.secret, counter});
        } catch (err) {
            return false;
        }
    }

    /**
     * @method getIdByToken
     * Retrieves the ID associated with a given token.
     *
     * @param {string} token - The token to look up.
     * @returns {Promise<string|null>} The ID if found, or null if not found or on error.
     */
    async getIdByToken(token) {
        try {
            const model = await this.model.findOne({token});
            return model ? model.get('id') : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * @method getTokenByRef
     * Retrieves the token associated with a given reference.
     *
     * @param {string} ref - The reference to look up.
     * @returns {Promise<string|null>} The token if found, or null if not found or on error.
     */
    async getTokenByRef(ref) {
        try {
            const model = await this.model.findOne({id: ref});
            return model ? model.get('token') : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * @method createOTCVerificationHash
     * Creates an OTC verification hash for a given token and one-time code.
     *
     * @param {string} otc - The one-time code
     * @param {string} token - The token value
     * @param {number} [timestamp] - Optional timestamp to use for the hash, defaults to current time
     * @returns {string} The OTC verification hash
     */
    createOTCVerificationHash(otc, token, timestamp) {
        if (!this.secret) {
            throw new ValidationError({
                message: tpl(messages.OTC_SECRET_NOT_CONFIGURED),
                code: 'OTC_SECRET_NOT_CONFIGURED'
            });
        }

        // timestamp allows us to restrict the hash's lifetime window
        timestamp ??= Math.floor(Date.now() / 1000);

        const dataToHash = `${otc}:${token}:${timestamp}`;

        const secret = Buffer.from(this.secret, 'hex');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(dataToHash);

        return hmac.digest('hex');
    }

    /**
     * @private
     * @method _validateOTCVerificationHash
     * Validates OTC verification hash by recreating and comparing the hash.
     * Private because it's only used internally by the public validate method.
     *
     * @param {string} otcVerificationHash - The hash to validate (timestamp:hash format)
     * @param {string} token - The token value
     * @returns {Promise<boolean>} - True if hash is valid, false otherwise
     */
    async _validateOTCVerificationHash(otcVerificationHash, token) {
        try {
            if (!this.secret || !otcVerificationHash || !token) {
                return false;
            }

            // Parse timestamp:hash format
            const parts = otcVerificationHash.split(':');
            if (parts.length !== 2) {
                return false;
            }

            const timestamp = parseInt(parts[0]);
            const providedHash = parts[1];

            // Check if hash is expired (5 minute window)
            const now = Math.floor(Date.now() / 1000);
            const maxAge = 5 * 60; // 5 minutes in seconds
            if (now - timestamp > maxAge) {
                return false;
            }

            const tokenId = await this.getIdByToken(token);
            if (!tokenId) {
                return false;
            }

            // Derive the original OTC that was used to create this hash
            const otc = this.deriveOTC(tokenId, token);

            const expectedHash = this.createOTCVerificationHash(otc, token, timestamp);

            // Compare the hashes using constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(providedHash, 'hex'),
                Buffer.from(expectedHash, 'hex')
            );
        } catch (err) {
            return false;
        }
    }
}

module.exports = SingleUseTokenProvider;
