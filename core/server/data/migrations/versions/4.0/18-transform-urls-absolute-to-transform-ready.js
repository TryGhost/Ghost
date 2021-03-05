const logging = require('../../../../../shared/logging');
const urlUtils = require('../../../../../shared/url-utils');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Transforming all internal urls to transform-ready');

    await knex.transaction(async (trx) => {
        // posts and posts_meta
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
            const mobiledoc = urlUtils.mobiledocToTransformReady(post.mobiledoc);
            const custom_excerpt = urlUtils.htmlToTransformReady(post.custom_excerpt);
            const codeinjection_head = urlUtils.htmlToTransformReady(post.codeinjection_head);
            const codeinjection_foot = urlUtils.htmlToTransformReady(post.codeinjection_foot);
            const feature_image = urlUtils.toTransformReady(post.feature_image);
            const canonical_url = urlUtils.toTransformReady(post.canonical_url, {ignoreProtocol: false});

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
                const og_image = urlUtils.toTransformReady(postMeta.og_image);
                const twitter_image = urlUtils.toTransformReady(postMeta.twitter_image);

                await knex('posts_meta')
                    .transacting(trx)
                    .where({post_id: id})
                    .update({
                        og_image,
                        twitter_image
                    });
            }
        }

        // users
        const userIdRows = await knex('users')
            .transacting(trx)
            .forUpdate()
            .select('id');

        for (const userIdRow of userIdRows) {
            const {id} = userIdRow;
            const [user] = await knex('users')
                .transacting(trx)
                .where({id})
                .select([
                    'profile_image',
                    'cover_image'
                ]);

            const profile_image = urlUtils.toTransformReady(user.profile_image);
            const cover_image = urlUtils.toTransformReady(user.cover_image);

            await knex('users')
                .transacting(trx)
                .where({id})
                .update({
                    profile_image,
                    cover_image
                });
        }

        // tags
        const tagIdRows = await knex('tags')
            .transacting(trx)
            .forUpdate()
            .select('id');

        for (const tagIdRow of tagIdRows) {
            const {id} = tagIdRow;
            const [tag] = await knex('tags')
                .transacting(trx)
                .where({id})
                .select([
                    'feature_image',
                    'og_image',
                    'twitter_image',
                    'codeinjection_head',
                    'codeinjection_foot',
                    'canonical_url'
                ]);

            const feature_image = urlUtils.toTransformReady(tag.feature_image);
            const og_image = urlUtils.toTransformReady(tag.og_image);
            const twitter_image = urlUtils.toTransformReady(tag.twitter_image);
            const codeinjection_head = urlUtils.htmlToTransformReady(tag.codeinjection_head);
            const codeinjection_foot = urlUtils.htmlToTransformReady(tag.codeinjection_foot);
            const canonical_url = urlUtils.toTransformReady(tag.canonical_url, {ignoreProtocol: false});

            await knex('tags')
                .transacting(trx)
                .where({id})
                .update({
                    feature_image,
                    og_image,
                    twitter_image,
                    codeinjection_head,
                    codeinjection_foot,
                    canonical_url
                });
        }

        // snippets
        const snippetIdRows = await knex('snippets')
            .transacting(trx)
            .forUpdate()
            .select('id');

        for (const snippetIdRow of snippetIdRows) {
            const {id} = snippetIdRow;
            const [snippet] = await knex('snippets')
                .transacting(trx)
                .where({id})
                .select([
                    'mobiledoc'
                ]);

            const mobiledoc = urlUtils.mobiledocToTransformReady(snippet.mobiledoc);

            await knex('snippets')
                .transacting(trx)
                .where({id})
                .update({
                    mobiledoc
                });
        }

        // settings
        const settingsRows = await knex('settings')
            .transacting(trx)
            .forUpdate()
            .whereIn('key', [
                'cover_image',
                'logo',
                'icon',
                'portal_button_icon',
                'og_image',
                'twitter_image'
            ]);

        for (const settingRow of settingsRows) {
            let {key, value} = settingRow;

            value = urlUtils.toTransformReady(value);

            await knex('settings')
                .transacting(trx)
                .where({key})
                .update({value});
        }

        return 'transaction complete';
    });
});
