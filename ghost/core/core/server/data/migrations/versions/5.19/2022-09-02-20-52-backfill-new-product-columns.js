const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const rows = await knex('products as t') // eslint-disable-line no-restricted-syntax
            .select(
                't.id as id',
                'mp.amount as monthly_price',
                'yp.amount as yearly_price',
                knex.raw('coalesce(yp.currency, mp.currency) as currency')
            )
            .leftJoin('stripe_prices AS mp', 't.monthly_price_id', 'mp.id')
            .leftJoin('stripe_prices AS yp', 't.yearly_price_id', 'yp.id')
            .where('t.type', 'paid');

        if (!rows.length) {
            logging.info('Did not find any active paid Tiers');
            return;
        } else {
            logging.info(`Updating ${rows.length} Tiers with price and currency information`);
        }

        for (const row of rows) { // eslint-disable-line no-restricted-syntax
            await knex('products').update(row).where('id', row.id);
        }
    },
    async function down(knex) {
        logging.info('Removing currency and price information for all tiers');
        await knex('products').update({
            currency: null,
            monthly_price: null,
            yearly_price: null
        });
    }
);
