const commands = require('../../../schema').commands;

module.exports.up = commands.createColumnMigration({
    table: 'posts',
    column: 'meta_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'meta_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'og_image',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'og_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'og_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'twitter_image',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'twitter_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
},
{
    table: 'posts',
    column: 'twitter_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Dropping'
});

module.exports.down = commands.createColumnMigration({
    table: 'posts',
    column: 'meta_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }
},
{
    table: 'posts',
    column: 'meta_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }
},
{
    table: 'posts',
    column: 'og_image',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }
},
{
    table: 'posts',
    column: 'og_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 300
    }
},
{
    table: 'posts',
    column: 'og_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 500
    }
},
{
    table: 'posts',
    column: 'twitter_image',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }
},
{
    table: 'posts',
    column: 'twitter_title',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 300
    }
},
{
    table: 'posts',
    column: 'twitter_description',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'string',
        nullable: true,
        maxlength: 500
    }
});

module.exports.config = {
    transaction: true
};
