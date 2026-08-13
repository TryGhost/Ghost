const {
    combineNonTransactionalMigrations,
    createAddColumnMigration
} = require('../../utils');

const addGiftColumn = (name, definition) => createAddColumnMigration(
    'gifts',
    name,
    definition,
    {algorithm: 'auto'}
);

module.exports = combineNonTransactionalMigrations(
    addGiftColumn('buyer_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('recipient_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('personal_message', {type: 'text', maxlength: 500, nullable: true})
);
