import { z } from 'zod';
import type { Knex } from 'knex';
import {
  FieldTypeSchema,
  MetafieldChangeEventFieldSchema,
  type MetafieldChangeEntry,
  type MetafieldChangeSource,
} from '@tryghost/metafield-types';
import { DbDate } from '../../lib/db-types/date';
import { MemberAccessSchema } from './access';

// `archived` is soft: the field drops out of the values path but stays in the definition
// list so it can be renamed, restored or deleted. Mirrors schema.js's `isIn` on the
// column, which is static config and cannot import this.
export const FIELD_STATUS = { active: 'active', archived: 'archived' } as const;
export type FieldStatus = (typeof FIELD_STATUS)[keyof typeof FIELD_STATUS];
export const FieldStatusSchema = z.enum([FIELD_STATUS.active, FIELD_STATUS.archived]);

// The single source for the read projection and the knex table type below. `type` parses
// as the field-type enum, so the row carries the narrow type and no codec needs a cast.
export const DbMetafield = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  status: FieldStatusSchema,
  member_access: MemberAccessSchema,
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

// Storage only: order is a fact about the list, so no read projection carries a rank.
type MetafieldRank = { sort_order: number };

type MetafieldRow = z.infer<typeof DbMetafield> & MetafieldRank;

/**
 * How a value arrived, not who caused it: who edited a member's fields is already an
 * action, and Stripe is not a person. `type` is the namespace that makes `id` resolvable —
 * `users`, `integrations`, `members_metafield_bindings` — so the one writer that
 * resolves in no table is the one with no id to give.
 */
export const WrittenBy = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), id: z.string() }),
  z.object({ type: z.literal('integration'), id: z.string() }),
  z.object({ type: z.literal('binding'), id: z.string() }),
  z.object({ type: z.literal('import'), id: z.null() }),
  // A member writing their own answers. Resolvable in `members`, like the others,
  // and the only writer whose changes leave nothing in the staff action log: that
  // log records what staff did.
  z.object({ type: z.literal('member'), id: z.string() }),
]);
export type WrittenBy = z.infer<typeof WrittenBy>;

