import {z} from 'zod';

export const SiteSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    locale: z.string().min(2),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const SiteUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    locale: z.string().min(2).optional()
});

export type SiteResponse = z.infer<typeof SiteSchema>;
export type SiteUpdateInput = z.infer<typeof SiteUpdateSchema>;
