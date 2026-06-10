import {z} from 'zod';

export const ExtensionListingSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    paid: z.boolean(),
    version: z.string().min(1),
    capabilities: z.array(z.string().min(1))
});

export const ExtensionInstallSchema = z.object({
    id: z.string().min(1),
    listingId: z.string().min(1),
    status: z.enum(['installed', 'disabled']),
    config: z.record(z.unknown())
});

export const ExtensionRegistryResponseSchema = z.object({
    listings: z.array(ExtensionListingSchema)
});

export const ExtensionInstallRequestSchema = z.object({
    listingId: z.string().min(1),
    config: z.record(z.unknown()).default({})
});

export const ExtensionInstallResponseSchema = z.object({
    install: ExtensionInstallSchema
});

export const ExtensionIdParamSchema = z.object({
    id: z.string().min(1)
});

export const ExtensionRegistryRequestSchema = z.object({
    query: z.string().min(1).optional()
});

export const ExtensionInstallRequestBodySchema = ExtensionInstallRequestSchema;
export const ExtensionRegistryRequestQuerySchema = ExtensionRegistryRequestSchema;

export type ExtensionRegistryResponse = z.infer<typeof ExtensionRegistryResponseSchema>;
export type ExtensionInstallRequest = z.infer<typeof ExtensionInstallRequestSchema>;
export type ExtensionInstallResponse = z.infer<typeof ExtensionInstallResponseSchema>;
