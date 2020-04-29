const common = require('../../../../lib/common');
const table = 'posts';
const columnNameOld = 'amp';
const columnNameNew = 'comment_id';
const message1 = `Renaming column ${columnNameOld} to ${columnNameNew}`;
const message2 = `Rollback: Renaming column ${columnNameNew} to ${columnNameOld}`;
const message3 = `Renamed column ${columnNameOld} to ${columnNameNew}`;
const message4 = `Rollback: Renamed column ${columnNameNew} to ${columnNameOld}`;

module.exports.up = (options) => {
    const connection = options.connection;

    common.logging.info(message1);

    return connection.schema.hasColumn(table, columnNameOld)
        .then((exists) => {
            if (exists) {
                return connection.schema.table(table, function (t) {
                    t.renameColumn(columnNameOld, columnNameNew);
                });
            }
        })
        .then(() => {
            common.logging.info(message3);
        });
};

module.exports.down = (options) => {
    let connection = options.connection;

    common.logging.warn(message2);

    return connection.schema.hasColumn(table, columnNameNew)
        .then((exists) => {
            if (exists) {
                return connection.schema.table(table, function (t) {
                    t.renameColumn(columnNameNew, columnNameOld);
                });
            }
        })
        .then(() => {
            common.logging.warn(message4);
        });
};
