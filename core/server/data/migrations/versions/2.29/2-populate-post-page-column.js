const toPairs = require('lodash/toPairs');
const logging = require('@tryghost/logging');

/*
 * @param from: object with a SINGLE entry { 'fromColumn': 'fromValue' }
 * @param to: object with a SINGLE entry { 'toColumn': 'toValue' }
 */
const createColumnToColumnMap = ({from, to, tableName}) => (connection) => {
    return connection.schema.hasTable(tableName)
        .then((tableExists) => {
            if (!tableExists) {
                logging.warn(
                    `Table ${tableName} does not exist`
                );
                return;
            }

            const [fromColumn, fromValue] = toPairs(from)[0];
            const [toColumn, toValue] = toPairs(to)[0];

            return Promise.all([
                connection.schema.hasColumn(tableName, fromColumn),
                connection.schema.hasColumn(tableName, toColumn)
            ]).then(([fromColumnExists, toColumnExists]) => {
                if (!fromColumnExists) {
                    logging.warn(
                        `Table '${tableName}' does not have column '${fromColumn}'`
                    );
                }
                if (!toColumnExists) {
                    logging.warn(
                        `Table '${tableName}' does not have column '${toColumn}'`
                    );
                }
                if (!fromColumnExists || !toColumnExists) {
                    return;
                }

                logging.info(
                    `Updating ${tableName}, setting "${toColumn}" column to "${toValue}" where "${fromColumn}" column is "${fromValue}"`
                );

                return connection(tableName)
                    .where(fromColumn, fromValue)
                    .update(toColumn, toValue);
            });
        });
};

const createColumnToColumnMigration = ({tableName, from, to}) => {
    return {
        up: createColumnToColumnMap({from, to, tableName}),
        down: createColumnToColumnMap({from: to, to: from, tableName})
    };
};

const typeColumnToPageTrue = createColumnToColumnMigration({
    tableName: 'posts',
    from: {
        type: 'page'
    },
    to: {
        page: true
    }
});

const typeColumnToPageFalse = createColumnToColumnMigration({
    tableName: 'posts',
    from: {
        type: 'post'
    },
    to: {
        page: false
    }
});

module.exports.up = ({transacting}) => {
    return transacting.schema.hasColumn('posts', 'type').then((hasTypeColumn) => {
        if (!hasTypeColumn) {
            // no-op'd post.page->post.type migrations were never run
            return Promise.resolve();
        }

        return Promise.all([
            typeColumnToPageTrue.up(transacting),
            typeColumnToPageFalse.up(transacting)
        ]);
    });
};

// `up` only runs in order to fix a previous migration so we don't want to do
// anything in `down` because it would put previously-fine sites into the wrong
// state
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
