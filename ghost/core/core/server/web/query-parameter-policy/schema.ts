import { z } from 'zod';

const ALLOWED_NAME_CHARACTERS = /^[A-Za-z_-]+$/;

const QueryParameterPolicyEntrySchema = z.object({
  name: z
    .string()
    .min(1, { error: 'Parameter names must be nonempty.' })
    .regex(ALLOWED_NAME_CHARACTERS, {
      error: 'Parameter names must only contain letters, underscores, and hyphens.',
    }),
  reason: z
    .string()
    .refine((reason) => reason.trim().length > 0, { error: 'Parameter reasons must be nonempty.' }),
});

const QueryParameterListSchema = z
  .array(QueryParameterPolicyEntrySchema)
  .superRefine((entries, context) => {
    const names = new Set<string>();

    for (const entry of entries) {
      if (names.has(entry.name)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate parameter name "${entry.name}".`,
        });
      }

      names.add(entry.name);
    }
  });

export const QueryParameterPolicySchema = z.object({
  schemaVersion: z.literal(1, { error: 'Unsupported schema version; expected 1.' }),
  public: QueryParameterListSchema,
  contentApi: QueryParameterListSchema,
});

export type QueryParameterPolicy = z.infer<typeof QueryParameterPolicySchema>;
export type QueryParameterPolicyEntry = z.infer<typeof QueryParameterPolicyEntrySchema>;

export function validateQueryParameterPolicy(value: unknown): QueryParameterPolicy {
  return QueryParameterPolicySchema.parse(value);
}
