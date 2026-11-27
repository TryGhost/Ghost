import {
  createAdapterFactory,
  type AdapterFactoryConfig,
  type AdapterFactoryCustomizeAdapterCreator,
  type CleanedWhere,
} from 'better-auth/adapters';
import type { BetterAuthOptions } from 'better-auth/types';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';

/**
 * A read-only column computed in SQL. Receives the table alias to qualify
 * column references with.
 */
export type VirtualColumn = (db: Knex, table: string) => Knex.Raw;

export type KnexAdapterOptions = {
  db: Knex;
  /**
   * Columns Better Auth expects that the table does not store, keyed by
   * table name and then column name. Reads return the expression, filters
   * and sorts use it, and writes to it are dropped.
   */
  virtualColumns?: Record<string, Record<string, VirtualColumn>>;
  /**
   * Values for columns Better Auth does not know about, keyed by table name.
   * Applied on insert beneath the row Better Auth writes.
   */
  createDefaults?: Record<string, (row: Record<string, unknown>) => Record<string, unknown>>;
  debugLogs?: AdapterFactoryConfig['debugLogs'];
};

type Row = Record<string, unknown>;
type QB = Knex.QueryBuilder;

// MySQL LIKE treats % and _ as wildcards and \ as the escape character
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

const toCount = (value: unknown) => {
  const count = Number(value ?? 0);
  return count > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : count;
};

