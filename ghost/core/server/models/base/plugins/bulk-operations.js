const _ = require('lodash');
const errors = require('@tryghost/errors');
const { byColumnValues, CHUNK_SIZE } = require('./bulk-filters');

const LINKED_RECORDS_CHANGED = 'LINKED_RECORDS_CHANGED';
const LINKED_TRANSACTION_ATTEMPTS = 3;

async function insert(knex, table, data, options) {
  const result = {
    successful: 0,
    unsuccessful: 0,
    unsuccessfulData: [],
    errors: [],
  };

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunkedData = data.slice(offset, offset + CHUNK_SIZE);
    try {
      await insertRecords(knex, table, chunkedData, options);
      result.successful += chunkedData.length;
    } catch (errToIgnore) {
      if (options.throwErrors) {
        throw errToIgnore;
      }
      for (const singularData of chunkedData) {
        try {
          await insertRecords(knex, table, singularData, options);
          result.successful += 1;
        } catch (err) {
          err.errorDetails = singularData;
          result.errors.push(err);
          result.unsuccessfulData.push(singularData);
          result.unsuccessful += 1;
        }
      }
    }
  }

  return result;
}

async function insertRecords(knex, table, records, options) {
  let k = knex(table);
  if (options.transacting) {
    k = k.transacting(options.transacting);
  }
  await k.insert(records);
}

/**
 * Execute a bulk operation (update or delete) with a where strategy.
 * Iterates over each query modifier yielded by the strategy, applies it to
 * a fresh query builder, and executes the operation.
 *
 * @param {import('knex')} knex - Knex instance
 * @param {string} tableName - Table to operate on
 * @param {object} options
 * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
 * @param {object} [options.transacting] - Knex transaction
 * @param {(qb: import('knex').QueryBuilder) => Promise<number>} operation - The operation to perform (update/delete)
 * @returns {Promise<number>} Total affected rows
 */
