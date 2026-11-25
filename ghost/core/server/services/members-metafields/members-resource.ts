import { z } from 'zod';
import type { Knex } from 'knex';
import type { MetafieldChangeEntry } from '@tryghost/metafield-types';
import type { Caller } from './callers';
import type { EditedDefinition } from './metafields/definitions-service';
import { metafieldsRelation } from './metafields/filter';
import type { Definition } from './metafields/models';
import type { Namespaces } from './metafields/namespaces';
import type { MetafieldResource, ResourceKind } from './metafields/resource';
import {
  FIELD_STATUS,
  DbMetafieldBinding,
  type MetafieldBindingRow,
  DbMetafieldChangeEvent,
  DbMetafieldValue,
  type FieldsTable,
  type MetafieldChangeEventInsert,
  type MetafieldChangeEventRow,
  type MetafieldValueRow,
} from './metafields/schema';

/**
 * What members bring to metafields: the APIs a request for a member's fields can come through,
 * and the permission staff manage the custom fields with.
 */
export interface Members extends ResourceKind {
  Name: 'members';
  Caller: Caller;
  StaffPermission: 'member_custom_field';
}

/** Members, the one resource that holds metafields so far. */
export const MEMBERS_RESOURCE: MetafieldResource<Members> = {
  name: 'members',
  tables: {
    fields: 'members_metafields',
    values: 'members_metafield_values',
    bindings: 'members_metafield_bindings',
  },
  idColumn: 'member_id',
  // Each field stores what its member may do with it, which a publisher sets per field.
  storedLevelFor: 'members',
};

/**
 * The Member filter relation that exposes metafield values, so a member filter can ask about
 * the member's values.
 */
export const METAFIELDS_RELATION = metafieldsRelation(MEMBERS_RESOURCE);

/**
 * Whether an edit started or stopped members reading the definition: archiving or restoring it,
 * or keeping it from members or opening it to them. An edit is only made while the namespace is
 * available, so availability can't differ between the two.
 */
export function changedForMembers(
  namespaces: Pick<Namespaces<Members>, 'canRead'>,
  { previous, next }: EditedDefinition,
): boolean {
  return readByMembers(namespaces, previous) !== readByMembers(namespaces, next);
}

function readByMembers(namespaces: Pick<Namespaces<Members>, 'canRead'>, definition: Definition) {
  return (
    definition.status === FIELD_STATUS.active &&
    namespaces.canRead('members', {
      namespace: definition.namespace,
      memberAccess: definition.access.member,
    })
  );
}

/** The column a member's values and change events hold the member's id in. */
type OwnedByMember = { member_id: string };

const { id, ...entryColumns } = DbMetafieldChangeEvent.shape;

/**
 * An entry on a member's activity feed, as the table holds it. `member_id` comes second, as in
 * the table: the feed passes the parsed entry through, so the key order reaches the API.
 */
export const DbMemberChangeEvent = z.object({ id, member_id: z.string(), ...entryColumns });

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
  .object({ event: DbMemberChangeEvent, member: DbChangeEventMember })
  .transform(({ event, member }): MetafieldChangeEvent => ({ ...event, member }));

declare module 'knex/types/tables' {
  interface Tables {
    members_metafields: FieldsTable;
    members_metafield_values: Knex.CompositeTableType<
      MetafieldValueRow & OwnedByMember,
      Omit<z.input<typeof DbMetafieldValue>, 'updated_at'> & OwnedByMember,
      Partial<MetafieldValueRow & OwnedByMember>
    >;
    members_metafield_change_events: Knex.CompositeTableType<
      MetafieldChangeEventRow & OwnedByMember,
      MetafieldChangeEventInsert & OwnedByMember
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
