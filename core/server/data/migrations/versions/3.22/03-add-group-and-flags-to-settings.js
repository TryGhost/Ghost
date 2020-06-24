const commands = require('../../../schema').commands;

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        function addSettingsColumn(column) {
            return {
                table: 'settings',
                column,
                dbIsInCorrectState(columnExists) {
                    return columnExists === true;
                },
                operation: commands.addColumn,
                operationVerb: 'Adding'
            };
        }

        const columnMigration = commands.createColumnMigration(
            addSettingsColumn('group'),
            addSettingsColumn('flags')
        );

        return columnMigration(options);
    },

    async down(options) {
        function removeSettingsColumn(column) {
            return {
                table: 'settings',
                column,
                dbIsInCorrectState(columnExists) {
                    return columnExists === false;
                },
                operation: commands.dropColumn,
                operationVerb: 'Removing'
            };
        }

        const columnMigration = commands.createColumnMigration(
            removeSettingsColumn('group'),
            removeSettingsColumn('flags')
        );

        return columnMigration(options);
    }
};
