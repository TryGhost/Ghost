import {
  createAdapterFactory,
  type AdapterFactoryConfig,
  type AdapterFactoryCustomizeAdapterCreator,
  type CleanedWhere,
  type JoinConfig,
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
  /**
   * Called inside the write's transaction with the rows a create, update or
   * updateMany wrote and the values it wrote, keyed by table name. A throw
   * rolls the write back.
   */
  onWrite?: Record<string, WriteHook>;
  debugLogs?: AdapterFactoryConfig['debugLogs'];
};

type Row = Record<string, unknown>;
export type WriteHook = (trx: Knex.Transaction, rows: Row[], values: Row) => Promise<void>;
type Executor = Knex | Knex.Transaction;
type QB = Knex.QueryBuilder;

const PRIMARY = 'primary';
const joinAlias = (model: string) => `join_${model}`;
const joinColumnAlias = (model: string, column: string) => `_joined_${model}_${column}`;

// MySQL LIKE treats % and _ as wildcards and \ as the escape character
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

const toCount = (value: unknown) => {
  const count = Number(value ?? 0);
  return count > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : count;
};

function createCustomAdapter(
  db: Executor,
  { virtualColumns = {}, createDefaults = {}, onWrite = {} }: KnexAdapterOptions,
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

    const withTransaction = <T>(fn: (trx: Executor) => Promise<T>): Promise<T> =>
      inTransaction ? fn(db) : db.transaction((trx) => fn(trx));

    const runWriteHook = async (trx: Executor, model: string, rows: Row[], values: Row) => {
      if (rows.length) {
        await onWrite[model]!(trx as Knex.Transaction, rows, values);
      }
    };

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

    const findById = (executor: Executor, model: string, modelKey: string, id: unknown) =>
      executor
        .from(model)
        .select(selectColumns(model, model))
        .where(`${model}.${fieldColumn(modelKey, 'id')}`, id as never)
        .first() as Promise<Row | undefined>;

    // Primary rows go in a subquery so limit/offset apply before joins fan out
    const selectWithJoins = (
      model: string,
      modelKey: string,
      build: (qb: QB) => QB,
      select: string[] | undefined,
      join: JoinConfig | undefined,
    ) => {
      const inner = build(
        db.from(model).select(
          selectColumns(
            model,
            model,
            select?.map((f) => fieldColumn(modelKey, f)),
          ),
        ),
      );
      if (!join || !Object.keys(join).length) {
        return { query: inner, joined: [] };
      }

      const query = db.from(inner.as(PRIMARY)).select(`${PRIMARY}.*`);
      const joined: { joinModel: string; column: string }[] = [];

      for (const [joinModel, config] of Object.entries(join)) {
        const joinKey = config.modelKey ?? getDefaultModelName(joinModel);
        const alias = joinAlias(joinModel);
        query.leftJoin(
          `${joinModel} as ${alias}`,
          `${alias}.${config.on.to}`,
          `${PRIMARY}.${config.on.from}`,
        );

        const fields = schema[joinKey]?.fields ?? {};
        const columns = [
          'id',
          ...Object.entries(fields).map(([field, attr]) => attr.fieldName ?? field),
        ];
        for (const column of new Set(columns)) {
          query.select(
            db.raw('? as ??', [
              columnRef(joinModel, alias, column),
              joinColumnAlias(joinModel, column),
            ]),
          );
          joined.push({ joinModel, column });
        }
      }
      return { query, joined };
    };

    const groupJoinedRows = (
      rows: Row[],
      modelKey: string,
      join: JoinConfig,
      joined: { joinModel: string; column: string }[],
    ) => {
      const idColumn = fieldColumn(modelKey, 'id');
      const grouped = new Map<unknown, Row>();

      for (const row of rows) {
        const base: Row = { ...row };
        const related: Record<string, Row> = {};
        for (const { joinModel, column } of joined) {
          const key = joinColumnAlias(joinModel, column);
          (related[joinModel] ??= {})[column] = row[key];
          delete base[key];
        }

        const id = base[idColumn];
        if (!grouped.has(id)) {
          for (const [joinModel, config] of Object.entries(join)) {
            base[joinModel] = config.relation === 'one-to-one' ? null : [];
          }
          grouped.set(id, base);
        }
        const entry = grouped.get(id)!;

        for (const [joinModel, config] of Object.entries(join)) {
          const item = related[joinModel];
          if (!item || !Object.values(item).some((v) => v !== null && v !== undefined)) {
            continue;
          }
          if (config.relation === 'one-to-one') {
            entry[joinModel] = item;
            continue;
          }
          const list = entry[joinModel] as Row[];
          const joinIdColumn = fieldColumn(config.modelKey ?? getDefaultModelName(joinModel), 'id');
          if (
            list.length < (config.limit ?? 100) &&
            !list.some((r) => r[joinIdColumn] === item[joinIdColumn])
          ) {
            list.push(item);
          }
        }
      }
      return [...grouped.values()];
    };

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
        const values = stripVirtual(model, { ...createDefaults[model]?.(row), ...row });
        if (!onWrite[model]) {
          await db(model).insert(values);
          return (await findById(db, model, modelKey, id)) as never;
        }
        return withTransaction(async (trx) => {
          await trx(model).insert(values);
          const created = await findById(trx, model, modelKey, id);
          await runWriteHook(trx, model, created ? [created] : [], values);
          return created as never;
        });
      },

      async findOne({ model, modelKey = model, where, select, join }) {
        const { query, joined } = selectWithJoins(
          model,
          modelKey,
          (qb) => applyWhere(qb, model, where).limit(1),
          select,
          join,
        );
        const rows: Row[] = await query;
        if (!rows.length) {
          return null;
        }
        return (
          join && joined.length ? groupJoinedRows(rows, modelKey, join, joined)[0] : rows[0]
        ) as never;
      },

      async findMany({ model, modelKey = model, where, limit, select, sortBy, offset, join }) {
        const sort = sortBy && columnRef(model, model, fieldColumn(modelKey, sortBy.field));
        const { query, joined } = selectWithJoins(
          model,
          modelKey,
          (qb) => {
            applyWhere(qb, model, where);
            if (sort) {
              qb.orderBy(sort as never, sortBy!.direction);
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
            return qb;
          },
          select,
          join,
        );
        if (sort && joined.length) {
          query.orderBy(`${PRIMARY}.${fieldColumn(modelKey, sortBy!.field)}`, sortBy!.direction);
        }
        const rows: Row[] = await query;
        return (
          join && joined.length ? groupJoinedRows(rows, modelKey, join, joined) : rows
        ) as never;
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
          const updated = await findById(
            trx,
            model,
            modelKey,
            values[idColumn] ?? target[idColumn],
          );
          if (onWrite[model] && updated && Object.keys(values).length) {
            await runWriteHook(trx, model, [updated], values);
          }
          return (updated ?? null) as never;
        });
      },

      async updateMany({ model, modelKey = model, where, update }) {
        const values = stripVirtual(model, update as Row);
        if (!Object.keys(values).length) {
          return countRows(model, where);
        }
        if (!onWrite[model]) {
          return toCount(await applyWhere(db(model), model, where).update(values));
        }
        // Lock and collect the matching ids so the hook sees exactly the rows written
        const idColumn = fieldColumn(modelKey, 'id');
        return withTransaction(async (trx) => {
          const targets: Row[] = await applyWhere(
            trx.from(model).select(`${model}.${idColumn}`),
            model,
            where,
          ).forUpdate();
          const ids = targets.map((t) => t[idColumn]);
          if (!ids.length) {
            return 0;
          }
          const count = await trx(model)
            .whereIn(idColumn, ids as never)
            .update(values);
          const rows: Row[] = await trx
            .from(model)
            .select(selectColumns(model, model))
            .whereIn(`${model}.${idColumn}`, ids as never);
          await runWriteHook(trx, model, rows, values);
          return toCount(count);
        });
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
    lazyOptions = opts;
    return adapter(opts);
  };
}
