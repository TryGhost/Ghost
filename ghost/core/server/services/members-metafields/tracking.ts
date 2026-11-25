import type { FieldType } from '@tryghost/metafield-types';
import type { Meter } from '../../lib/tracing/meter';
import type { Tracer } from '../../lib/tracing/tracer';
import type { MetafieldVerb } from './field-actions';
import type { SingleWriteOrigin } from './schema';

// The spans the custom fields commands record, and the counts the custom fields services keep, in
// one place: a service reports what happened in its own terms, and this module decides the names
// and attributes dashboards read.

type Fields = readonly { type: FieldType }[];

/** How each change an edit makes, named as its action is, reads on a dashboard. */
const CHANGES = {
  rename: 'rename',
  changeAccess: 'change_access',
  changeSettings: 'change_settings',
  archive: 'archive',
  restore: 'restore',
} as const satisfies Partial<Record<MetafieldVerb, string>>;

/** What a command on the field definitions reports about its attempt. */
interface DefinitionAttempt {
  /** The fields the attempt involved. */
  fields(fields: Fields): void;
  /**
   * A change an edit is starting, so a failed edit lists the changes it reached, ending with the
   * one it failed on.
   */
  changing(change: keyof typeof CHANGES): void;
}

/** The span each command on the field definitions records. */
const DEFINITION_SPANS = {
  create: 'members.metafields.definition.create',
  edit: 'members.metafields.definition.edit',
  reorder: 'members.metafields.definition.reorder',
  delete: 'members.metafields.definition.delete',
} as const;

// A list counts the attempt once under each type, however many of its fields share one.
const fieldTypes = (fields: Fields) => [...new Set(fields.map(({ type }) => type))].sort();

/** Which service read a stored field: the one serving definitions, or the one serving values. */
export type FieldReader = 'definitions' | 'values';

/** What became of a stored field that couldn't be read as stored. */
export type UnreadableFieldOutcome = 'defaulted_settings' | 'left_out';

export type MetafieldsTracking = ReturnType<typeof metafieldsTracking>;

export function metafieldsTracking({ tracer, meter }: { tracer: Tracer; meter: Meter }) {
  const unreadableFields = meter.createCounter('members.metafields.unreadable_fields');

  return {
    /** Each command that changes the field definitions records a span of its own. */
    definition<Result>(
      command: keyof typeof DEFINITION_SPANS,
      run: (attempt: DefinitionAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track(DEFINITION_SPANS[command], (span) => {
        const changes: string[] = [];
        return run({
          fields(fields) {
            span.setAttribute('field_types', fieldTypes(fields));
          },
          changing(change) {
            changes.push(CHANGES[change]);
            span.setAttribute('changes', changes);
          },
        });
      });
    },

    /**
     * Each write of a member's values reported here records a span once `stored` settles.
     * Recorded alongside the write rather than awaited by it, as a write that joined its
     * caller's transaction is only stored once that commits.
     */
    valuesWrite(
      { source, fields }: { source: SingleWriteOrigin['source']; fields: Fields },
      stored: Promise<unknown>,
    ): void {
      tracer
        .track('members.metafields.values', async (span) => {
          span.setAttribute('source', source);
          span.setAttribute('field_types', fieldTypes(fields));
          await stored;
        })
        // The write's own caller hears of any failure.
        .catch(() => {});
    },

    /**
     * Counts a stored field that couldn't be read as stored, each time it is read, by what became
     * of it: read with its type's default settings, or left out when even that failed. It is a
     * count rather than a span because it happens inside a read, and reads aren't recorded as spans.
     */
    unreadableField({
      reader,
      outcome,
      type,
    }: {
      reader: FieldReader;
      outcome: UnreadableFieldOutcome;
      type: string;
    }): void {
      unreadableFields.add(1, { reader, outcome, field_type: type });
    },
  };
}
