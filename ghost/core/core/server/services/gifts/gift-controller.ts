import errors from '@tryghost/errors';
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

export class GiftController {
    private readonly service: GiftService;

    constructor({
        service
    }: {
        service: GiftService;
    }) {
        this.service = service;
    }

    async getRedeemable(frame: Frame) {
        const token = frame.data.token;
        const memberStatus = frame.options?.context?.member?.status ?? null;

        return this.service.getRedeemable({token, memberStatus});
    }

    async redeem(frame: Frame) {
        const token = frame.data.token;
        const member = frame.options?.context?.member;

        if (!member?.id) {
            throw new errors.UnauthorizedError({
                message: 'Member authentication required.'
            });
        }

        return this.service.redeem({
            token,
            memberId: member.id
        });
    }
}
