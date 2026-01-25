import {z} from 'zod';

export const NewsletterSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    senderEmail: z.string().email(),
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

export const NewsletterCreateRequestBodySchema = NewsletterCreateRequestSchema;
export const IssueCreateRequestBodySchema = IssueCreateRequestSchema;

export type NewsletterCreateRequest = z.infer<typeof NewsletterCreateRequestSchema>;
export type NewsletterCreateResponse = z.infer<typeof NewsletterCreateResponseSchema>;
export type IssueCreateRequest = z.infer<typeof IssueCreateRequestSchema>;
export type IssueCreateResponse = z.infer<typeof IssueCreateResponseSchema>;
