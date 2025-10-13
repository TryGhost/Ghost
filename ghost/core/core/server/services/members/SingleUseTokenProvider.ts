/* eslint-disable ghost/filenames/match-regex */
/* eslint-disable @typescript-eslint/no-var-requires */
import type {Knex} from 'knex';

const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const crypto = require('node:crypto');
const {hotp} = require('otplib');

const messages = {
    OTC_SECRET_NOT_CONFIGURED: 'OTC secret not configured',
    INVALID_OTC_VERIFICATION_HASH: 'Invalid OTC verification hash',
    INVALID_TOKEN: 'Invalid token provided',
    TOKEN_EXPIRED: 'Token expired',
    OTC_EXPIRED: 'One-time code expired',
    DERIVE_OTC_MISSING_INPUT: 'tokenId and tokenValue are required'
};

interface TokenModel {
    id: string;
    get(key: 'token'): string;
    get(key: 'data'): string;
    get(key: 'uuid'): string;
    get(key: 'used_count'): number;
    get(key: 'otc_used_count'): number;
    get(key: 'created_at'): Date;
    get(key: 'first_used_at'): Date | null;
    get(key: string): unknown;
    save(data: Record<string, unknown>, options: {autoRefresh: boolean; patch: boolean; transacting: Knex.Transaction}): Promise<void>;
}

interface TokenModelStatic {
    add(data: {data: string}): Promise<TokenModel>;
    findOne(query: {token?: string; uuid?: string}, options?: {transacting?: Knex.Transaction; forUpdate?: boolean}): Promise<TokenModel | null>;
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
}

interface SingleUseTokenProviderDependencies {
    SingleUseTokenModel: TokenModelStatic;
    validityPeriod: number;
    validityPeriodAfterUsage: number;
    maxUsageCount: number;
    secret?: string;
}

interface ValidateOptions {
    transacting?: Knex.Transaction;
    otcVerification?: string;
}

class SingleUseTokenProvider {
    private model: TokenModelStatic;
    private validityPeriod: number;
    private validityPeriodAfterUsage: number;
    private maxUsageCount: number;
    private secret?: string;

    /**
     * @param dependencies - Configuration and dependencies for the token provider
     * @param dependencies.SingleUseTokenModel - A model for creating and retrieving tokens.
     * @param dependencies.validityPeriod - How long a token is valid for from its creation in milliseconds.
     * @param dependencies.validityPeriodAfterUsage - How long a token is valid after first usage, in milliseconds.
     * @param dependencies.maxUsageCount - How many times a token can be used.
     * @param dependencies.secret - Secret for generating and verifying OTP codes.
     */
    constructor({SingleUseTokenModel, validityPeriod, validityPeriodAfterUsage, maxUsageCount, secret}: SingleUseTokenProviderDependencies) {
        this.model = SingleUseTokenModel;
        this.validityPeriod = validityPeriod;
        this.validityPeriodAfterUsage = validityPeriodAfterUsage;
        this.maxUsageCount = maxUsageCount;
        this.secret = secret;
    }

    /**
     * Creates and stores a token, with the passed data associated with it.
     * Returns the created token value.
     *
     * @param data - The data to associate with the token
     * @returns The created token value
     */
    async create(data: Record<string, unknown>): Promise<string> {
        const model = await this.model.add({
            data: JSON.stringify(data)
        });

        return model.get('token');
    }

    /**
     * Validates a token, returning any parsable data associated.
     * If the token is invalid the returned Promise will reject.
     *
     * @param token - The token to validate
     * @param options - Optional configuration object
     * @param options.transacting - Database transaction object
     * @param options.otcVerification - OTC verification hash for additional validation
     * @returns The data associated with the token
     */
    async validate(token: string, options: ValidateOptions = {}): Promise<Record<string, unknown>> {
        if (!options.transacting) {
            return await this.model.transaction((transacting) => {
                return this.validate(token, {
                    ...options,
                    transacting
                });
            });
        }

        const isOTC = !!options.otcVerification;

        if (isOTC) {
            await this._validateOTCVerificationHash(options.otcVerification!, token);
        }

        const model = await this._findAndLockTokenModel(token, options.transacting);

        this._validateUsageCount(model, isOTC);
        this._validateTokenLifetime(model, isOTC);

        await this._incrementUsageCount(model, isOTC, options.transacting);

        try {
            return JSON.parse(model.get('data'));
        } catch (err) {
            return {};
        }
    }

    /**
     * Derives a counter from a token ID and value
     */
    deriveCounter(tokenId: string, tokenValue: string): number {
        const msg = `${tokenId}|${tokenValue}`;
        const digest = crypto.createHash('sha256').update(msg).digest();
        return digest.readUInt32BE(0);
    }

