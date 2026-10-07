import { z } from 'zod';
import { IDENTITY_SEGMENT } from '@tryghost/metafield-types/identity';

/**
 * A field's namespace and key, as only this check produces them. Anywhere a field is
 * written or pointed at takes these rather than plain strings, so input from outside has
 * to be parsed before it can reach a write.
 */
export const Namespace = z
  .string()
  .regex(IDENTITY_SEGMENT, {
    error: 'A namespace can only contain lowercase letters, numbers and underscores.',
  })
  .brand('MetafieldNamespace');
export type Namespace = z.infer<typeof Namespace>;

export const MetafieldKey = z
  .string()
  .regex(IDENTITY_SEGMENT, {
    error: 'A custom field key can only contain lowercase letters, numbers and underscores.',
  })
  .brand('MetafieldKey');
export type MetafieldKey = z.infer<typeof MetafieldKey>;
