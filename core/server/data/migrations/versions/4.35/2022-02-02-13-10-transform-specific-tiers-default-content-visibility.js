const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Checking default_content_visibility for specific tiers');

        const settings = await knex('settings')
            .select()
            .whereIn('key', ['default_content_visibility', 'default_content_visibility_tiers']);
        const contentVisibilitySetting = settings.find(d => d.key === 'default_content_visibility');
        const visibilityTiersSetting = settings.find(d => d.key === 'default_content_visibility_tiers');
        if (!contentVisibilitySetting) {
            logging.warn('No default_content_visibility setting found.');
            return;
        }

        if (!visibilityTiersSetting) {
            logging.warn('No default_content_visibility_tiers setting found.');
            return;
        }

        const contentVisibility = contentVisibilitySetting.value;

        if (['public', 'members', 'paid'].includes(contentVisibility)) {
            logging.info(`Ignoring default_content_visibility change as already set to ${contentVisibility}.`);
            return;
        }
        // Transform visibility to tiers when stored as nql string
        const isValidProductNqlFilter = /^(?:product:[\w-]+,?)+$/.test(contentVisibility);
        const now = knex.raw('CURRENT_TIMESTAMP');
        // Reset visibility value to paid if invalid string/filter
        if (!isValidProductNqlFilter) {
            logging.warn(`Found invalid default_content_visibility value - ${contentVisibility}, resetting to paid`);
            await knex('settings')
                .where({
                    key: 'default_content_visibility'
                })
                .update({
                    value: 'paid',
                    updated_at: now
                });

            logging.info(`Resetting default_content_visibility_tiers to []`);
            await knex('settings')
                .where({
                    key: 'default_content_visibility_tiers'
                })
                .update({
                    value: JSON.stringify([]),
                    updated_at: now
                });
            return;
        }

        // fetch product slugs from nql filter
        const productSlugs = contentVisibility.split(',').map((segment) => {
            return segment.replace('product:', '');
        });

        // get product ids for slugs
        const products = await knex('products')
            .select('id')
            .whereIn('slug', productSlugs);
        const productList = products.map((product) => {
            return product.id;
        });

        logging.info(`Updating default_content_visibility to tiers`);
        await knex('settings')
            .where({
                key: 'default_content_visibility'
            })
            .update({
                value: 'tiers',
                updated_at: now
            });

        logging.info(`Updating default_content_visibility_tiers to ${productList}`);
        await knex('settings')
            .where({
                key: 'default_content_visibility_tiers'
            })
            .update({
                value: JSON.stringify(productList),
                updated_at: now
            });
    },
    async function down(knex) {
        logging.info('Reverting default_content_visibility for specific tiers');

        const settings = await knex('settings')
            .select()
            .whereIn('key', ['default_content_visibility', 'default_content_visibility_tiers']);
        const contentVisibilitySetting = settings.find(d => d.key === 'default_content_visibility');
        const visibilityTiersSetting = settings.find(d => d.key === 'default_content_visibility_tiers');

        const visibilityValue = contentVisibilitySetting && contentVisibilitySetting.value;
        const visibilityTiersValue = visibilityTiersSetting && visibilityTiersSetting.value;

        if (visibilityValue !== 'tiers') {
            logging.info(`Ignoring default_content_visibility as is set to ${visibilityValue}.`);
            return;
        }

        if (!visibilityTiersValue) {
            logging.warn(`Ignoring, found empty default_content_visibility_tiers value`);
            return;
        }

        try {
            const parsedTiersValue = JSON.parse(visibilityTiersValue);
            const products = await knex('products')
                .select('slug')
                .whereIn('id', parsedTiersValue);
            const productSlugs = products.map((product) => {
                return `product:${product.slug}`;
            }).join(',');
            const now = knex.raw('CURRENT_TIMESTAMP');

            logging.info(`Setting default_content_visibility to ${productSlugs}`);
            await knex('settings')
                .where({
                    key: 'default_content_visibility'
                })
                .update({
                    value: productSlugs,
                    updated_at: now
                });

            logging.info(`Setting default_content_visibility_tiers to []`);
            await knex('settings')
                .where({
                    key: 'default_content_visibility_tiers'
                })
                .update({
                    value: JSON.stringify([]),
                    updated_at: now
                });
        } catch (e) {
            logging.warn(`Invalid default_content_visibility_tiers value - ${visibilityTiersValue}`);
            logging.warn(e);
            return;
        }
    }
);
