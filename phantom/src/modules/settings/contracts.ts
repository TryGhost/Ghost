import {z} from 'zod';

export const SettingValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.null()
]);

export const SettingSchema = z.object({
    key: z.string().min(1),
    group: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'json']),
    value: SettingValueSchema,
    updatedAt: z.number().int()
});

export const SettingsListResponseSchema = z.object({
    settings: z.array(SettingSchema)
});

export const SettingUpdateSchema = z.object({
    key: z.string().min(1),
    value: SettingValueSchema
});

export const SettingsUpdateRequestSchema = z.object({
    settings: z.array(SettingUpdateSchema).min(1)
});

export const SettingsUpdateResponseSchema = SettingsListResponseSchema;

export const MetafieldMigrationRequestSchema = z.object({
    version: z.string().min(1)
});

export const MetafieldMigrationSchema = z.object({
    version: z.string().min(1),
    direction: z.enum(['forward', 'rollback']),
    createdAt: z.number().int(),
    rolledBackAt: z.number().int().nullable()
});

export const MetafieldMigrationResponseSchema = z.object({
    migration: MetafieldMigrationSchema
});

export const CustomObjectFieldSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'json']),
    required: z.boolean().optional(),
    indexed: z.boolean().optional()
});

export const CustomObjectSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    fields: z.array(CustomObjectFieldSchema),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const CustomObjectListResponseSchema = z.object({
    customObjects: z.array(CustomObjectSchema)
});

export const CustomObjectResponseSchema = z.object({
    customObject: CustomObjectSchema
});

export const CustomObjectCreateRequestSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    fields: z.array(CustomObjectFieldSchema)
});

export const CustomObjectUpdateRequestSchema = CustomObjectCreateRequestSchema;

export const CustomObjectIdParamSchema = z.object({
    id: z.string().min(1)
});

export const CustomObjectRecordSchema = z.object({
    id: z.string().min(1),
    objectId: z.string().min(1),
    data: z.record(z.unknown()),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const CustomObjectRecordListResponseSchema = z.object({
    records: z.array(CustomObjectRecordSchema)
});

export const CustomObjectRecordResponseSchema = z.object({
    record: CustomObjectRecordSchema
});

export const CustomObjectRecordRequestSchema = z.object({
    data: z.record(z.unknown())
});

export const CustomObjectRecordParamsSchema = z.object({
    id: z.string().min(1),
    recordId: z.string().min(1)
});

export const SettingsMigrationRequestSchema = z.object({
    group: z.string().min(1)
});

export const SettingsMigrationResponseSchema = z.object({
    migration: z.object({
        id: z.string().min(1),
        group: z.string().min(1),
        createdAt: z.number().int()
    })
});

export type SettingResponse = z.infer<typeof SettingSchema>;
export type SettingsListResponse = z.infer<typeof SettingsListResponseSchema>;
export type SettingsUpdateRequest = z.infer<typeof SettingsUpdateRequestSchema>;
export type SettingsUpdateResponse = z.infer<typeof SettingsUpdateResponseSchema>;
export type MetafieldMigrationRequest = z.infer<typeof MetafieldMigrationRequestSchema>;
export type MetafieldMigrationResponse = z.infer<typeof MetafieldMigrationResponseSchema>;
export type CustomObjectField = z.infer<typeof CustomObjectFieldSchema>;
export type CustomObjectResponse = z.infer<typeof CustomObjectSchema>;
export type CustomObjectCreateRequest = z.infer<typeof CustomObjectCreateRequestSchema>;
export type CustomObjectUpdateRequest = z.infer<typeof CustomObjectUpdateRequestSchema>;
export type CustomObjectRecordResponse = z.infer<typeof CustomObjectRecordSchema>;
export type CustomObjectRecordRequest = z.infer<typeof CustomObjectRecordRequestSchema>;
export type SettingsMigrationRequest = z.infer<typeof SettingsMigrationRequestSchema>;
export type SettingsMigrationResponse = z.infer<typeof SettingsMigrationResponseSchema>;
