import type {Gift} from './gift';

export interface RepositoryTransactionOptions {
    transacting?: unknown;
    forUpdate?: boolean;
}

export interface FindPendingReminderOptions {
    now: Date;
    reminderLeadMs: number;
    reminderFloorMs: number;
    transacting?: unknown;
}

export interface GiftRepository {
    existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
    getById(id: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getByToken(token: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getByPaymentIntentId(paymentIntentId: string): Promise<Gift | null>;
    findPendingConsumption(): Promise<Gift[]>;
    findPendingExpiration(): Promise<Gift[]>;
    findPendingReminder(options: FindPendingReminderOptions): Promise<Gift[]>;
    getActiveByMember(memberId: string): Promise<Gift | null>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    update(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}
