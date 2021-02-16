const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Adding version to posts.mobiledoc objects and cleaning up deprecated card names');

    await knex.transaction(async (trx) => {
        // get list of posts ids, use .forUpdate to lock rows until the transaction is finished
        const postIdRows = await knex('posts')
            .transacting(trx)
            .forUpdate()
            .select('id');

        // transform each post individually to avoid dumping all posts into memory and
        // pushing all queries into the query builder buffer in parallel
        // https://stackoverflow.com/questions/54105280/how-to-loop-through-multi-line-sql-query-and-use-them-in-knex-transactions

        for (const postIdRow of postIdRows) {
            const {id} = postIdRow;
            const [{mobiledoc: mobiledocJson}] = await knex('posts')
                .transacting(trx)
                .where({id})
                .select('mobiledoc');

            const mobiledoc = JSON.parse(mobiledocJson);

            // set a ghostVersion property so we can make breaking renderer
            // changes without affecting old content
            if (!mobiledoc.ghostVersion) {
                mobiledoc.ghostVersion = '3.0';
            }

            if (mobiledoc.cards) {
                mobiledoc.cards.forEach((card) => {
                    // card-markdown card was used in 1.0 and aliased to markdown in 2.0 onwards
                    // clean it up here whilst we're already modifying mobiledoc
                    if (card[0] === 'card-markdown') {
                        card[0] = 'markdown';
                    }

                    // there was a bug for a while that dumped a urlUtils object into the hr card payload
                    // clean it up because it's large and not needed
                    if (card[0] === 'hr') {
                        card[1] = {};
                    }
                });
            }

            await knex('posts')
                .transacting(trx)
                .where({id})
                .update({
                    mobiledoc: JSON.stringify(mobiledoc)
                });
        }

        return 'transaction complete';
    });
});
