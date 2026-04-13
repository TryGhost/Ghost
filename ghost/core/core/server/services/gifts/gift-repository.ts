import type {Gift} from './gift';

export interface RepositoryTransactionOptions {
    transacting?: unknown;
    forUpdate?: boolean;
}

export interface GiftRepository {
    existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    getByToken(token: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    save(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}
