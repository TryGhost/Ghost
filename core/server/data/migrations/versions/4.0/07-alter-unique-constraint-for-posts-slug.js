const {createIrreversibleMigration} = require('../../utils');
const {addUnique, dropUnique} = require('../../../schema/commands');

module.exports = createIrreversibleMigration(async (knex) => {
    await dropUnique('posts', 'slug', knex);
    await addUnique('posts', ['slug', 'type'], knex);
});
