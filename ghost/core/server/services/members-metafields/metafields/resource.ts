/**
 * A kind of thing that holds metafields, such as members or posts, and the tables its fields and
 * values are kept in. Each resource has tables of its own rather than sharing one, so a value can
 * reference its member or post with a real foreign key. Every read and write here is handed the
 * resource it is for, and nothing else names a resource's tables.
 */
export interface MetafieldResource {
  tables: {
    /** The fields defined on this resource. */
    fields: string;
    /** What each member or post holds for each field: a row per part of a value. */
    values: string;
    /** An entry for each write of values, naming the fields it wrote. */
    changeEvents: string;
    /** Which field each port another domain declares writes into. */
    bindings: string;
  };
  /** The column of the values and change events that holds the id of the member or post. */
  idColumn: string;
}
