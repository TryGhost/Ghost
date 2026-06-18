import {z} from 'zod';

export const BillingProfileSchema = z.object({
    id: z.string().min(1),
    siteId: z.string().min(1),
    status: z.enum(['linked', 'unlinked']),
    linkedAt: z.number().int(),
    unlinkedAt: z.number().int().nullable()
});

export const BillingProfileResponseSchema = z.object({
    profile: BillingProfileSchema
});

export const BillingProfileLinkRequestSchema = z.object({
    siteId: z.string().min(1)
});

export const BillingProfileLinkResponseSchema = BillingProfileResponseSchema;

export const MarketplaceEntitlementSchema = z.object({
    id: z.string().min(1),
    listingId: z.string().min(1),
    expiresAt: z.number().int(),
    status: z.enum(['active', 'expired']),
    createdAt: z.number().int()
});

export const MarketplaceEntitlementListResponseSchema = z.object({
    entitlements: z.array(MarketplaceEntitlementSchema)
});

export const BillingProfileLinkRequestBodySchema = BillingProfileLinkRequestSchema;

export type BillingProfileLinkRequest = z.infer<typeof BillingProfileLinkRequestSchema>;
export type BillingProfileLinkResponse = z.infer<typeof BillingProfileLinkResponseSchema>;
export type BillingProfileResponse = z.infer<typeof BillingProfileResponseSchema>;
export type MarketplaceEntitlementListResponse = z.infer<typeof MarketplaceEntitlementListResponseSchema>;
