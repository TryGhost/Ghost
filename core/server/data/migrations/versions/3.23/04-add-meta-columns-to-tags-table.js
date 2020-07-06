const commands = require('../../../schema').commands;

const newColumns = [{
    column: 'og_image',
    columnDefinition: {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }
}, {
    column: 'og_title',
    columnDefinition: {
        type: 'string',
        maxlength: 300,
        nullable: true
    }
}, {
    column: 'og_description',
    columnDefinition: {
        type: 'string',
        maxlength: 500,
        nullable: true
    }
}, {
    column: 'twitter_image',
    columnDefinition: {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }
}, {
    column: 'twitter_title',
    columnDefinition: {
        type: 'string',
        maxlength: 300,
        nullable: true
    }
}, {
    column: 'twitter_description',
    columnDefinition: {
        type: 'string',
        maxlength: 500,
        nullable: true
    }
}, {
    column: 'codeinjection_head',
    columnDefinition: {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }
}, {
    column: 'codeinjection_foot',
    columnDefinition: {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }
}, {
    column: 'canonical_url',
    columnDefinition: {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }
}, {
    column: 'accent_color',
    columnDefinition: {
        type: 'string',
        maxlength: 50,
        nullable: true
    }
}];

module.exports = {
    config: {
        transaction: true
    },

    up: commands.createColumnMigration(...newColumns.map((column) => {
        return Object.assign({}, column, {
            table: 'tags',
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding'
        });
    })),

    down: commands.createColumnMigration(...newColumns.map((column) => {
        return Object.assign({}, column, {
            table: 'tags',
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing'
        });
    }))
};
