const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;

const createLog = type => msg => common.logging[type](msg);

function createColumnMigration({table, column, dbIsInCorrectState, operation, operationVerb}) {
    return function columnMigrations({transacting}) {
        return transacting.schema.hasColumn(table, column)
            .then(dbIsInCorrectState)
            .then((isInCorrectState) => {
                const log = createLog(isInCorrectState ? 'warn' : 'info');

                log(`${operationVerb} ${table}.${column}`);

                if (!isInCorrectState) {
                    // has to be passed directly in case of migration to 3.0
                    // ref: https://github.com/TryGhost/Ghost/commit/9d7190d69255ac011848c6bf654886be81abeedc#diff-c20cac44dad77922cf53ffd7b094cd8cL22
                    const columnSpec = {
                        type: 'bool',
                        nullable: false,
                        defaultTo: false
                    };

                    return operation(table, column, transacting, columnSpec);
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
            column: 'page',
            dbIsInCorrectState(columnExists) {
                return columnExists === true;
            },
            operation: commands.addColumn,
            operationVerb: 'Adding'
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
