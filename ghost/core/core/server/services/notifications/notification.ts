import {z} from 'zod';

export const Notification = z.object({
    id: z.string().min(1),
    custom: z.boolean().default(false),
    message: z.string(),
    type: z.enum(['info', 'alert', 'warn']).default('info'),
    dismissible: z.boolean().default(true),
    top: z.boolean().optional(),
    createdAtVersion: z.string(),
    addedAt: z.coerce.date(),
    seenBy: z.array(z.string()).default([])
});

export type Notification = z.infer<typeof Notification>;
