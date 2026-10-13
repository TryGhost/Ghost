import { z } from 'zod';

const DeleteRuleSpec = z.object({
  cascadeDelete: z.boolean().optional(),
  restrictDelete: z.boolean().optional(),
  setNullDelete: z.boolean().optional(),
});

/** What a foreign key does when the row it references is deleted. */
export type DeleteRule = 'CASCADE' | 'RESTRICT' | 'SET NULL';

/**
 * A foreign key as a table's `@@FOREIGN_KEYS@@` declares it. A column's own `references` is
 * shorthand for one over that column alone.
 */
const ForeignKeySpec = z.strictObject({
  ...DeleteRuleSpec.shape,
  columns: z.array(z.string()).min(1),
  references: z.strictObject({ table: z.string(), columns: z.array(z.string()).min(1) }),
  constraintName: z.string().optional(),
});
export type ForeignKeySpec = z.infer<typeof ForeignKeySpec>;

const ColumnSpec = z.object({
  ...DeleteRuleSpec.shape,
  references: z
    .string()
    .regex(/^[^.]+\.[^.]+$/, { error: "A column's `references` is written as `table.column`." })
    .transform((reference) => {
      const [table, column] = reference.split('.');
      return { table, columns: [column] };
    })
    .optional(),
  constraintName: z.string().optional(),
});

/**
 * One foreign key constraint as the database holds it, whether schema.js declares it on a
 * column or on its table. `NO ACTION` is what the database does when none is declared.
 */
export type ForeignKey = {
  constraintName: string;
  columns: string[];
  references: { table: string; columns: string[] };
  onDelete: DeleteRule | 'NO ACTION';
};

export function onDeleteOf(spec: z.infer<typeof DeleteRuleSpec>): DeleteRule | undefined {
  if (spec.cascadeDelete === true) {
    return 'CASCADE';
  }
  if (spec.restrictDelete === true) {
    return 'RESTRICT';
  }
  if (spec.setNullDelete === true) {
    return 'SET NULL';
  }
  return undefined;
}

/**
 * Every foreign key a table declares in schema.js, as `@@FOREIGN_KEYS@@` entries, with each
 * column's `references` expanded into one. Throws on a declaration it cannot read,
 * including a key `@@FOREIGN_KEYS@@` does not know.
 */
export function foreignKeySpecsOf(tableSpec: Record<string, unknown>): ForeignKeySpec[] {
  const columns = z
    .record(z.string(), ColumnSpec)
    .parse(
      Object.fromEntries(Object.entries(tableSpec).filter(([name]) => !name.startsWith('@@'))),
    );

  const foreignKeys: ForeignKeySpec[] = [];
  for (const [columnName, { references, ...rest }] of Object.entries(columns)) {
    if (references) {
      foreignKeys.push({ ...rest, columns: [columnName], references });
    }
  }

  return [...foreignKeys, ...z.array(ForeignKeySpec).parse(tableSpec['@@FOREIGN_KEYS@@'] ?? [])];
}

/**
 * Every foreign key on a table declared in schema.js, named as knex names one it is not
 * given a name for.
 */
export function foreignKeysOf(tableName: string, tableSpec: Record<string, unknown>): ForeignKey[] {
  return foreignKeySpecsOf(tableSpec).map((foreignKey) => ({
    constraintName:
      foreignKey.constraintName ?? defaultConstraintName(tableName, foreignKey.columns),
    columns: foreignKey.columns,
    references: foreignKey.references,
    onDelete: onDeleteOf(foreignKey) ?? 'NO ACTION',
  }));
}

// https://github.com/knex/knex/blob/e25d54bcb707714a17f5a5744eba5c4246bb4d1d/lib/schema/tablecompiler.js#L401-L415
function defaultConstraintName(tableName: string, columns: string[]): string {
  return `${tableName.replace(/\.|-/g, '_')}_${columns.join('_')}_foreign`.toLowerCase();
}