function createCustomAdapter(
  db: Knex,
  { virtualColumns = {}, createDefaults = {} }: KnexAdapterOptions,
  inTransaction: boolean,
): AdapterFactoryCustomizeAdapterCreator {
  return ({ getFieldName, getDefaultModelName, schema }) => {
    // Only columns that back a field in the current schema, so a plugin's
    // virtual column stays dormant (and its tables unread) until enabled
    const virtualsFor = (model: string): Record<string, VirtualColumn> => {
      const virtuals = virtualColumns[model];
      if (!virtuals) {
        return {};
      }
      let fields: Record<string, { fieldName?: string }> | undefined;
      try {
        fields = schema[getDefaultModelName(model)]?.fields;
      } catch {
        return {};
      }
      const columns = new Set(
        Object.entries(fields ?? {}).map(([field, attr]) => attr.fieldName ?? field),
      );
      return Object.fromEntries(Object.entries(virtuals).filter(([column]) => columns.has(column)));
    };

    const withTransaction = <T>(fn: (trx: Knex) => Promise<T>): Promise<T> =>
      inTransaction ? fn(db) : db.transaction((trx) => fn(trx));

    // A column of `table` (aliased as `alias`), or its SQL expression when virtual
    const columnRef = (table: string, alias: string, column: string): Knex.Raw =>
      virtualsFor(table)[column]?.(db as Knex, alias) ?? db.ref(`${alias}.${column}`);

    const fieldColumn = (modelKey: string, field: string) =>
      getFieldName({ model: modelKey, field });

    const stripVirtual = (model: string, data: Row): Row => {
      const virtuals = virtualsFor(model);
      return Object.fromEntries(Object.entries(data).filter(([key]) => !(key in virtuals)));
    };

    const selectColumns = (model: string, alias: string, columns?: string[]) => {
      const virtuals = virtualsFor(model);
      const wanted = columns?.length ? columns : null;
      const real = wanted ? wanted.filter((c) => !(c in virtuals)) : [`${alias}.*`];
      const computed = Object.entries(virtuals)
        .filter(([column]) => !wanted || wanted.includes(column))
        .map(([column, expr]) => db.raw('? as ??', [expr(db as Knex, alias), column]));
      return [...real.map((c) => (c.endsWith('.*') ? c : `${alias}.${c}`)), ...computed];
    };

    const applyCondition = (qb: QB, model: string, alias: string, w: CleanedWhere, or: boolean) => {
      const { value, operator = 'eq', mode = 'sensitive' } = w;
      const column = columnRef(model, alias, fieldColumn(model, w.field));
      const insensitive =
        mode === 'insensitive' &&
        (typeof value === 'string' ||
          (Array.isArray(value) && value.every((v) => typeof v === 'string')));
      const lhs = insensitive ? db.raw('LOWER(?)', [column]) : column;
      const rhs = insensitive
        ? Array.isArray(value)
          ? (value as string[]).map((v) => v.toLowerCase())
          : (value as string).toLowerCase()
        : value;
      const where = or ? 'orWhere' : 'where';

      switch (operator) {
        case 'in':
          return qb[or ? 'orWhereIn' : 'whereIn'](
            lhs as never,
            (Array.isArray(rhs) ? rhs : [rhs]) as never,
          );
        case 'not_in':
          return qb[or ? 'orWhereNotIn' : 'whereNotIn'](
            lhs as never,
            (Array.isArray(rhs) ? rhs : [rhs]) as never,
          );
        case 'contains':
          return qb[where](lhs, 'like', `%${escapeLike(String(rhs))}%`);
        case 'starts_with':
          return qb[where](lhs, 'like', `${escapeLike(String(rhs))}%`);
        case 'ends_with':
          return qb[where](lhs, 'like', `%${escapeLike(String(rhs))}`);
        case 'eq':
          return rhs === null
            ? qb[or ? 'orWhereNull' : 'whereNull'](lhs as never)
            : qb[where](lhs, '=', rhs as never);
        case 'ne':
          return rhs === null
            ? qb[or ? 'orWhereNotNull' : 'whereNotNull'](lhs as never)
            : qb[where](lhs, '<>', rhs as never);
        case 'gt':
          return qb[where](lhs, '>', rhs as never);
        case 'gte':
          return qb[where](lhs, '>=', rhs as never);
        case 'lt':
          return qb[where](lhs, '<', rhs as never);
        case 'lte':
          return qb[where](lhs, '<=', rhs as never);
        default:
          throw new errors.IncorrectUsageError({
            message: `Unsupported where operator: ${operator}`,
          });
      }
    };

    // AND conditions are all required; OR conditions form one group that must
    // match at least once, matching Better Auth's other SQL adapters
    const applyWhere = (qb: QB, model: string, where: CleanedWhere[] = [], alias = model): QB => {
      const and = where.filter((w) => w.connector !== 'OR');
      const or = where.filter((w) => w.connector === 'OR');
      if (and.length) {
        qb.where((b) => {
          for (const w of and) {
            applyCondition(b, model, alias, w, false);
          }
        });
      }
      if (or.length) {
        qb.where((b) => {
          for (const w of or) {
            applyCondition(b, model, alias, w, true);
          }
        });
      }
      return qb;
    };

    const findById = (executor: Knex, model: string, modelKey: string, id: unknown) =>
      executor
        .from(model)
        .select(selectColumns(model, model))
        .where(`${model}.${fieldColumn(modelKey, 'id')}`, id as never)
        .first() as Promise<Row | undefined>;

    // No native joins: createKnexAdapter rejects advanced.database.joins, so
    // Better Auth never passes `join` here and fetches relations separately.
    // To add them, drop that guard, restore the removed implementation (last
    // fixed in #33055), apply the join-alias fix from #33116, then re-enable
    // joinsTestSuite.
    const selectRows = (model: string, modelKey: string, select: string[] | undefined) =>
      db.from(model).select(
        selectColumns(
          model,
          model,
          select?.map((f) => fieldColumn(modelKey, f)),
        ),
      );

    const countRows = async (model: string, where: CleanedWhere[] | undefined) => {
      const row = await applyWhere(db.from(model).count({ count: '*' }), model, where).first();
      return toCount(row?.count);
    };

    return {
      async create({ model, modelKey = model, data }) {
        const idColumn = fieldColumn(modelKey, 'id');
        const id = data[idColumn];
        if (id === undefined || id === null) {
          // Rows are read back by id, so a database-generated id can't be used
          throw new errors.IncorrectUsageError({
            message: `${model}: the Knex adapter needs Better Auth to generate ids (advanced.database.generateId).`,
          });
        }
        const row = { ...data, [idColumn]: id };
        await db(model).insert(stripVirtual(model, { ...createDefaults[model]?.(row), ...row }));
        return (await findById(db, model, modelKey, id)) as never;
      },

      async findOne({ model, modelKey = model, where, select }) {
        const row = await applyWhere(selectRows(model, modelKey, select), model, where).first();
        return (row ?? null) as never;
      },

      async findMany({ model, modelKey = model, where, limit, select, sortBy, offset }) {
        const qb = applyWhere(selectRows(model, modelKey, select), model, where);
        if (sortBy) {
          qb.orderBy(
            columnRef(model, model, fieldColumn(modelKey, sortBy.field)) as never,
            sortBy.direction,
          );
        }
        if (limit !== undefined) {
          qb.limit(limit);
        }
        if (offset !== undefined) {
          // MySQL requires a LIMIT alongside OFFSET
          if (limit === undefined) {
            qb.limit(Number.MAX_SAFE_INTEGER);
          }
          qb.offset(offset);
        }
        return (await qb) as never;
      },

      async update({ model, modelKey = model, where, update }) {
        if (!where.length) {
          return null;
        }
        const idColumn = fieldColumn(modelKey, 'id');
        return withTransaction(async (trx) => {
          const target = await applyWhere(
            trx.from(model).select(`${model}.${idColumn}`),
            model,
            where,
          )
            .forUpdate()
            .first();
          if (!target) {
            return null;
          }

          const values = stripVirtual(model, update as Row);
          if (Object.keys(values).length) {
            await trx(model).where(idColumn, target[idColumn]).update(values);
          }
          return ((await findById(trx, model, modelKey, values[idColumn] ?? target[idColumn])) ??
            null) as never;
        });
      },

      async updateMany({ model, where, update }) {
        const values = stripVirtual(model, update as Row);
        if (!Object.keys(values).length) {
          return countRows(model, where);
        }
        return toCount(await applyWhere(db(model), model, where).update(values));
      },

      async delete({ model, where }) {
        await applyWhere(db(model), model, where).delete();
      },

      async deleteMany({ model, where }) {
        return toCount(await applyWhere(db(model), model, where).delete());
      },

      async count({ model, where }) {
        return countRows(model, where);
      },

      // MySQL has no DELETE ... RETURNING, so lock, read, then delete
      async consumeOne({ model, modelKey = model, where }) {
        const idColumn = fieldColumn(modelKey, 'id');
        return withTransaction(async (trx) => {
          const row = await applyWhere(
            trx.from(model).select(selectColumns(model, model)),
            model,
            where,
          )
            .forUpdate()
            .first();
          if (!row) {
            return null;
          }
          const deleted = await trx(model).where(idColumn, row[idColumn]).delete();
          return (deleted > 0 ? row : null) as never;
        });
      },

      async incrementOne({ model, modelKey = model, where, increment, set }) {
        const idColumn = fieldColumn(modelKey, 'id');
        return withTransaction(async (trx) => {
          const target = await applyWhere(
            trx.from(model).select(`${model}.${idColumn}`),
            model,
            where,
          )
            .forUpdate()
            .first();
          if (!target) {
            return null;
          }

          const values: Row = stripVirtual(model, { ...(set ?? {}) });
          for (const [column, delta] of Object.entries(increment)) {
            values[column] = trx.raw('?? + ?', [column, delta]);
          }
          const updated = await applyWhere(
            trx(model).where(`${model}.${idColumn}`, target[idColumn]),
            model,
            where,
          ).update(values);
          if (!updated) {
            return null;
          }
          return ((await findById(trx, model, modelKey, target[idColumn])) ?? null) as never;
        });
      },
    };
  };
}

