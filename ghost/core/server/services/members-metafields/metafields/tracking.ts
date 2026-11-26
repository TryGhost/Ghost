import type { FieldType } from '@tryghost/metafield-types';
import type { Meter } from '../../../lib/tracing/meter';
import type { Tracer } from '../../../lib/tracing/tracer';
import type { MetafieldResource } from './resource';
import type { SingleWriteOrigin } from './schema';

// The spans the metafields commands record, and the counts the metafields services keep, in one
// place: a service reports what happened in its own terms, and this module decides the names and
// attributes dashboards read. The definition spans are the custom fields commands', named before
// custom fields moved out of the core, and kept so dashboards keep reading them.

type Fields = readonly { type: FieldType }[];

/** How each change an edit makes reads on a dashboard. */
const CHANGES = {
  rename: 'rename',
  changeAccess: 'change_access',
  changeSettings: 'change_settings',
  archive: 'archive',
  restore: 'restore',
} as const;

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

/** The span each command on the field definitions records, after the resource's name. */
const DEFINITION_SPANS = {
  create: 'definition.create',
  edit: 'definition.edit',
  reorder: 'definition.reorder',
  delete: 'definition.delete',
} as const;

// A list counts the attempt once under each type, however many of its fields share one.
const fieldTypes = (fields: Fields) => [...new Set(fields.map(({ type }) => type))].sort();

/** Which service read a stored field: the one serving definitions, or the one serving values. */
export type FieldReader = 'definitions' | 'values';

/** What became of a stored field that couldn't be read as stored. */
export type UnreadableFieldOutcome = 'defaulted_settings' | 'left_out';

export type MetafieldsTracking = ReturnType<typeof metafieldsTracking>;

/**
 * Tracking for one resource's metafields. Every span, metric and log event is named after the
 * resource, such as `members.metafields.values`, so each resource's can be told apart.
 */
export function metafieldsTracking(
  resource: Pick<MetafieldResource, 'name'>,
  { tracer, meter }: { tracer: Tracer; meter: Meter },
) {
  const named = (what: string) => `${resource.name}.metafields.${what}`;
  const unreadableFields = meter.createCounter(named('unreadable_fields'));

  return {
    /** The name a log event about this resource's metafields is given. */
    named,

    /** Each command that changes the field definitions records a span of its own. */
    definition<Result>(
      command: keyof typeof DEFINITION_SPANS,
      run: (attempt: DefinitionAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track(named(DEFINITION_SPANS[command]), (span) => {
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
        .track(named('values'), async (span) => {
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
