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

export const AuthVerificationSchema = z.object({
    token: z.string().min(1),
    type: z.enum(['device']),
    expiresAt: z.number().int()
});

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export const SsoLoginRequestSchema = z.object({
    provider: z.string().min(1),
    subject: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1)
});

export const LoginResponseSchema = z.object({
    staff: StaffSchema,
    session: StaffSessionSchema.optional(),
    verification: AuthVerificationSchema.optional()
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

export const StaffApiTokenSchema = z.object({
    id: z.string().min(1),
    staffId: z.string().min(1),
    name: z.string().min(1),
    createdAt: z.number().int(),
    revokedAt: z.number().int().nullable()
});

export const IntegrationTokenSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    createdAt: z.number().int(),
    revokedAt: z.number().int().nullable()
});

export const StaffApiTokenCreateSchema = z.object({
    name: z.string().min(1)
});

export const IntegrationTokenCreateSchema = z.object({
    name: z.string().min(1)
});

export const StaffApiTokenCreateResponseSchema = z.object({
    apiToken: StaffApiTokenSchema.extend({token: z.string().min(1)})
});

export const IntegrationTokenCreateResponseSchema = z.object({
    apiToken: IntegrationTokenSchema.extend({token: z.string().min(1)})
});

export const TokenIdParamSchema = z.object({
    id: z.string().min(1)
});

export const StaffMeResponseSchema = z.object({
    staff: StaffSchema
});

export const StaffVerificationRequestSchema = z.object({
    token: z.string().min(1)
});

export const StaffVerificationResponseSchema = z.object({
    staff: StaffSchema,
    session: StaffSessionSchema
});

export const StaffAuditEventSchema = z.object({
    id: z.string().min(1),
    staffId: z.string().min(1),
    action: z.string().min(1),
    outcome: z.string().min(1),
    ipAddress: z.string().min(1).nullable(),
    deviceId: z.string().min(1).nullable(),
    createdAt: z.number().int()
});

export const StaffAuditListRequestSchema = z.object({
    staffId: z.string().min(1).optional(),
    from: z.number().int().optional(),
    to: z.number().int().optional(),
    limit: z.number().int().positive().max(100).default(50),
    cursor: z.number().int().optional()
});

export const StaffAuditListResponseSchema = z.object({
    events: z.array(StaffAuditEventSchema),
    nextCursor: z.number().int().nullable()
});

export const LoginRequestBodySchema = LoginRequestSchema;
export const SsoLoginRequestBodySchema = SsoLoginRequestSchema;
export const PasswordResetRequestBodySchema = PasswordResetRequestSchema;
export const PasswordResetConfirmBodySchema = PasswordResetConfirmSchema;
export const StaffInviteRequestBodySchema = StaffInviteRequestSchema;
export const StaffInviteAcceptBodySchema = StaffInviteAcceptSchema;
export const StaffApiTokenCreateBodySchema = StaffApiTokenCreateSchema;
export const IntegrationTokenCreateBodySchema = IntegrationTokenCreateSchema;
export const TokenIdParamRequestSchema = TokenIdParamSchema;
export const StaffVerificationRequestBodySchema = StaffVerificationRequestSchema;
export const StaffAuditListRequestQuerySchema = StaffAuditListRequestSchema;

export type StaffResponse = z.infer<typeof StaffSchema>;
export type StaffSessionResponse = z.infer<typeof StaffSessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type SsoLoginRequest = z.infer<typeof SsoLoginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;
export type PasswordResetConfirmRequest = z.infer<typeof PasswordResetConfirmSchema>;
export type PasswordResetConfirmResponse = z.infer<typeof PasswordResetConfirmResponseSchema>;
export type StaffInviteRequest = z.infer<typeof StaffInviteRequestSchema>;
export type StaffInviteResponse = z.infer<typeof StaffInviteResponseSchema>;
export type StaffInviteAcceptRequest = z.infer<typeof StaffInviteAcceptSchema>;
export type StaffInviteAcceptResponse = z.infer<typeof StaffInviteAcceptResponseSchema>;
export type StaffApiTokenCreateRequest = z.infer<typeof StaffApiTokenCreateSchema>;
export type StaffApiTokenCreateResponse = z.infer<typeof StaffApiTokenCreateResponseSchema>;
export type IntegrationTokenCreateRequest = z.infer<typeof IntegrationTokenCreateSchema>;
export type IntegrationTokenCreateResponse = z.infer<typeof IntegrationTokenCreateResponseSchema>;
export type StaffVerificationRequest = z.infer<typeof StaffVerificationRequestSchema>;
export type StaffVerificationResponse = z.infer<typeof StaffVerificationResponseSchema>;
export type StaffAuditListRequest = z.infer<typeof StaffAuditListRequestSchema>;
export type StaffAuditListResponse = z.infer<typeof StaffAuditListResponseSchema>;
