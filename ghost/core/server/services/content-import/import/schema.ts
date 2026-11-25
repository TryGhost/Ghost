import { z } from 'zod';
import { EDITORIAL_POST_FIELDS } from './row';

const importableFields = new Set<string>(EDITORIAL_POST_FIELDS);

export const mappingSchema = z.record(z.string(), z.string()).superRefine((mapping, ctx) => {
  const targets = new Set<string>();
  for (const [header, target] of Object.entries(mapping)) {
    if (!header || header in Object.prototype) {
      ctx.addIssue({ code: 'custom', message: `Invalid CSV header mapping: "${header}"` });
    }
    if (target && !importableFields.has(target)) {
      ctx.addIssue({ code: 'custom', message: `Unknown post field mapping: "${target}"` });
    }
    if (target && targets.has(target)) {
      ctx.addIssue({ code: 'custom', message: `Post field is mapped more than once: "${target}"` });
    }
    targets.add(target);
  }
  if (!targets.has('title')) {
    ctx.addIssue({ code: 'custom', message: 'Post field mapping must include "title"' });
  }
});

const ownerSchema = z.object({
  id: z.string().min(1).max(24),
  type: z.enum(['user', 'integration']),
});
const requestUserEmailSchema = z.string().email().nullable().optional();

export const importRequestSchema = z.object({
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mapping: mappingSchema.optional(),
  requestUserEmail: requestUserEmailSchema,
  owner: ownerSchema.optional(),
});

export const confirmImportSchema = z.object({
  uploadId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid CSV upload ID.'),
  owner: ownerSchema,
  mapping: mappingSchema.optional(),
  requestUserEmail: requestUserEmailSchema,
});

export type ImportRequest = z.infer<typeof importRequestSchema>;
