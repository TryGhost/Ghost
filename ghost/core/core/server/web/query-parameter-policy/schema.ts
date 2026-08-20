import {z} from 'zod';

const INVALID_NAME_CHARACTERS = /[\s&=?#]/;

const QueryParameterPolicyEntrySchema = z.object({
    name: z.string()
        .min(1, {error: 'Parameter names must be nonempty.'})
        .refine(name => !INVALID_NAME_CHARACTERS.test(name), {error: 'Parameter names must not contain whitespace or query-string separators.'}),
    reason: z.string()
        .refine(reason => reason.trim().length > 0, {error: 'Parameter reasons must be nonempty.'})
});

const QueryParameterListSchema = z.array(QueryParameterPolicyEntrySchema).superRefine((entries, context) => {
    const names = new Set<string>();

    for (const entry of entries) {
        if (names.has(entry.name)) {
            context.addIssue({
                code: 'custom',
                message: `Duplicate parameter name "${entry.name}".`
            });
        }

        names.add(entry.name);
    }
});

export const QueryParameterPolicySchema = z.object({
    schemaVersion: z.literal(1, {error: 'Unsupported schema version; expected 1.'}),
    public: QueryParameterListSchema,
    contentApi: QueryParameterListSchema
});

export type QueryParameterPolicy = z.infer<typeof QueryParameterPolicySchema>;
export type QueryParameterPolicyEntry = z.infer<typeof QueryParameterPolicyEntrySchema>;

export function validateQueryParameterPolicy(value: unknown): QueryParameterPolicy {
    return QueryParameterPolicySchema.parse(value);
}
