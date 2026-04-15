import type {Gift} from './gift';

export interface RepositoryTransactionOptions {
    transacting?: unknown;
    forUpdate?: boolean;
}

export interface GiftRepository {
    existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
    getByToken(token: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getByPaymentIntentId(paymentIntentId: string): Promise<Gift | null>;
    findPendingConsumption(): Promise<Gift[]>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    update(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}
