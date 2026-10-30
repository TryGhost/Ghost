const db = require('../../data/db');
const schema = require('../schema');
const commands = schema.commands;
const ghostVersion = require('@tryghost/version');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
  errorExportingData: 'Error exporting data',
};

const { TABLES_ALLOWLIST, SETTING_KEYS_BLOCKLIST } = require('./table-lists');

const DEFAULT_BATCH_SIZE = 100;

const isTableExported = function isTableExported(tableName, options) {
  return (
    TABLES_ALLOWLIST.includes(tableName) ||
    (options.include && Array.isArray(options.include) && options.include.indexOf(tableName) !== -1)
  );
};

const exportTable = function exportTable(tableName, options) {
  if (isTableExported(tableName, options)) {
    const query = (options.transacting || db.knex)(tableName);

    return query.select();
  }
};

const getSettingsTableData = function getSettingsTableData(settingsData) {
  return (
    settingsData &&
    settingsData.filter((setting) => {
      // core settings hold instance secrets and are never imported, so never export them
      return setting.group !== 'core' && !SETTING_KEYS_BLOCKLIST.includes(setting.key);
    })
  );
};

const getExportMeta = function getExportMeta() {
  return {
    exported_on: new Date().getTime(),
    version: ghostVersion.full,
  };
};

/**
 * @param {string} tableName
 * @returns {string|null} the column to page on, or null when the table has no single-column primary key
 */
const getKeysetColumn = function getKeysetColumn(tableName) {
  const tableSchema = schema.tables[tableName];
  if (!tableSchema) {
    return null;
  }

  const primaryColumns = Object.keys(tableSchema).filter(
    (column) => tableSchema[column] && tableSchema[column].primary,
  );

  return primaryColumns.length === 1 ? primaryColumns[0] : null;
};

/**
 * Reads a table in batches using keyset pagination, so memory use is bounded by the batch size
 * rather than the table size. Tables without a single-column primary key are read in one query.
 *
 * @param {string} tableName
 * @param {object} options
 * @param {number} batchSize
 * @returns {AsyncGenerator<object[]>}
 */
const readTableInBatches = async function* readTableInBatches(tableName, options, batchSize) {
  const knex = options.transacting || db.knex;
  const keysetColumn = getKeysetColumn(tableName);

  if (!keysetColumn) {
    yield await knex(tableName).select();
    return;
  }

  let lastKey = null;
  while (true) {
    const query = knex(tableName).select().orderBy(keysetColumn).limit(batchSize);
    if (lastKey !== null) {
      query.where(keysetColumn, '>', lastKey);
    }

    const rows = await query;
    if (rows.length > 0) {
      yield rows;
    }
    if (rows.length < batchSize) {
      return;
    }
    lastKey = rows[rows.length - 1][keysetColumn];
  }
};

const doExport = async function doExport(options) {
  options = options || { include: [] };

  try {
    const tables = await commands.getTables(options.transacting);

    const tableData = [];
    for (const tableName of tables) {
      tableData.push(await exportTable(tableName, options));
    }

    const exportData = {
      meta: getExportMeta(),
      data: {
        // Filled below
      },
    };

    tables.forEach((name, i) => {
      if (name === 'settings') {
        exportData.data[name] = getSettingsTableData(tableData[i]);
      } else {
        exportData.data[name] = tableData[i];
      }
    });

    return exportData;
  } catch (err) {
    throw new errors.DataExportError({
      err: err,
      context: tpl(messages.errorExportingData),
    });
  }
};

/**
 * Yields the same JSON as `JSON.stringify(await doExport(options))` in pieces: meta, then each
 * table, then rows in batches. Neither the full JSON string nor the full data object is ever held
 * in memory, so exports larger than V8's maximum string length can be written to a file or stream.
 *
 * Rows within a table are ordered by primary key, which can differ from the unordered `doExport` read.
 *
 * @param {object} [options]
 * @param {string[]} [options.include] - extra tables to export on top of the allowlist
 * @param {import('knex').Knex.Transaction} [options.transacting]
 * @param {number} [options.batchSize] - rows read and serialized per chunk
 * @returns {AsyncGenerator<string>}
 */
const streamExport = async function* streamExport(options = {}) {
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;

  try {
    const tables = await commands.getTables(options.transacting);
    const exportedTables = tables.filter((tableName) => isTableExported(tableName, options));

    yield `{"meta":${JSON.stringify(getExportMeta())},"data":{`;

    for (const [tableIndex, tableName] of exportedTables.entries()) {
      yield `${tableIndex > 0 ? ',' : ''}${JSON.stringify(tableName)}:[`;

      let isFirstRow = true;
      for await (const batch of readTableInBatches(tableName, options, batchSize)) {
        const rows = tableName === 'settings' ? getSettingsTableData(batch) : batch;
        if (rows.length === 0) {
          continue;
        }

        const serializedRows = rows.map((row) => JSON.stringify(row)).join(',');
        yield `${isFirstRow ? '' : ','}${serializedRows}`;
        isFirstRow = false;
      }

      yield ']';
    }

    yield '}}';
  } catch (err) {
    throw new errors.DataExportError({
      err: err,
      context: tpl(messages.errorExportingData),
    });
  }
};

module.exports = {
  doExport,
  streamExport,
};
