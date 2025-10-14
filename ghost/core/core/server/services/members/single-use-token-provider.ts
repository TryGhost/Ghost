/* eslint-disable @typescript-eslint/no-var-requires */
import type {Knex} from 'knex';

import {ValidationError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import crypto from 'node:crypto';
import {hotp} from 'otplib';

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
    secret: string;
}

interface ValidateOptions {
    transacting?: Knex.Transaction;
    otcVerification?: string;
}

export class SingleUseTokenProvider {
    private model: TokenModelStatic;
    private validityPeriod: number;
    private validityPeriodAfterUsage: number;
    private maxUsageCount: number;
    private secret: string;

    constructor({SingleUseTokenModel, validityPeriod, validityPeriodAfterUsage, maxUsageCount, secret}: SingleUseTokenProviderDependencies) {
        this.model = SingleUseTokenModel;
        this.validityPeriod = validityPeriod;
        this.validityPeriodAfterUsage = validityPeriodAfterUsage;
        this.maxUsageCount = maxUsageCount;
        this.secret = secret;
    }

    async create(data: Record<string, unknown>): Promise<string> {
        const model = await this.model.add({
            data: JSON.stringify(data)
        });

        return model.get('token');
    }

    async validate(token: string, options: ValidateOptions = {}): Promise<Record<string, unknown>> {
        if (!options.transacting) {
            return await this.model.transaction((transacting) => {
                return this.validate(token, {
                    ...options,
                    transacting
                });
            });
        }

        const model = await this.#findAndLockTokenModel(token, options.transacting);

        if (options.otcVerification) {
            await this.#validateOTCVerificationHash(options.otcVerification, model.get('token'));
            await this.#validateOTCUsageLimit(model, options.transacting);
        } else {
            await this.#validateUsageLimit(model, options.transacting);
        }

        try {
            return JSON.parse(model.get('data'));
        } catch (err) {
            return {};
        }
    }

