import { z } from 'zod';
import * as options from '../options.ts';
import { resourceBody } from '../resource-body.ts';

export const FORMATS = ['mobiledoc', 'lexical'] as const;

const formats = options.formats(FORMATS);

const jsonString = z
  .string()
  .max(1_000_000_000)
  .refine(
    (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid JSON string' },
  );

const snippet = z.object({
  name: z.string().min(1).max(191),
  mobiledoc: jsonString,
  lexical: jsonString.nullable().optional(),
});

const body = resourceBody('snippets', snippet);

export const browse = {
  options: z.object({
    limit: options.limit.optional(),
    order: options.order.optional(),
    page: options.page.optional(),
    formats: formats.optional(),
    filter: options.filter,
  }),
};

export const read = {
  options: z.object({ id: options.id, formats: formats.optional() }),
};

export const add = {
  options: z.object({ formats: formats.optional() }),
  body,
};

// Edits replace the whole snippet, so they need the same fields as an add.
export const edit = {
  options: z.object({ id: options.id, formats: formats.optional() }),
  body,
};

export const destroy = {
  options: z.object({ id: options.id }),
};
