const Promise = require('bluebird');
const common = require('../../../../lib/common');
const schema = require('../../../schema');

/*
 * [{
 *   tableName: 'posts',
 *   columns: ['custom_excerpt', 'description', 'etc...']
 * }]
 * */
const tablesToUpdate = Object.keys(schema.tables).reduce((tablesToUpdate, tableName) => {
    const table = schema.tables[tableName];
    const columns = Object.keys(table).filter(columnName => table[columnName].nullable);
    return tablesToUpdate.concat({
        tableName,
        columns
    });
}, []);

const createReplace = (connection, from, to) => (tableName, columnName) => {
    common.logging.info(
        `Updating ${tableName}, setting all '${from}' in ${columnName} to ${to}`
    );

    return connection(tableName)
        .where(columnName, from)
        .update(columnName, to);
};

module.exports.up = ({connection}) => {
    const replaceEmptyStringWithNull = createReplace(connection, '', null);

    return Promise.all(
        tablesToUpdate.map(({tableName, columns}) => Promise.all(
            columns.map(
                columnName => replaceEmptyStringWithNull(tableName, columnName)
            )
        ))
    );
};

module.exports.down = ({connection}) => {
    const replaceNullWithEmptyString = createReplace(connection, null, '');

    return Promise.all(
        tablesToUpdate.map(({tableName, columns}) => Promise.all(
            columns.map(
                columnName => replaceNullWithEmptyString(tableName, columnName)
            )
        ))
    );
};
