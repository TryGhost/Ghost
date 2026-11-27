import type { ObjectType, permissions } from '../../../auth/permissions/permissions-data';
import type { TableName } from '../../../data/schema/schema';

/** The staff permissions that cover managing fields: each grants adding, editing and deleting. */
export type ManagingPermission = {
  [Type in ObjectType]: 'add' | 'edit' | 'destroy' extends (typeof permissions)[Type][number]
    ? Type
    : never;
}[ObjectType];

/**
 * What a kind of resource brings to metafields. Every type in the core takes one, so a
 * registration, a field source or a service can only be used with the resource it was built for.
 */
export interface ResourceKind {
  /** The resource's name, as its tables and routes are named. */
  Name: string;
  /** Who can ask for the resource's metafields, told apart by their kind. */
  Caller: { kind: string };
  /** The staff permission that manages the namespaces staff own on the resource. */
  StaffPermission: ManagingPermission;
}

/** The kinds of caller a resource has, which access is granted to. */
export type CallerKind<R extends ResourceKind> = R['Caller']['kind'];

/**
 * Who is asking, as the core reads them: only their kind, as access is granted to kinds of caller.
 * A whole caller is passed where there is one, and a kind alone where a read asks what any caller
 * of that kind can see, such as what any member can read.
 */
export type Asking<R extends ResourceKind> = R['Caller'] | { kind: CallerKind<R> };

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
  /**
   * The caller every definition stores its own level for, in the fields table's `member_access`
   * column, laid over its namespace's access. None when the resource stores no such level.
   */
  storedLevelFor?: CallerKind<R>;
}
