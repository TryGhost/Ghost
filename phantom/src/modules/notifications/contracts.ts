import {z} from 'zod';

export const NotificationSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['admin', 'system']),
    title: z.string().min(1),
    message: z.string().min(1),
    status: z.enum(['active', 'resolved']),
    createdBy: z.string().min(1).nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const NotificationListResponseSchema = z.object({
    notifications: z.array(NotificationSchema)
});

export const NotificationCreateRequestSchema = z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    status: z.enum(['active', 'resolved']).optional()
});

export const NotificationCreateResponseSchema = z.object({
    notification: NotificationSchema
});

export const NotificationIdParamSchema = z.object({
    id: z.string().min(1)
});

export type NotificationResponse = z.infer<typeof NotificationSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type NotificationCreateRequest = z.infer<typeof NotificationCreateRequestSchema>;
export type NotificationCreateResponse = z.infer<typeof NotificationCreateResponseSchema>;
