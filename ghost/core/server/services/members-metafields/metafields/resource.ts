import type { ObjectType, permissions } from '../../../auth/permissions/permissions-data';

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
  /** The APIs a request for the resource can come through, each of which reads differently. */
  Caller: string;
  /** The staff permission that manages the namespaces staff own on the resource. */
  StaffPermission: ManagingPermission;
}

/**
 * A kind of thing that holds metafields, such as members or posts, and the tables its fields and
 * values are kept in. Each resource has tables of its own rather than sharing one, so a value can
 * reference its member or post with a real foreign key. Every read and write here is handed the
 * resource it is for, and nothing else names a resource's tables.
 */
export interface MetafieldResource<R extends ResourceKind = ResourceKind> {
  name: R['Name'];
  tables: {
    /** The fields defined on this resource. */
    fields: string;
    /** What each member or post holds for each field: a row per part of a value. */
    values: string;
    /** Which field each port another domain declares writes into. */
    bindings: string;
  };
  /** The column of the values and change events that holds the id of the member or post. */
  idColumn: string;
}
