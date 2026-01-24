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

export const StaffMeResponseSchema = z.object({
    staff: StaffSchema
});

export const LoginRequestBodySchema = LoginRequestSchema;

export type StaffResponse = z.infer<typeof StaffSchema>;
export type StaffSessionResponse = z.infer<typeof StaffSessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
