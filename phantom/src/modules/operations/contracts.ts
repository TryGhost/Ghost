import {z} from 'zod';

export const ExportRequestSchema = z.object({
    includeSensitive: z.boolean().optional()
});

export const ExportResponseSchema = z.object({
    exportId: z.string().min(1),
    tables: z.array(z.string().min(1)),
    meta: z.object({
        exportedAt: z.number().int(),
        version: z.string().min(1)
    })
});

export const ImportRequestSchema = z.object({
    format: z.enum(['v1', 'v2', 'v5', 'legacy']),
    payload: z.record(z.unknown())
});

export const ImportResponseSchema = z.object({
    importId: z.string().min(1),
    status: z.enum(['queued', 'completed']),
    counts: z.record(z.number().int()).optional()
});

export const MigrationRequestSchema = z.object({
    version: z.string().min(1),
    action: z.enum(['rollback', 'apply'])
});

export const MigrationResponseSchema = z.object({
    runId: z.string().min(1),
    status: z.enum(['completed', 'failed'])
});

export const FixtureResponseSchema = z.object({
    runId: z.string().min(1),
    status: z.enum(['completed', 'failed']),
    createdAt: z.number().int()
});

export const NullableMigrationRequestSchema = z.object({
    table: z.string().min(1),
    column: z.string().min(1),
    nullable: z.boolean(),
    disableForeignKeys: z.boolean().optional(),
    preserveDefaults: z.boolean().optional()
});

export const NullableMigrationResponseSchema = z.object({
    migrationId: z.string().min(1),
    nullable: z.boolean(),
    createdAt: z.number().int()
});

export const UrlGenerateRequestSchema = z.object({
    type: z.enum(['post', 'tag', 'author']),
    slug: z.string().min(1),
    hasContent: z.boolean().optional(),
    subdirectory: z.string().min(1).optional()
});

export const UrlGenerateResponseSchema = z.object({
    url: z.string().min(1).nullable()
});

export const UpdateCheckResponseSchema = z.object({
    status: z.enum(['queued', 'completed']),
    checkedAt: z.number().int()
});

export const TokenCleanupResponseSchema = z.object({
    removed: z.number().int(),
    cleanedAt: z.number().int()
});

export const MetricsConfigRequestSchema = z.object({
    enabled: z.boolean()
});

export const MetricsConfigResponseSchema = z.object({
    enabled: z.boolean(),
    updatedAt: z.number().int()
});

export const MailgunEventSchema = z.object({
    type: z.enum(['delivered', 'opened', 'failed', 'complaint', 'unsubscribed']),
    issueId: z.string().min(1).optional(),
    memberId: z.string().min(1).optional(),
    newsletterId: z.string().min(1).optional(),
    error: z.string().optional()
});

export const MailgunEventResponseSchema = z.object({
    stored: z.boolean()
});

export const OutboxProcessResponseSchema = z.object({
    processed: z.number().int(),
    failed: z.number().int()
});

export const WelcomeEmailRequestSchema = z.object({
    memberId: z.string().min(1),
    source: z.enum(['member', 'admin', 'import'])
});

export const WelcomeEmailResponseSchema = z.object({
    queued: z.boolean()
});

export const ExportRequestBodySchema = ExportRequestSchema;
export const ImportRequestBodySchema = ImportRequestSchema;
export const MigrationRequestBodySchema = MigrationRequestSchema;
export const FixtureRequestBodySchema = z.object({}).strict();
export const NullableMigrationRequestBodySchema = NullableMigrationRequestSchema;
export const UrlGenerateRequestBodySchema = UrlGenerateRequestSchema;
export const MetricsConfigRequestBodySchema = MetricsConfigRequestSchema;
export const MailgunEventRequestBodySchema = MailgunEventSchema;
export const WelcomeEmailRequestBodySchema = WelcomeEmailRequestSchema;

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;
export type ImportRequest = z.infer<typeof ImportRequestSchema>;
export type ImportResponse = z.infer<typeof ImportResponseSchema>;
export type MigrationRequest = z.infer<typeof MigrationRequestSchema>;
export type MigrationResponse = z.infer<typeof MigrationResponseSchema>;
export type FixtureResponse = z.infer<typeof FixtureResponseSchema>;
export type NullableMigrationRequest = z.infer<typeof NullableMigrationRequestSchema>;
export type NullableMigrationResponse = z.infer<typeof NullableMigrationResponseSchema>;
export type UrlGenerateRequest = z.infer<typeof UrlGenerateRequestSchema>;
export type UrlGenerateResponse = z.infer<typeof UrlGenerateResponseSchema>;
export type UpdateCheckResponse = z.infer<typeof UpdateCheckResponseSchema>;
export type TokenCleanupResponse = z.infer<typeof TokenCleanupResponseSchema>;
export type MetricsConfigRequest = z.infer<typeof MetricsConfigRequestSchema>;
export type MetricsConfigResponse = z.infer<typeof MetricsConfigResponseSchema>;
export type MailgunEventRequest = z.infer<typeof MailgunEventSchema>;
export type MailgunEventResponse = z.infer<typeof MailgunEventResponseSchema>;
export type WelcomeEmailRequest = z.infer<typeof WelcomeEmailRequestSchema>;
export type WelcomeEmailResponse = z.infer<typeof WelcomeEmailResponseSchema>;
export type OutboxProcessResponse = z.infer<typeof OutboxProcessResponseSchema>;
