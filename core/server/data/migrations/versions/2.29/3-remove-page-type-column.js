const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;

const createLog = type => msg => common.logging[type](msg);

function createColumnMigration({table, column, dbIsInCorrectState, operation, operationVerb, columnDefinition}) {
    return function columnMigrations({transacting}) {
        return transacting.schema.hasColumn(table, column)
            .then(dbIsInCorrectState)
            .then((isInCorrectState) => {
                const log = createLog(isInCorrectState ? 'warn' : 'info');

                log(`${operationVerb} ${table}.${column}`);

                if (!isInCorrectState) {
                    return operation(table, column, transacting, columnDefinition);
                }
            });
    };
}

module.exports.up = function (options) {
    return options.transacting.schema.hasColumn('posts', 'type').then((hasTypeColumn) => {
        if (!hasTypeColumn) {
            // no-op'd post.page->post.type migrations were never run
            return Promise.resolve();
        }

        return createColumnMigration({
            table: 'posts',
            column: 'type',
            dbIsInCorrectState(columnExists) {
                return columnExists === false;
            },
            operation: commands.dropColumn,
            operationVerb: 'Removing'
        })(options);
    });
};

// `up` only runs in order to fix a previous migration so we don't want to do
// anything in `down` because it would put previously-fine sites into the wrong
// state
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
