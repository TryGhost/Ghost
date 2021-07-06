const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');
const mobiledocLib = require('../../../../lib/mobiledoc');
const htmlToText = require('html-to-text');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Starting re-generation of posts html.');

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

            const html = mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc);

            const updatedAttrs = {
                html: html
            };

            // NOTE: block comes straight from the Post model
            // https://github.com/TryGhost/Ghost/blob/4.0.0-alpha.2/core/server/models/post.js#L484
            if (html !== post.html || !post.plaintext) {
                const plaintext = htmlToText.fromString(html, {
                    wordwrap: 80,
                    ignoreImage: true,
                    hideLinkHrefIfSameAsText: true,
                    preserveNewlines: true,
                    returnDomByDefault: true,
                    uppercaseHeadings: false
                });

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

    logging.info('Finished re-generation of posts html.');
});
