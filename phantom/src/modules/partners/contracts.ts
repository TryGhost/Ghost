import {z} from 'zod';

export const AccessGrantSchema = z.object({
    id: z.string().min(1),
    orgId: z.string().min(1),
    scopes: z.array(z.string().min(1)),
    expiresAt: z.number().int()
});

export const PartnerTokenSchema = z.object({
    token: z.string().min(1),
    grantId: z.string().min(1),
    subject: z.string().min(1),
    scopes: z.array(z.string().min(1)),
    expiresAt: z.number().int()
});

export const AccessGrantRequestSchema = z.object({
    orgId: z.string().min(1),
    scopes: z.array(z.string().min(1)),
    ttlHours: z.number().int().positive().default(24)
});

export const AccessGrantResponseSchema = z.object({
    grant: AccessGrantSchema
});

export const PartnerTokenRequestSchema = z.object({
    grantId: z.string().min(1),
    subject: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    ttlHours: z.number().int().positive().default(4)
});

export const PartnerTokenResponseSchema = z.object({
    token: PartnerTokenSchema
});

export const PartnerValidateRequestSchema = z.object({
    token: z.string().min(1),
    requiredScopes: z.array(z.string().min(1)).optional()
});

export const PartnerValidateResponseSchema = z.object({
    staffId: z.string().min(1),
    orgId: z.string().min(1),
    scopes: z.array(z.string().min(1))
});

export const AccessGrantRequestBodySchema = AccessGrantRequestSchema;
export const PartnerTokenRequestBodySchema = PartnerTokenRequestSchema;
export const PartnerValidateRequestBodySchema = PartnerValidateRequestSchema;

export type AccessGrantRequest = z.infer<typeof AccessGrantRequestSchema>;
export type AccessGrantResponse = z.infer<typeof AccessGrantResponseSchema>;
export type PartnerTokenRequest = z.infer<typeof PartnerTokenRequestSchema>;
export type PartnerTokenResponse = z.infer<typeof PartnerTokenResponseSchema>;
export type PartnerValidateRequest = z.infer<typeof PartnerValidateRequestSchema>;
export type PartnerValidateResponse = z.infer<typeof PartnerValidateResponseSchema>;
