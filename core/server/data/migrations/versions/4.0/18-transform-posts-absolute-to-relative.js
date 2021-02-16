const logging = require('../../../../../shared/logging');
const urlUtils = require('../../../../../shared/url-utils');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Transforming all internal urls in posts from absolute to relative');

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
                .select([
                    'mobiledoc',
                    'custom_excerpt',
                    'codeinjection_head',
                    'codeinjection_foot',
                    'feature_image',
                    'canonical_url'
                ]);

            /* eslint-disable camelcase */
            const mobiledoc = urlUtils.mobiledocAbsoluteToRelative(post.mobiledoc);
            const custom_excerpt = urlUtils.htmlAbsoluteToRelative(post.custom_excerpt);
            const codeinjection_head = urlUtils.htmlAbsoluteToRelative(post.codeinjection_head);
            const codeinjection_foot = urlUtils.htmlAbsoluteToRelative(post.codeinjection_foot);
            const feature_image = urlUtils.absoluteToRelative(post.feature_image);
            const canonical_url = urlUtils.absoluteToRelative(post.canonical_url, {ignoreProtocol: false});

            await knex('posts')
                .transacting(trx)
                .where({id})
                .update({
                    mobiledoc,
                    custom_excerpt,
                    codeinjection_head,
                    codeinjection_foot,
                    feature_image,
                    canonical_url
                });

            const [postMeta] = await knex('posts_meta')
                .transacting(trx)
                .where({post_id: id})
                .select([
                    'og_image',
                    'twitter_image'
                ]);

            if (postMeta) {
                const og_image = urlUtils.absoluteToRelative(postMeta.og_image);
                const twitter_image = urlUtils.absoluteToRelative(postMeta.twitter_image);

                await knex('posts_meta')
                    .transacting(trx)
                    .where({post_id: id})
                    .update({
                        og_image,
                        twitter_image
                    });
            }
        }

        return 'transaction complete';
    });
});