    /**
     * Derives an OTC (one-time code) from a token ID and value
     */
    deriveOTC(tokenId: string, tokenValue: string): string {
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
     * Verifies an OTC (one-time code) by looking up the token and performing HOTP verification
     *
     * @param otcRef - Reference for the one-time code
     * @param otc - The one-time code to verify
     * @returns Returns true if the OTC is valid, false otherwise
     */
    async verifyOTC(otcRef: string, otc: string): Promise<boolean> {
        if (!this.secret || !otcRef || !otc) {
            return false;
        }

        try {
            const model = await this.model.findOne({uuid: otcRef});

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
     * Retrieves the ref associated with a given token.
     *
     * @returns The ref if found, or null if not found or on error.
     */
    async getRefByToken(token: string): Promise<string | null> {
        try {
            const model = await this.model.findOne({token});
            return model ? model.get('uuid') : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Retrieves the token associated with a given reference.
     *
     * @returns The token if found, or null if not found or on error.
     */
    async getTokenByRef(ref: string): Promise<string | null> {
        try {
            const model = await this.model.findOne({uuid: ref});
            return model ? model.get('token') : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Creates an OTC verification hash for a given token and one-time code.
     *
     * @param otc - The one-time code
     * @param token - The token value
     * @param timestamp - Optional timestamp to use for the hash, defaults to current time
     * @returns The OTC verification hash
     */
    createOTCVerificationHash(otc: string, token: string, timestamp?: number): string {
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
     * Finds token in database and locks it for update
     *
     * @param token - The token to find
     * @param transacting - Database transaction object
     * @returns The token model
     */
    private async _findAndLockTokenModel(token: string, transacting: Knex.Transaction): Promise<TokenModel> {
        const model = await this.model.findOne({token}, {transacting, forUpdate: true});

        if (!model) {
            throw new ValidationError({
                message: tpl(messages.INVALID_TOKEN),
                code: 'INVALID_TOKEN'
            });
        }

        return model;
    }

    /**
     * Validates OTC verification hash, throwing on invalid hash.
     *
     * @param otcVerificationHash - The hash to validate (timestamp:hash format)
     * @param token - The token value
     */
    private async _validateOTCVerificationHash(otcVerificationHash: string, token: string): Promise<void> {
        const isValid = await this._isValidOTCVerificationHash(otcVerificationHash, token);

        if (!isValid) {
            throw new ValidationError({
                message: tpl(messages.INVALID_OTC_VERIFICATION_HASH),
                code: 'INVALID_OTC_VERIFICATION_HASH'
            });
        }
    }

    /**
     * Validates OTC verification hash by recreating and comparing the hash.
     * Returns true if the hash is valid, false otherwise.
     *
     * @param otcVerificationHash - The hash to validate (timestamp:hash format)
     * @param token - The token value
     * @returns True if the hash is valid, false otherwise
     */
    private async _isValidOTCVerificationHash(otcVerificationHash: string, token: string): Promise<boolean> {
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

            const tokenId = await this.getRefByToken(token);
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

    /**
     * Validates that token has not exceeded usage limits, throws on over-used token
     *
     * @param model - The token model
     * @param isOTC - Whether this is an OTC validation
     */
    private _validateUsageCount(model: TokenModel, isOTC: boolean): void {
        if (isOTC) {
            const otcUsedCount = model.get('otc_used_count') || 0;
            if (otcUsedCount >= 1) {
                throw new ValidationError({
                    message: tpl(messages.OTC_EXPIRED),
                    code: 'OTC_EXPIRED'
                });
            }
        } else {
            // Magic links are invalid if OTC has been used
            const otcUsedCount = model.get('otc_used_count') || 0;
            if (otcUsedCount > 0) {
                throw new ValidationError({
                    message: tpl(messages.TOKEN_EXPIRED),
                    code: 'TOKEN_EXPIRED'
                });
            }

            if (model.get('used_count') >= this.maxUsageCount) {
                throw new ValidationError({
                    message: tpl(messages.TOKEN_EXPIRED),
                    code: 'TOKEN_EXPIRED'
                });
            }
        }
    }

    /**
     * Validates token has not exceeded its lifetime limits, throws on expired token
     *
     * @param model - The token model
     * @param isOTC - Whether this is an OTC validation
     */
    private _validateTokenLifetime(model: TokenModel, isOTC: boolean): void {
        const createdAtEpoch = model.get('created_at').getTime();

        // For magic links check token lifetime after first usage
        if (!isOTC && model.get('used_count') > 0) {
            const firstUsedAtEpoch = model.get('first_used_at')?.getTime() ?? createdAtEpoch;
            const timeSinceFirstUsage = Date.now() - firstUsedAtEpoch;

            if (timeSinceFirstUsage > this.validityPeriodAfterUsage) {
                throw new ValidationError({
                    message: tpl(messages.TOKEN_EXPIRED),
                    code: 'TOKEN_EXPIRED'
                });
            }
        }

        // Check total token lifetime (applies to both magic links and OTCs)
        const tokenLifetimeMilliseconds = Date.now() - createdAtEpoch;
        if (tokenLifetimeMilliseconds > this.validityPeriod) {
            throw new ValidationError({
                message: tpl(messages.TOKEN_EXPIRED),
                code: 'TOKEN_EXPIRED'
            });
        }
    }

    /**
     * Increments the usage count for a token
     *
     * @param model - The token model
     * @param isOTC - Whether this is an OTC validation
     * @param transacting - Database transaction object
     */
    private async _incrementUsageCount(model: TokenModel, isOTC: boolean, transacting: Knex.Transaction): Promise<void> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date()
        };

        if (isOTC) {
            updateData.otc_used_count = model.get('otc_used_count') + 1;
        } else {
            updateData.used_count = model.get('used_count') + 1;
        }

        if (!model.get('first_used_at')) {
            updateData.first_used_at = new Date();
        }

        await model.save(updateData, {autoRefresh: false, patch: true, transacting});
    }
}

module.exports = SingleUseTokenProvider;
