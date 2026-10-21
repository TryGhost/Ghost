import errors from '@tryghost/errors';
import { z } from 'zod';

/**
 * Parses what a request sent, turning the first problem into a validation error on the
 * property it names, or on `resource` when it names none.
 */
export function parseRequest<Schema extends z.core.$ZodType>(
  schema: Schema,
  input: unknown,
  resource: string,
): z.output<Schema> {
  const parsed = z.safeParse(schema, input);
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: issue.path.join('.') || resource,
  });
}
