const logging = require('../../../../../shared/logging');

function isValidValue(value) {
    if (!value) {
        return false;
    }
    try {
        const parsed = JSON.parse(value);
        if (!parsed || !Array.isArray(parsed)) {
            return false;
        }

        const monthly = parsed.find(x => x.interval === 'month' && x.name !== 'Complimentary');
        const yearly = parsed.find(x => x.interval === 'year' && x.name !== 'Complimentary');
        if (!monthly || !yearly) {
            return false;
        }

        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        const stripePlans = await knex('settings')
            .select('value')
            .where({
                key: 'stripe_plans'
            })
            .first();

        if (!stripePlans) {
            logging.warn('No stripe_plans setting found');
            // If for some reason the setting is not found we defer to default handling in core.
            return;
        }

        if (isValidValue(stripePlans.value)) {
            logging.info(`The stripe_plans setting contained valid data - skipping migration.`);
            return;
        }

        logging.info(`The stripe_plans setting contained invalid data: ${stripePlans.value} - updating to use defaults`);
        await knex('settings')
            .update({
                value: JSON.stringify([{
                    name: 'Monthly',
                    currency: 'usd',
                    interval: 'month',
                    amount: 500
                }, {
                    name: 'Yearly',
                    currency: 'usd',
                    interval: 'year',
                    amount: 5000
                }])
            })
            .where({
                key: 'stripe_plans'
            });
    },

    // This migration fixes data, we don't want to undo it.
    async down() {}
};
