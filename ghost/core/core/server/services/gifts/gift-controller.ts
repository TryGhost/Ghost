import errors from '@tryghost/errors';
import {Gift, type GiftCadence} from './gift';
import {GiftService} from './gift-service';

type Frame = {
    data: {
        token: string;
    };
    options?: {
        context?: {
            member?: {
                id: string;
                status: string;
            } | null;
        };
    };
};

type SerializedTier = {
    id: string;
    name: string;
    description: string | null;
    benefits: string[];
};

type Tier = {
    name: string;
    toJSON(): SerializedTier;
};

type GiftDTO = {
    token: string;
    cadence: GiftCadence;
    duration: number;
    currency: string;
    amount: number;
    expires_at: Date;
    consumes_at: Date | null;
    tier: SerializedTier;
};

type TiersService = {
    api: {
        read(idString: string): Promise<Tier | null>;
    };
};

type LabsService = {
    isSet(name: string): boolean;
};

export class GiftController {
    private readonly service: GiftService;
    private readonly tiersService: TiersService;
    private readonly labsService: LabsService;

    constructor({
        service,
        tiersService,
        labsService
    }: {
        service: GiftService;
        tiersService: TiersService;
        labsService: LabsService;
    }) {
        this.service = service;
        this.tiersService = tiersService;
        this.labsService = labsService;
    }

    async getRedeemable(frame: Frame) {
        if (!this.labsService.isSet('giftSubscriptions')) {
            throw new errors.BadRequestError({
                message: 'Gift subscriptions are not enabled on this site.'
            });
        }

        const token = frame.data.token;
        const memberStatus = frame.options?.context?.member?.status ?? null;

        const gift = await this.service.getRedeemable(token, memberStatus);

        return this.serializeGift(gift);
    }

    async redeem(frame: Frame) {
        if (!this.labsService.isSet('giftSubscriptions')) {
            throw new errors.BadRequestError({
                message: 'Gift subscriptions are not enabled on this site.'
            });
        }

        const token = frame.data.token;
        const member = frame.options?.context?.member;

        if (!member?.id) {
            throw new errors.UnauthorizedError({
                message: 'Member authentication required.'
            });
        }

        const gift = await this.service.redeem(token, member.id);

        return this.serializeGift(gift);
    }

    private async serializeGift(gift: Gift): Promise<GiftDTO> {
        const tier = await this.tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.InternalServerError({
                message: `Tier ${gift.tierId} not found for gift: ${gift.token}`
            });
        }

        const tierJSON = tier.toJSON();

        return {
            token: gift.token,
            cadence: gift.cadence,
            duration: gift.duration,
            currency: gift.currency,
            amount: gift.amount,
            expires_at: gift.expiresAt,
            consumes_at: gift.consumesAt,
            tier: {
                id: tierJSON.id,
                name: tierJSON.name,
                description: tierJSON.description,
                benefits: tierJSON.benefits
            }
        };
    }
}
