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
    email: z.string().email()
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

export const MagicLinkRequestBodySchema = MagicLinkRequestSchema;
export const MagicLinkVerifyBodySchema = MagicLinkVerifyRequestSchema;

export type MemberResponse = z.infer<typeof MemberSchema>;
export type MemberSessionResponse = z.infer<typeof MemberSessionSchema>;
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
export type MagicLinkResponse = z.infer<typeof MagicLinkResponseSchema>;
export type MagicLinkVerifyRequest = z.infer<typeof MagicLinkVerifyRequestSchema>;
export type MagicLinkVerifyResponse = z.infer<typeof MagicLinkVerifyResponseSchema>;