async function bulkWhereOperation(knex, tableName, { where, transacting }, operation) {
  let affectedRows = 0;
  for (const applyWhere of where) {
    let qb = knex(tableName);
    if (transacting) {
      qb = qb.transacting(transacting);
    }
    applyWhere(qb);
    affectedRows += await operation(qb);
  }
  return affectedRows;
}

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
  Bookshelf.Model = Bookshelf.Model.extend(
    {},
    {
      /**
       * Locks the rows with the given ids for the rest of the transaction, in id
       * order so writers locking overlapping sets can't deadlock each other.
       *
       * An edit locks its record's row but not its relations, so anything that
       * writes a record's relations without editing the record must take this
       * lock first. Otherwise an in-flight edit diffs its relations against rows
       * that changed underneath it. Reads that decide what to write afterwards
       * should be locking reads, as plain reads come from the transaction's
       * snapshot, which may predate the lock.
       *
       * @param {string[]} ids
       * @param {object} options
       * @param {import('knex').Knex.Transaction} options.transacting
       * @param {string[]} [options.columns] - Columns to return from the locked rows
       * @returns {Promise<object[]>} The locked rows that still exist
       */
      lockForUpdate: async function lockForUpdate(ids, { transacting, columns = ['id'] }) {
        const sortedIds = _.uniq(ids).sort();
        const rows = [];

        for (let offset = 0; offset < sortedIds.length; offset += CHUNK_SIZE) {
          const chunk = sortedIds.slice(offset, offset + CHUNK_SIZE);
          rows.push(
            ...(await Bookshelf.knex(this.prototype.tableName)
              .transacting(transacting)
              .whereIn('id', chunk)
              .orderBy('id')
              .select(columns)
              .forUpdate()),
          );
        }

        return rows;
      },

      /**
       * Locks the rows linked through `linkTable` to whatever `where` matches,
       * e.g. the posts of a tag, and returns their ids.
       *
       * The first read is a plain read, so it can't wait on the rows it finds
       * before locking them, and a locking read afterwards catches rows linked
       * in between. Locking a row found that late would take its lock after its
       * links', the reverse of an edit, so this throws instead and
       * `transactionLockingLinked` starts the transaction again.
       *
       * The plain read fixes the transaction's snapshot before the locks are
       * held, which is why reads that decide writes afterwards must be locking
       * reads.
       *
       * @param {string} linkTable
       * @param {string} foreignKey - Column in `linkTable` holding this model's id
       * @param {object} where
       * @param {object} options
       * @param {import('knex').Knex.Transaction} options.transacting
       * @returns {Promise<string[]>}
       */
      lockLinkedForUpdate: async function lockLinkedForUpdate(
        linkTable,
        foreignKey,
        where,
        { transacting },
      ) {
        const ids = await Bookshelf.knex(linkTable)
          .transacting(transacting)
          .where(where)
          .pluck(foreignKey);
        await this.lockForUpdate(ids, { transacting });

        const currentIds = await Bookshelf.knex(linkTable)
          .transacting(transacting)
          .where(where)
          .forUpdate()
          .pluck(foreignKey);
        if (_.difference(currentIds, ids).length > 0) {
          throw new errors.ConflictError({
            message: 'Records were linked while being changed, please try again.',
            code: LINKED_RECORDS_CHANGED,
          });
        }

        return _.uniq(currentIds);
      },

      /**
       * Runs `callback` in a new transaction for a writer that uses
       * `lockLinkedForUpdate`, starting again when records are linked while it
       * runs.
       *
       * @template T
       * @param {(transacting: import('knex').Knex.Transaction) => Promise<T>} callback
       * @returns {Promise<T>}
       */
      transactionLockingLinked: async function transactionLockingLinked(callback) {
        for (let attempt = 1; ; attempt += 1) {
          try {
            return await Bookshelf.transaction(callback);
          } catch (err) {
            if (err.code !== LINKED_RECORDS_CHANGED || attempt >= LINKED_TRANSACTION_ATTEMPTS) {
              throw err;
            }
          }
        }
      },

      bulkAdd: function bulkAdd(data, tableName, options = {}) {
        tableName = tableName || this.prototype.tableName;

        return insert(Bookshelf.knex, tableName, data, options);
      },

      /**
       * Edit rows matching a where strategy (e.g. byNQL, byIds, byColumnValues).
       * Pure data operation — no action logging.
       *
       * @param {object} options
       * @param {object} options.data - Column values to set
       * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
       * @param {object} [options.transacting] - Knex transaction
       * @param {string} [options.tableName] - Table to update (defaults to model's table)
       * @returns {Promise<number>} Total affected rows
       */
      bulkEditWhere: async function bulkEditWhere({ data, where, transacting, tableName }) {
        tableName = tableName || this.prototype.tableName;
        return bulkWhereOperation(Bookshelf.knex, tableName, { where, transacting }, (qb) =>
          qb.update(data),
        );
      },

      /**
       * Edit rows by ID list, with action logging.
       *
       * @param {string[]} ids - IDs (or column values) to match
       * @param {string} tableName - Table to update (defaults to model's table)
       * @param {object} [options]
       * @param {object} [options.data] - Column values to set
       * @param {string} [options.column] - Column to match against (defaults to 'id')
       * @returns {Promise<{successful: number, unsuccessful: number, errors: Array, unsuccessfulData: Array}>}
       */
      bulkEdit: async function bulkEdit(ids, tableName, options = {}) {
        tableName = tableName || this.prototype.tableName;

        try {
          const affectedRows = await this.bulkEditWhere({
            data: options.data,
            where: byColumnValues(options.column ?? 'id', ids),
            transacting: options.transacting,
            tableName,
          });

          if (affectedRows > 0 && tableName === this.prototype.tableName) {
            await this.addActions('edited', ids, options);
          }

          return { successful: ids.length, unsuccessful: 0, errors: [], unsuccessfulData: [] };
        } catch (err) {
          if (options.throwErrors) {
            throw err;
          }
          return {
            successful: 0,
            unsuccessful: ids.length,
            errors: ids.map((id) => {
              const e = Object.create(err);
              e.errorDetails = id;
              return e;
            }),
            unsuccessfulData: ids,
          };
        }
      },

      /**
       * Delete rows by ID list, with action logging.
       *
       * @param {string[]} ids - IDs (or column values) to match
       * @param {string} tableName - Table to delete from (defaults to model's table)
       * @param {object} [options]
       * @param {string} [options.column] - Column to match against (defaults to 'id')
       * @returns {Promise<{successful: number, unsuccessful: number, errors: Array, unsuccessfulData: Array}>}
       */
      bulkDestroy: async function bulkDestroy(ids, tableName, options = {}) {
        tableName = tableName || this.prototype.tableName;

        if (tableName === this.prototype.tableName) {
          // Needs to happen before, otherwise we cannot fetch the names of the deleted items
          await this.addActions('deleted', ids, options);
        }

        try {
          await bulkWhereOperation(
            Bookshelf.knex,
            tableName,
            {
              where: byColumnValues(options.column ?? 'id', ids),
              transacting: options.transacting,
            },
            (qb) => qb.del(),
          );

          return { successful: ids.length, unsuccessful: 0, errors: [], unsuccessfulData: [] };
        } catch (err) {
          if (options.throwErrors) {
            throw err;
          }
          return {
            successful: 0,
            unsuccessful: ids.length,
            errors: ids.map((id) => {
              const e = Object.create(err);
              e.errorDetails = id;
              return e;
            }),
            unsuccessfulData: ids,
          };
        }
      },
    },
  );
};
