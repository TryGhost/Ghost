import type {Gift} from './gift';

export interface GiftRepository {
    existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
    create(gift: Gift): Promise<void>;
    getByToken(token: string): Promise<Gift | null>;
}
