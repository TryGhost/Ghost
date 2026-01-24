import {z} from 'zod';

export const StaffSchema = z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    status: z.enum(['active', 'suspended'])
});

export const StaffSessionSchema = z.object({
    id: z.string().min(1),
    staffId: z.string().min(1),
    createdAt: z.number().int(),
    expiresAt: z.number().int()
});

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export const LoginResponseSchema = z.object({
    staff: StaffSchema,
    session: StaffSessionSchema
});

export const ResetTokenSchema = z.object({
    token: z.string().min(1),
    expiresAt: z.number().int()
});

export const PasswordResetRequestSchema = z.object({
    email: z.string().email()
});

export const PasswordResetResponseSchema = z.object({
    issued: z.boolean(),
    resetToken: ResetTokenSchema.optional()
});

export const PasswordResetConfirmSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8)
});

export const PasswordResetConfirmResponseSchema = z.object({
    staffId: z.string().min(1),
    verificationToken: z.string().min(1).optional()
});

export const StaffInviteSchema = z.object({
    id: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    token: z.string().min(1),
    expiresAt: z.number().int()
});

export const StaffInviteRequestSchema = z.object({
    email: z.string().email(),
    role: z.string().min(1)
});

export const StaffInviteResponseSchema = z.object({
    invite: StaffInviteSchema
});

export const StaffInviteAcceptSchema = z.object({
    token: z.string().min(1),
    name: z.string().min(1),
    password: z.string().min(8)
});

export const StaffInviteAcceptResponseSchema = z.object({
    staffId: z.string().min(1)
});

export const StaffMeResponseSchema = z.object({
    staff: StaffSchema
});

export const LoginRequestBodySchema = LoginRequestSchema;
export const PasswordResetRequestBodySchema = PasswordResetRequestSchema;
export const PasswordResetConfirmBodySchema = PasswordResetConfirmSchema;
export const StaffInviteRequestBodySchema = StaffInviteRequestSchema;
export const StaffInviteAcceptBodySchema = StaffInviteAcceptSchema;

export type StaffResponse = z.infer<typeof StaffSchema>;
export type StaffSessionResponse = z.infer<typeof StaffSessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;
export type PasswordResetConfirmRequest = z.infer<typeof PasswordResetConfirmSchema>;
export type PasswordResetConfirmResponse = z.infer<typeof PasswordResetConfirmResponseSchema>;
export type StaffInviteRequest = z.infer<typeof StaffInviteRequestSchema>;
export type StaffInviteResponse = z.infer<typeof StaffInviteResponseSchema>;
export type StaffInviteAcceptRequest = z.infer<typeof StaffInviteAcceptSchema>;
export type StaffInviteAcceptResponse = z.infer<typeof StaffInviteAcceptResponseSchema>;
