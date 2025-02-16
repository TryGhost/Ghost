const {createIrreversibleMigration} = require('../../utils');
const {addUnique} = require('../../../schema/commands');
const logging = require('@tryghost/logging');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Adding unique constraint to tag-post relationship');

    await addUnique('posts_tags', ['tag_id', 'post_id'], knex);
});
