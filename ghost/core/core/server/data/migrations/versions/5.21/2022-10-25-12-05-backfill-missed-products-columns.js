const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info(`Fixing currency/monthly_price/yearly_price values for default paid tiers`);

        const currencyUpdated = await knex('products')
            .update('currency', 'usd')
            .where({
                currency: null,
                type: 'paid'
            });
        logging.info(`Updated ${currencyUpdated} tier(s) where currency=null, type=paid to currency=USD`);

        const monthlyPriceUpdated = await knex('products')
            .update('monthly_price', 500)
            .where({
                monthly_price: null,
                type: 'paid'
            });
        logging.info(`Updated ${monthlyPriceUpdated} tier(s) where monthly_price=null, type=paid to monthly_price=500`);

        const yearlyPriceUpdated = await knex('products')
            .update('yearly_price', 5000)
            .where({
                yearly_price: null,
                type: 'paid'
            });
        logging.info(`Updated ${yearlyPriceUpdated} tier(s) where yearly_price=null, type=paid to yearly_price=5000`);
    },
    async function down(/* knex */) {
        // no-op: we don't want to revert to bad data
    }
);