    async #validateOTCUsageLimit(model: TokenModel, transacting: Knex.Transaction): Promise<void> {
        this.#validateOTCUsageCount(model);
        this.#validateTotalTokenLifetime(model);
        await this.#incrementOTCUsageCount(model, transacting);
    }

    async #validateUsageLimit(model: TokenModel, transacting: Knex.Transaction): Promise<void> {
        this.#validateUsageCount(model);
        this.#validateTimeSinceFirstUsage(model);
        this.#validateTotalTokenLifetime(model);
        await this.#incrementUsageCount(model, transacting);
    }

    deriveCounter(tokenId: string, tokenValue: string): number {
        const msg = `${tokenId}|${tokenValue}`;
        const digest = crypto.createHash('sha256').update(msg).digest();
        return digest.readUInt32BE(0);
    }

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

    async getRefByToken(token: string): Promise<string | null> {
        try {
            const model = await this.model.findOne({token});
            return model ? model.get('uuid') : null;
        } catch (err) {
            return null;
        }
    }

    async getTokenByRef(ref: string): Promise<string | null> {
        try {
            const model = await this.model.findOne({uuid: ref});
            return model ? model.get('token') : null;
        } catch (err) {
            return null;
        }
    }

    createOTCVerificationHash(otc: string, token: string, timestamp?: number): string {
        if (!this.secret) {
            throw new ValidationError({
                message: tpl(messages.OTC_SECRET_NOT_CONFIGURED),
                code: 'OTC_SECRET_NOT_CONFIGURED'
            });
        }

        timestamp ??= Math.floor(Date.now() / 1000);

        const dataToHash = `${otc}:${token}:${timestamp}`;

        const secret = Buffer.from(this.secret, 'hex');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(dataToHash);

        return hmac.digest('hex');
    }

    async #findAndLockTokenModel(token: string, transacting: Knex.Transaction): Promise<TokenModel> {
        const model = await this.model.findOne({token}, {transacting, forUpdate: true});

        if (!model) {
            throw new ValidationError({
                message: tpl(messages.INVALID_TOKEN),
                code: 'INVALID_TOKEN'
            });
        }

        return model;
    }

    async #validateOTCVerificationHash(otcVerificationHash: string, token: string): Promise<void> {
        const isValid = await this.#isValidOTCVerificationHash(otcVerificationHash, token);

        if (!isValid) {
            throw new ValidationError({
                message: tpl(messages.INVALID_OTC_VERIFICATION_HASH),
                code: 'INVALID_OTC_VERIFICATION_HASH'
            });
        }
    }

    async #isValidOTCVerificationHash(otcVerificationHash: string, token: string): Promise<boolean> {
        try {
            if (!this.secret || !otcVerificationHash || !token) {
                return false;
            }

            const parts = otcVerificationHash.split(':');
            if (parts.length !== 2) {
                return false;
            }

            const timestamp = parseInt(parts[0]);
            const providedHash = parts[1];

            const now = Math.floor(Date.now() / 1000);
            const maxAge = 5 * 60;
            if (now - timestamp > maxAge) {
                return false;
            }

            const tokenId = await this.getRefByToken(token);
            if (!tokenId) {
                return false;
            }

            const otc = this.deriveOTC(tokenId, token);
            const expectedHash = this.createOTCVerificationHash(otc, token, timestamp);

            return crypto.timingSafeEqual(
                Buffer.from(providedHash, 'hex'),
                Buffer.from(expectedHash, 'hex')
            );
        } catch (err) {
            return false;
        }
    }

    #validateUsageCount(model: TokenModel): void {
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

    #validateOTCUsageCount(model: TokenModel): void {
        const otcUsedCount = model.get('otc_used_count') || 0;
        if (otcUsedCount >= 1) {
            throw new ValidationError({
                message: tpl(messages.OTC_EXPIRED),
                code: 'OTC_EXPIRED'
            });
        }
    }

    #validateTimeSinceFirstUsage(model: TokenModel): void {
        if (model.get('used_count') === 0 && !model.get('first_used_at')) {
            return;
        }

        const createdAtEpoch = model.get('created_at').getTime();
        const firstUsedAtEpoch = model.get('first_used_at')?.getTime() ?? createdAtEpoch;
        const timeSinceFirstUsage = Date.now() - firstUsedAtEpoch;

        if (timeSinceFirstUsage > this.validityPeriodAfterUsage) {
            throw new ValidationError({
                message: tpl(messages.TOKEN_EXPIRED),
                code: 'TOKEN_EXPIRED'
            });
        }
    }

    #validateTotalTokenLifetime(model: TokenModel): void {
        const createdAtEpoch = model.get('created_at').getTime();
        const tokenLifetimeMilliseconds = Date.now() - createdAtEpoch;
        if (tokenLifetimeMilliseconds > this.validityPeriod) {
            throw new ValidationError({
                message: tpl(messages.TOKEN_EXPIRED),
                code: 'TOKEN_EXPIRED'
            });
        }
    }

    async #incrementUsageCount(model: TokenModel, transacting: Knex.Transaction): Promise<void> {
        const updateData = {used_count: model.get('used_count') + 1};
        await this.#saveUsageData(updateData, model, transacting);
    }

    async #incrementOTCUsageCount(model: TokenModel, transacting: Knex.Transaction): Promise<void> {
        const updateData = {otc_used_count: model.get('otc_used_count') + 1};
        await this.#saveUsageData(updateData, model, transacting);
    }

    async #saveUsageData(updateData: Record<string, unknown>, model: TokenModel, transacting: Knex.Transaction): Promise<void> {
        updateData.updated_at = new Date();

        if (!model.get('first_used_at')) {
            updateData.first_used_at = new Date();
        }

        await model.save(updateData, {autoRefresh: false, patch: true, transacting});
    }
}

module.exports = SingleUseTokenProvider;
module.exports.SingleUseTokenProvider = SingleUseTokenProvider;