// One part of a member's value. What a `path` means is storage.ts's business, so the row
// carries it as a plain string.
export const DbMetafieldValue = z.object({
  id: z.string(),
  metafield_key: z.string(),
  member_id: z.string(),
  path: z.string(),
  // Nullable like the column, though nothing here writes a null: a part with no value
  // has no row.
  value_text: z.string().nullable(),
  // Plain columns rather than the `WrittenBy` union: the rule holds at the write
  // boundary, so one malformed row cannot throw away a member's whole profile on read.
  written_by_type: z.string(),
  // Null for the one writer that resolves nowhere: an import, until runs are tracked.
  written_by_id: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type MetafieldValueRow = z.infer<typeof DbMetafieldValue>;

// The field's key travels with the row so a value assembles without a second lookup.
//
// `type` takes no part in the assembly and is here as a gate: a value whose type has left
// the catalog is one the definitions list no longer returns either, so failing to parse
// is what drops it.
export const DbMetafieldLeaf = z.object({
  member_id: z.string(),
  key: z.string(),
  type: FieldTypeSchema,
  path: z.string(),
  value_text: z.string(),
});

export const DbMetafieldBinding = z.object({
  id: z.string(),
  product_id: z.string(),
  port: z.string(),
  metafield_key: z.string(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type MetafieldBindingRow = z.infer<typeof DbMetafieldBinding>;

/** A binding joined to the field it points at, which is how a collected value is routed. */
export const DbBoundField = z.object({
  binding_id: z.string(),
  key: z.string(),
  type: FieldTypeSchema,
});

/**
 * Where a write was made (`MetafieldChangeSource`, shared with Admin): the entry point,
 * where `WrittenBy` is who answers for it.
 *
 * Mostly the writer settles it: an integration writes through the Admin API, an import
 * from a file and a binding at checkout. Staff and members are the exceptions: a member of
 * staff writes in Admin or, with a staff token, through the Admin API, and a member writes
 * from their account or at checkout. That is why the two are kept apart rather than one
 * derived from the other.
 */
type WriterOf<T extends WrittenBy['type']> = Extract<WrittenBy, { type: T }>;

/**
 * Who made a write and where, as the pairs that can happen. Every write names both, so the
 * activity feed can say where a change came from, and a pair that cannot happen, such as
 * an import made in Portal, does not compile.
 */
export type WriteOrigin =
  | { writtenBy: WriterOf<'user'>; source: Extract<MetafieldChangeSource, 'admin' | 'admin_api'> }
  | { writtenBy: WriterOf<'integration'>; source: Extract<MetafieldChangeSource, 'admin_api'> }
  | { writtenBy: WriterOf<'import'>; source: Extract<MetafieldChangeSource, 'import'> }
  | { writtenBy: WriterOf<'binding'>; source: Extract<MetafieldChangeSource, 'checkout'> }
  | {
      writtenBy: WriterOf<'member'>;
      source: Extract<MetafieldChangeSource, 'portal' | 'checkout'>;
    };

/** The fields an entry names. */
export const MetafieldChangeEventFields = z.array(MetafieldChangeEventFieldSchema);

/**
 * The field list as the table holds it, JSON text, against the list itself. A codec rather
 * than a parse on the way out, so the write stores what the read accepts. Zod validates
 * JSON-compatible values (`z.json()`) but has no built-in for parsing JSON text, so decoding
 * the text is this codec's job.
 */
export const StoredFieldList = z.codec(z.string(), MetafieldChangeEventFields, {
  decode: (text, ctx) => {
    try {
      return JSON.parse(text);
    } catch {
      ctx.issues.push({
        code: 'custom',
        message: 'The stored field list is not JSON.',
        input: text,
      });
      return z.NEVER;
    }
  },
  encode: (fields) => JSON.stringify(fields),
});

/** An entry as the table holds it. Writer and source are plain strings, as on the values table. */
export const DbMetafieldChangeEvent = z.object({
  id: z.string(),
  member_id: z.string(),
  written_by_type: z.string(),
  written_by_id: z.string().nullable(),
  source: z.string(),
  metafields: StoredFieldList,
  created_at: DbDate,
});

/**
 * An entry as the table holds it, derived from the schema that reads it. The pairing of
 * writer and source is held by `WriteOrigin` at the write rather than by this row type.
 */
export type MetafieldChangeEventRow = z.input<typeof DbMetafieldChangeEvent>;

/** The member columns an entry is shown with: only what a feed row needs. */
export const DbChangeEventMember = z.object({
  id: z.string(),
  uuid: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

/** An activity feed entry with its member, as the metafields domain reads it. */
export type MetafieldChangeEvent = MetafieldChangeEntry<Date> & {
  member: z.output<typeof DbChangeEventMember>;
};

/**
 * An entry and its member read back together. Parses and nothing else: what to do with an
 * entry that doesn't parse is the reading service's decision.
 */
export const DbMetafieldChangeEventWithMember = z
  .object({ event: DbMetafieldChangeEvent, member: DbChangeEventMember })
  .transform(({ event, member }): MetafieldChangeEvent => ({ ...event, member }));

declare module 'knex/types/tables' {
  interface Tables {
    members_metafields: Knex.CompositeTableType<
      MetafieldRow,
      // `status` is DB-defaulted and only set via update, so it's absent here. The
      // rank is required: letting it default would land a new field at the top.
      Omit<z.input<typeof DbMetafield>, 'updated_at' | 'status'> & MetafieldRank,
      Partial<MetafieldRow>
    >;
    members_metafield_values: Knex.CompositeTableType<
      MetafieldValueRow,
      Omit<z.input<typeof DbMetafieldValue>, 'updated_at'>,
      Partial<MetafieldValueRow>
    >;
    // Read as the schema reads it; written with the date already in the string form SQLite
    // orders against the feed's time filters, which a `Date` would silently break.
    members_metafield_change_events: Knex.CompositeTableType<
      MetafieldChangeEventRow,
      Omit<MetafieldChangeEventRow, 'created_at'> & { created_at: string }
    >;
    members_metafield_bindings: Knex.CompositeTableType<
      MetafieldBindingRow,
      // `updated_at` is set on insert as well as update: a binding is a setting, and
      // "when was this last stated" is the same question whichever way it got there.
      z.input<typeof DbMetafieldBinding>,
      Partial<MetafieldBindingRow>
    >;
  }
}