export function createKnexAdapter(options: KnexAdapterOptions) {
  const { db } = options;
  let lazyOptions: BetterAuthOptions | null = null;

  const config: AdapterFactoryConfig = {
    adapterId: 'ghost-knex',
    adapterName: 'Ghost Knex Adapter',
    debugLogs: options.debugLogs,
    // String ids from advanced.database.generateId only
    supportsNumericIds: false,
    supportsUUIDs: false,
    // Ghost has no native JSON or boolean columns
    supportsJSON: false,
    supportsBooleans: false,
    supportsArrays: false,
    // Better Auth is MySQL-only in Ghost; SQLite is dropped in 7.0
    supportsDates: true,
    // Table names are mapped explicitly through Better Auth's modelName options
    usePlural: false,
  };

  const adapter = createAdapterFactory({
    adapter: createCustomAdapter(db, options, false),
    config: {
      ...config,
      transaction: (cb) =>
        db.transaction((trx) =>
          cb(
            createAdapterFactory({
              adapter: createCustomAdapter(trx, options, true),
              config: { ...config, transaction: false },
            })(lazyOptions!),
          ),
        ),
    },
  });

  return (opts: BetterAuthOptions) => {
    if (opts.advanced?.database?.joins) {
      throw new errors.IncorrectUsageError({
        message: 'The Ghost Knex adapter does not support native joins (advanced.database.joins).',
      });
    }
    lazyOptions = opts;
    return adapter(opts);
  };
}
