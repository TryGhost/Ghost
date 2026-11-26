import { z } from 'zod';
import schema, { type TableName } from '../../../data/schema/schema';

/**
 * What a kind of resource brings to metafields: its name. Every type in the core takes one, so a
 * registration, a field source or a service can only be used with the resource it was built for.
 * Who may do what is a namespace's access policy, the same for every resource.
 */
export interface ResourceKind {
  /** The resource's name, as its tables and routes are named. */
  Name: string;
}

/**
 * A kind of thing that holds metafields, such as members or posts, and the tables its fields and
 * values are kept in. Each resource has tables of its own rather than sharing one, so a value can
 * reference its member or post with a real foreign key. Every read and write here is handed the
 * resource it is for, and nothing else names a resource's tables.
 */
export interface MetafieldResource<R extends ResourceKind = ResourceKind> {
  name: R['Name'];
  /** Each named as `schema.ts` defines it, so what the schema says of a table can be read. */
  tables: {
    /** The fields defined on this resource. */
    fields: TableName;
    /** What each member or post holds for each field: a row per part of a value. */
    values: TableName;
    /** Which field each port another domain declares writes into. */
    bindings: TableName;
  };
  /** The column of the values that holds the id of the member or post. */
  idColumn: string;
}

/** The part of a column's definition that says which table's id it references, if any. */
const ForeignKey = z.object({ references: z.string().optional() });

/**
 * Whether a resource's records are members, read from the schema: they are when its values'
 * foreign key references `members.id`. A policy's `member` is the member a record belongs to, so
 * on any other resource no member owns a record.
 */
export function recordsAreMembers(resource: MetafieldResource): boolean {
  const columns: Record<string, unknown> = schema[resource.tables.values];
  return ForeignKey.safeParse(columns[resource.idColumn]).data?.references === 'members.id';
}
