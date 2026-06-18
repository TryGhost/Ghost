import {z} from 'zod';

export const MemberSchema = z.object({
    id: z.string().min(1),
    email: z.string().email(),
    status: z.enum(['free', 'paid']),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const MemberSessionSchema = z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    createdAt: z.number().int(),
    expiresAt: z.number().int()
});

export const MagicLinkRequestSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
    attribution: z.object({
        source: z.string().min(1).optional(),
        medium: z.string().min(1).optional(),
        campaign: z.string().min(1).optional(),
        referrer: z.string().min(1).optional(),
        // The converting page, resolved from the portal's url history.
        url: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        type: z.string().min(1).optional()
    }).optional()
});

export const MagicLinkResponseSchema = z.object({
    issued: z.boolean()
});

export const MagicLinkVerifyRequestSchema = z.object({
    token: z.string().min(1)
});

export const MagicLinkVerifyResponseSchema = z.object({
    member: MemberSchema,
    session: MemberSessionSchema
});

export const MemberSessionVerifyRequestSchema = z.object({
    sessionId: z.string().min(1),
    requiresPaid: z.boolean().optional()
});

export const MemberSessionVerifyResponseSchema = z.object({
    member: MemberSchema
});

export const MagicLinkRequestBodySchema = MagicLinkRequestSchema;
export const MagicLinkVerifyBodySchema = MagicLinkVerifyRequestSchema;
export const MemberSessionVerifyBodySchema = MemberSessionVerifyRequestSchema;

export type MemberResponse = z.infer<typeof MemberSchema>;
export type MemberSessionResponse = z.infer<typeof MemberSessionSchema>;
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
export type MagicLinkResponse = z.infer<typeof MagicLinkResponseSchema>;
export type MagicLinkVerifyRequest = z.infer<typeof MagicLinkVerifyRequestSchema>;
export type MagicLinkVerifyResponse = z.infer<typeof MagicLinkVerifyResponseSchema>;
export type MemberSessionVerifyRequest = z.infer<typeof MemberSessionVerifyRequestSchema>;
export type MemberSessionVerifyResponse = z.infer<typeof MemberSessionVerifyResponseSchema>;
