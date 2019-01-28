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
    if (!columns.length) {
        return tablesToUpdate;
    }
    return tablesToUpdate.concat({
        tableName,
        columns
    });
}, []);

const createReplace = (connection, from, to) => (tableName, columnName) => {
    return connection.schema.hasTable(tableName)
        .then((tableExists) => {
            if (!tableExists) {
                common.logging.warn(
                    `Table ${tableName} does not exist`
                );
                return;
            }
            return connection.schema.hasColumn(tableName, columnName)
                .then((columnExists) => {
                    if (!columnExists) {
                        common.logging.warn(
                            `Table '${tableName}' does not have column '${columnName}'`
                        );
                        return;
                    }

                    common.logging.info(
                        `Updating ${tableName}, setting '${from}' in ${columnName} to '${to}'`
                    );

                    return connection(tableName)
                        .where(columnName, from)
                        .update(columnName, to);
                });
        });
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

module.exports.config = {
      transaction: true
};
