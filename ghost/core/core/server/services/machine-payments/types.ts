import type {PaymentAmountTerms} from './pricing';

export type PaymentTerms = PaymentAmountTerms & {
    description: string;
    method: string;
    mimeType: string;
    url: string;
};

export type Fulfillment = {
    protocol?: string;
    method: string;
    reference: string;
    amount?: number;
    currency?: string;
    stripePaymentIntentId?: string | null;
    receiptHeaders?: Record<string, string>;
};

/**
 * Protocol-agnostic payment rail. Adapters must return a concrete settlement
 * method string — MachinePaymentEvent.create() requires it.
 */
export type PaymentAdapter = {
    name?: string;
    canHandle: (request: Request) => boolean;
    challenge: (request: Request, terms: PaymentTerms) => Promise<Response | null | undefined>;
    fulfill: (request: Request, terms: PaymentTerms) => Promise<Fulfillment>;
};
