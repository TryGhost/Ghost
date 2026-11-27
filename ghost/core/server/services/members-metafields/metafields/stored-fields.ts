import logging from '@tryghost/logging';
import type { z } from 'zod';
import type { FieldReader, MetafieldsTracking } from './tracking';

/** A stored field's two readings, as `storedField` in schema.ts builds them. */
interface StoredReadings<Field> {
  asStored: z.ZodType<Field>;
  withDefaults: z.ZodType<Field>;
}

/**
 * A stored field as it is stored, or with its type's default settings when its stored settings
 * can't be read, so a field whose settings were damaged keeps working until the next write of its
 * settings replaces them. Null when it can't be read even so, such as a field of a type this build
 * doesn't know, which its reader leaves out rather than failing the whole read. Either way the
 * field is logged and counted, so it can be seen and repaired.
 */
export function readStoredField<Field>(
  row: Readonly<Record<string, unknown>>,
  readings: StoredReadings<Field>,
  { reader, tracking }: { reader: FieldReader; tracking: MetafieldsTracking },
): Field | null {
  const asStored = readings.asStored.safeParse(row);
  if (asStored.success) {
    return asStored.data;
  }
  const withDefaults = readings.withDefaults.safeParse(row);
  const outcome = withDefaults.success ? 'defaulted_settings' : 'left_out';
  logging.warn(
    {
      event: { name: 'members.metafields.field_unreadable' },
      err: asStored.error,
      metafieldNamespace: row.namespace,
      metafieldKey: row.key,
      outcome,
    },
    withDefaults.success
      ? 'Reading a metafield with its default settings'
      : 'Leaving out an unreadable metafield',
  );
  tracking.unreadableField({
    reader,
    outcome,
    type: typeof row.type === 'string' ? row.type : 'unknown',
  });
  return withDefaults.success ? withDefaults.data : null;
}
