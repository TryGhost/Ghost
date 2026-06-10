import {z} from 'zod';

export const NewsletterSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    senderEmail: z.string().email().nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const IssueSchema = z.object({
    id: z.string().min(1),
    newsletterId: z.string().min(1),
    subject: z.string().min(1),
    status: z.enum(['draft', 'scheduled', 'sent']),
    sendAt: z.number().int().nullable()
});

export const IssueDeliverySchema = z.object({
    id: z.string().min(1),
    issueId: z.string().min(1),
    memberId: z.string().min(1),
    status: z.enum(['pending', 'sent', 'failed', 'opened']),
    error: z.string().nullable(),
    updatedAt: z.number().int()
});

export const SuppressionSchema = z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    reason: z.string().min(1),
    source: z.enum(['manual', 'provider', 'system']),
    createdAt: z.number().int()
});

export const EmailEventSchema = z.object({
    id: z.string().min(1),
    issueId: z.string().min(1).nullable(),
    memberId: z.string().min(1).nullable(),
    type: z.enum(['delivered', 'opened', 'failed']),
    createdAt: z.number().int()
});

export const EmailBatchSchema = z.object({
    id: z.string().min(1),
    issueId: z.string().min(1),
    segment: z.enum(['all', 'paid', 'free']),
    status: z.enum(['pending', 'sending', 'sent', 'failed']),
    batchSize: z.number().int(),
    attempt: z.number().int(),
    maxAttempts: z.number().int(),
    nextAttemptAt: z.number().int(),
    warmupDomain: z.string().min(1),
    warmupLimit: z.number().int(),
    updatedAt: z.number().int()
});

export const NewsletterCreateRequestSchema = z.object({
    name: z.string().min(1),
    senderEmail: z.string().email()
});

export const NewsletterCreateResponseSchema = z.object({
    newsletter: NewsletterSchema
});

export const IssueCreateRequestSchema = z.object({
    newsletterId: z.string().min(1),
    subject: z.string().min(1),
    sendAt: z.number().int().nullable().optional()
});

export const IssueCreateResponseSchema = z.object({
    issue: IssueSchema
});

export const IssueDeliveryUpdateRequestSchema = z.object({
    issueId: z.string().min(1),
    memberId: z.string().min(1),
    status: z.enum(['pending', 'sent', 'failed', 'opened']),
    error: z.string().optional()
});

export const IssueDeliveryUpdateResponseSchema = z.object({
    delivery: IssueDeliverySchema
});

export const SuppressionCreateRequestSchema = z.object({
    memberId: z.string().min(1),
    reason: z.string().min(1),
    source: z.enum(['manual', 'provider', 'system']).default('manual')
});

export const SuppressionCreateResponseSchema = z.object({
    suppression: SuppressionSchema
});

export const SuppressionIdParamSchema = z.object({
    id: z.string().min(1)
});

export const AutomatedEmailRequestSchema = z.object({
    memberId: z.string().min(1),
    type: z.enum(['welcome', 'onboarding'])
});

export const AutomatedEmailResponseSchema = z.object({
    event: EmailEventSchema
});

export const IssueSendRecipientSchema = z.object({
    memberId: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1).optional(),
    isPaid: z.boolean()
});

export const EmailSenderConfigSchema = z.object({
    senderEmail: z.string().email(),
    replyToEmail: z.string().email().optional(),
    supportEmail: z.string().email().optional(),
    senderName: z.string().min(1).optional(),
    managedDomain: z.string().min(1).optional(),
    managedEmailEnabled: z.boolean().optional(),
    siteTitle: z.string().min(1)
});

export const EmailWarmupConfigSchema = z.object({
    limit: z.number().int().min(1),
    dailyRamp: z.number().int().min(0).optional(),
    sameDay: z.boolean().optional(),
    fallbackDomain: z.string().min(1).optional(),
    fallbackLimit: z.number().int().min(1).optional()
});

export const IssueSendRequestSchema = z.object({
    issueId: z.string().min(1),
    subject: z.string().min(1),
    recipients: z.array(IssueSendRecipientSchema).min(1),
    segmentPaidContent: z.boolean().optional(),
    batchSize: z.number().int().min(1).optional(),
    trackingEnabled: z.boolean().optional(),
    outboundTaggingEnabled: z.boolean().optional(),
    includeCommentCta: z.boolean().optional(),
    sender: EmailSenderConfigSchema,
    warmup: EmailWarmupConfigSchema.optional()
});

export const IssueSendResponseSchema = z.object({
    batches: z.array(EmailBatchSchema)
});

export const BatchRetryRequestSchema = z.object({
    batchId: z.string().min(1)
});

export const BatchRetryResponseSchema = z.object({
    batch: EmailBatchSchema
});

export const NewsletterCreateRequestBodySchema = NewsletterCreateRequestSchema;
export const IssueCreateRequestBodySchema = IssueCreateRequestSchema;
export const IssueDeliveryUpdateRequestBodySchema = IssueDeliveryUpdateRequestSchema;
export const SuppressionCreateRequestBodySchema = SuppressionCreateRequestSchema;
export const SuppressionIdParamRequestSchema = SuppressionIdParamSchema;
export const AutomatedEmailRequestBodySchema = AutomatedEmailRequestSchema;
export const IssueSendRequestBodySchema = IssueSendRequestSchema;
export const BatchRetryRequestBodySchema = BatchRetryRequestSchema;

export type NewsletterCreateRequest = z.infer<typeof NewsletterCreateRequestSchema>;
export type NewsletterCreateResponse = z.infer<typeof NewsletterCreateResponseSchema>;
export type IssueCreateRequest = z.infer<typeof IssueCreateRequestSchema>;
export type IssueCreateResponse = z.infer<typeof IssueCreateResponseSchema>;
export type IssueDeliveryUpdateRequest = z.infer<typeof IssueDeliveryUpdateRequestSchema>;
export type IssueDeliveryUpdateResponse = z.infer<typeof IssueDeliveryUpdateResponseSchema>;
export type SuppressionCreateRequest = z.infer<typeof SuppressionCreateRequestSchema>;
export type SuppressionCreateResponse = z.infer<typeof SuppressionCreateResponseSchema>;
export type AutomatedEmailRequest = z.infer<typeof AutomatedEmailRequestSchema>;
export type AutomatedEmailResponse = z.infer<typeof AutomatedEmailResponseSchema>;
export type IssueSendRequest = z.infer<typeof IssueSendRequestSchema>;
export type IssueSendResponse = z.infer<typeof IssueSendResponseSchema>;
export type BatchRetryRequest = z.infer<typeof BatchRetryRequestSchema>;
export type BatchRetryResponse = z.infer<typeof BatchRetryResponseSchema>;
