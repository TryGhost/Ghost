const Promise = require('bluebird');
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

const pageColumnToPageType = createColumnToColumnMigration({
    tableName: 'posts',
    from: {
        page: true
    },
    to: {
        type: 'page'
    }
});

const pageColumnToPostType = createColumnToColumnMigration({
    tableName: 'posts',
    from: {
        page: false
    },
    to: {
        type: 'post'
    }
});

module.exports.up = ({transacting}) => {
    return Promise.all([
        pageColumnToPageType.up(transacting),
        pageColumnToPostType.up(transacting)
    ]);
};

module.exports.down = ({transacting}) => {
    return Promise.all([
        pageColumnToPageType.down(transacting),
        pageColumnToPostType.down(transacting)
    ]);
};

module.exports.config = {
    transaction: true
};
