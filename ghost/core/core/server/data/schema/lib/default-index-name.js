/**
 * Normally, we use Knex for index names. But in some cases, we need to derive
 * them because Knex won't get it right. We try to match [Knex's code][0] as
 * closely as possible.
 *
 * [0]: https://github.com/knex/knex/blob/e25d54bcb707714a17f5a5744eba5c4246bb4d1d/lib/schema/tablecompiler.js#L401-L415
 *
 * @param {string} tableName
 * @param {string|string[]} columns
 * @returns {string}
 */
function defaultIndexName(tableName, columns) {
    if (!Array.isArray(columns)) {
        columns = columns ? [columns] : [];
    }
    const table = tableName.replace(/\.|-/g, '_');
    return (table + '_' + columns.join('_') + '_index').toLowerCase();
}

exports.defaultIndexName = defaultIndexName;
