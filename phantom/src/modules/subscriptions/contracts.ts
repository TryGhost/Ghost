import {z} from 'zod';

export const PriceSchema = z.object({
    id: z.string().min(1),
    cadence: z.enum(['month', 'year']),
    amount: z.number().int().positive(),
    currency: z.string().min(3)
});

export const PlanSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    prices: z.array(PriceSchema)
});

export const OfferSchema = z.object({
    id: z.string().min(1),
    code: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().min(3),
    active: z.boolean()
});

export const CheckoutSessionSchema = z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    priceId: z.string().min(1),
    offerId: z.string().min(1).optional(),
    url: z.string().min(1)
});

export const PlanCreateRequestSchema = z.object({
    name: z.string().min(1),
    monthlyPrice: z.number().int().positive(),
    yearlyPrice: z.number().int().positive(),
    currency: z.string().min(3).default('USD')
});

export const PlanCreateResponseSchema = z.object({
    plan: PlanSchema
});

export const OfferCreateRequestSchema = z.object({
    code: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().min(3).default('USD')
});

export const OfferCreateResponseSchema = z.object({
    offer: OfferSchema
});

export const CheckoutSessionRequestSchema = z.object({
    memberId: z.string().min(1),
    priceId: z.string().min(1),
    offerCode: z.string().min(1).optional()
});

export const CheckoutSessionResponseSchema = z.object({
    session: CheckoutSessionSchema
});

export const CheckoutConfirmRequestSchema = z.object({
    sessionId: z.string().min(1)
});

export const CheckoutConfirmResponseSchema = z.object({
    subscriptionId: z.string().min(1)
});

export const PlanCreateRequestBodySchema = PlanCreateRequestSchema;
export const OfferCreateRequestBodySchema = OfferCreateRequestSchema;
export const CheckoutSessionRequestBodySchema = CheckoutSessionRequestSchema;
export const CheckoutConfirmRequestBodySchema = CheckoutConfirmRequestSchema;

export type PlanCreateRequest = z.infer<typeof PlanCreateRequestSchema>;
export type PlanCreateResponse = z.infer<typeof PlanCreateResponseSchema>;
export type OfferCreateRequest = z.infer<typeof OfferCreateRequestSchema>;
export type OfferCreateResponse = z.infer<typeof OfferCreateResponseSchema>;
export type CheckoutSessionRequest = z.infer<typeof CheckoutSessionRequestSchema>;
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
export type CheckoutConfirmRequest = z.infer<typeof CheckoutConfirmRequestSchema>;
export type CheckoutConfirmResponse = z.infer<typeof CheckoutConfirmResponseSchema>;
