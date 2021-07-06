const logging = require('@tryghost/logging');
const urlUtils = require('../../../../../shared/url-utils');
const htmlToPlaintext = require('../../../../../shared/html-to-plaintext');
const mobiledocLib = require('../../../../lib/mobiledoc');
const {createTransactionalMigration} = require('../../utils');

// in Ghost versions 4.6.1-4.8.4 the 4.0 migration that transfored URLs had a bug
// that meant urls inside cards in mobiledoc content was not being transformed
//
// if the migrations table indicates an upgrade was made from 3.x to 4.6-4.8 then
// we'll re-run the transforms against post.mobiledoc and re-generate the html
// and plaintext contents

module.exports = createTransactionalMigration(
    async function up(knex) {
        const badVersionUsedFor40Migration = await knex('migrations')
            .where({
                name: '18-transform-urls-absolute-to-transform-ready.js'
            })
            .whereIn('currentVersion', ['4.6', '4.7', '4.8'])
            .first();

        if (!badVersionUsedFor40Migration) {
            logging.info('Skipping transform of mobiledoc URLs - original transform was good');
            return;
        }

        logging.info('Transforming all internal URLs in posts.{mobiledoc,html,plaintext} to transform-ready');

        await knex.transaction(async (trx) => {
            const postIdRows = await knex('posts')
                .transacting(trx)
                .forUpdate()
                .select('id');

            for (const postIdRow of postIdRows) {
                const {id} = postIdRow;
                const [post] = await knex('posts')
                    .transacting(trx)
                    .where({id})
                    .select([
                        'mobiledoc'
                    ]);

                let mobiledoc;
                let html;

                try {
                    mobiledoc = urlUtils.mobiledocToTransformReady(post.mobiledoc, {cardTransformers: mobiledocLib.cards});

                    if (!mobiledoc) {
                        logging.warn(`No mobiledoc for ${id}. Skipping.`);
                        continue;
                    }
                } catch (err) {
                    logging.warn(`Invalid mobiledoc JSON structure for ${id}. Skipping`);
                    continue;
                }

                try {
                    html = mobiledocLib.mobiledocHtmlRenderer.render(JSON.parse(mobiledoc));
                } catch (err) {
                    logging.warn(`Invalid mobiledoc content structure for ${id}, unable to render. Skipping`);
                    continue;
                }

                const plaintext = htmlToPlaintext(html);

                await knex('posts')
                    .transacting(trx)
                    .where({id})
                    .update({
                        mobiledoc,
                        html,
                        plaintext
                    });
            }

            return 'transaction complete';
        });
    },

    async function down() {
        // noop
    }
);
