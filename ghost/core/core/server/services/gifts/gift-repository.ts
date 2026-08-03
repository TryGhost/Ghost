import type {Gift} from './gift';

export interface GiftEventPage {
    data: Array<{
        type: 'gift_purchase_event' | 'gift_redemption_event';
        data: Record<string, unknown>;
    }>;
    meta: unknown;
}

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
    findUnsentReminders(): Promise<Gift[]>;
    getActiveByMember(memberId: string, options?: RepositoryTransactionOptions): Promise<Gift | null>;
    getActiveByMembers(memberIds: string[], options?: RepositoryTransactionOptions): Promise<Map<string, Gift>>;
    browsePurchaseEvents(options?: Record<string, unknown>, filter?: unknown): Promise<GiftEventPage>;
    browseRedemptionEvents(options?: Record<string, unknown>, filter?: unknown): Promise<GiftEventPage>;
    create(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    update(gift: Gift, options?: RepositoryTransactionOptions): Promise<void>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}
