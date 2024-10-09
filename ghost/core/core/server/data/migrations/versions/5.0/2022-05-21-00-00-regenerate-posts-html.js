const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');
const mobiledocLib = require('../../../../lib/mobiledoc');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info(`Starting regeneration of posts HTML`);

    await knex.transaction(async (trx) => {
        // get list of posts ids, use .forUpdate to lock rows until the transaction is finished
        const postIdRows = await knex('posts')
            .transacting(trx)
            .forUpdate()
            .select('id')
            .where('mobiledoc', 'like', '%["video%')
            .orWhere('mobiledoc', 'like', '%["product%');

        logging.info(`Updating HTML for ${postIdRows.length} posts`);

        // transform each post individually to avoid dumping all posts into memory and
        // pushing all queries into the query builder buffer in parallel
        // https://stackoverflow.com/questions/54105280/how-to-loop-through-multi-line-sql-query-and-use-them-in-knex-transactions

        // eslint-disable-next-line no-restricted-syntax
        for (const postIdRow of postIdRows) {
            const {id} = postIdRow;
            const [post] = await knex('posts')
                .transacting(trx)
                .where({id})
                .select('mobiledoc', 'html', 'plaintext');

            let mobiledoc;

            try {
                mobiledoc = JSON.parse(post.mobiledoc || null);

                if (!mobiledoc) {
                    logging.warn(`No mobiledoc for ${id}. Skipping.`);
                    continue;
                }
            } catch (err) {
                logging.warn(`Invalid JSON structure for ${id}. Skipping`);
                continue;
            }

            const html = mobiledocLib.render(mobiledoc);

            const updatedAttrs = {
                html
            };

            if (html !== post.html || !post.plaintext) {
                const plaintext = htmlToPlaintext.excerpt(html);

                if (plaintext !== post.plaintext) {
                    updatedAttrs.plaintext = plaintext;
                }
            }

            await knex('posts')
                .transacting(trx)
                .where({id})
                .update(updatedAttrs);
        }

        return 'transaction complete';
    });

    logging.info('Finished regeneration of posts HTML');
});
